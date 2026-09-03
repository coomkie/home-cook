import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { appEnv } from '../app.env';
import { MediaAssetEntity } from './media-asset.entity';

const ALLOWED_MIME: Record<string, 'IMAGE' | 'VIDEO'> = {
  'image/jpeg': 'IMAGE',
  'image/png': 'IMAGE',
  'image/webp': 'IMAGE',
  'image/gif': 'IMAGE',
  'video/mp4': 'VIDEO',
  'video/webm': 'VIDEO',
};

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly s3: S3Client;
  private readonly publicS3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(MediaAssetEntity)
    private readonly mediaRepo: Repository<MediaAssetEntity>,
    @Inject(appEnv.KEY) private readonly env: ConfigType<typeof appEnv>,
  ) {
    this.bucket = env.minioBucket;
    const base = {
      region: 'us-east-1',
      credentials: {
        accessKeyId: env.minioAccessKey,
        secretAccessKey: env.minioSecretKey,
      },
      forcePathStyle: true,
    };
    this.s3 = new S3Client({
      ...base,
      endpoint: `${env.minioUseSsl ? 'https' : 'http'}://${env.minioEndpoint}:${env.minioPort}`,
    });
    this.publicS3 = new S3Client({
      ...base,
      endpoint: `${env.minioUseSsl ? 'https' : 'http'}://${env.minioPublicEndpoint}:${env.minioPublicPort}`,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch {
        /* bucket may already exist from race */
      }
    }
    try {
      await this.s3.send(
        new PutBucketCorsCommand({
          Bucket: this.bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
                AllowedOrigins: [
                  'http://localhost:5173',
                  'http://127.0.0.1:5173',
                ],
                ExposeHeaders: ['ETag'],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
    } catch {
      /* older minio / already set */
    }
  }

  async initiate(
    userId: string,
    input: { mimeType: string; filename?: string; byteSize?: number },
  ) {
    const mediaType = ALLOWED_MIME[input.mimeType];
    if (!mediaType) {
      throw new BadRequestException('errors.mediaTypeNotAllowed');
    }
    if (input.byteSize && input.byteSize > 50 * 1024 * 1024) {
      throw new BadRequestException('errors.mediaTooLarge');
    }

    const asset = await this.mediaRepo.save(
      this.mediaRepo.create({
        ownerUserId: userId,
        mediaType,
        status: 'PENDING',
        mimeType: input.mimeType,
        originalFilename: input.filename ?? null,
        byteSize: input.byteSize != null ? String(input.byteSize) : null,
        objectKey: null,
      }),
    );

    const ext = input.filename?.split('.').pop()?.toLowerCase() || 'bin';
    const objectKey = `uploads/${userId}/${asset.id}.${ext}`;
    asset.objectKey = objectKey;
    await this.mediaRepo.save(asset);

    const uploadUrl = await getSignedUrl(
      this.publicS3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: input.mimeType,
      }),
      { expiresIn: 60 * 15 },
    );

    return {
      assetId: asset.id,
      uploadUrl,
      objectKey,
      mediaType,
      headers: { 'Content-Type': input.mimeType },
    };
  }

  async complete(userId: string, assetId: string) {
    const asset = await this.mediaRepo.findOne({ where: { id: assetId } });
    if (!asset || asset.ownerUserId !== userId) {
      throw new NotFoundException({
        message: 'errors.mediaNotFound',
        args: { id: assetId },
      });
    }
    if (!asset.objectKey) {
      throw new BadRequestException('errors.mediaIncomplete');
    }

    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: asset.objectKey,
        }),
      );
    } catch {
      throw new BadRequestException('errors.mediaUploadMissing');
    }

    asset.status = 'READY';
    await this.mediaRepo.save(asset);
    return this.toDto(asset);
  }

  async getSignedGetUrl(assetId: string): Promise<{ url: string; expiresIn: number }> {
    const asset = await this.mediaRepo.findOne({ where: { id: assetId } });
    if (!asset || asset.status !== 'READY' || !asset.objectKey) {
      throw new NotFoundException({
        message: 'errors.mediaNotFound',
        args: { id: assetId },
      });
    }
    const expiresIn = 60 * 60;
    const url = await getSignedUrl(
      this.publicS3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: asset.objectKey,
      }),
      { expiresIn },
    );
    return { url, expiresIn };
  }

  async requireReadyOwned(assetId: string, userId?: string): Promise<MediaAssetEntity> {
    const asset = await this.mediaRepo.findOne({ where: { id: assetId } });
    if (!asset || asset.status !== 'READY') {
      throw new BadRequestException('errors.mediaNotReady');
    }
    if (userId && asset.ownerUserId !== userId) {
      throw new BadRequestException('errors.mediaNotOwned');
    }
    return asset;
  }

  async findReady(assetId: string): Promise<MediaAssetEntity | null> {
    return this.mediaRepo.findOne({
      where: { id: assetId, status: 'READY' },
    });
  }

  /** Dev helper: put a tiny placeholder PNG for seed ingredients. */
  async seedPlaceholderImage(ownerUserId: string, slug: string): Promise<string> {
    const id = randomUUID();
    const objectKey = `seed/${slug}.png`;
    // 1x1 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: png,
        ContentType: 'image/png',
      }),
    );
    const asset = await this.mediaRepo.save(
      this.mediaRepo.create({
        id,
        ownerUserId,
        mediaType: 'IMAGE',
        status: 'READY',
        objectKey,
        mimeType: 'image/png',
        byteSize: String(png.length),
        originalFilename: `${slug}.png`,
      }),
    );
    return asset.id;
  }

  toDto(asset: MediaAssetEntity) {
    return {
      id: asset.id,
      mediaType: asset.mediaType,
      status: asset.status,
      mimeType: asset.mimeType ?? undefined,
      originalFilename: asset.originalFilename ?? undefined,
    };
  }
}
