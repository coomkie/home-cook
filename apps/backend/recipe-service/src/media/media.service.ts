import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { appEnv } from '../app.env';
import { MediaAssetEntity } from './media-asset.entity';

const ALLOWED_MIME: Record<string, 'IMAGE' | 'VIDEO'> = {
  'image/jpeg': 'IMAGE',
  'image/jpg': 'IMAGE',
  'image/png': 'IMAGE',
  'image/webp': 'IMAGE',
  'image/gif': 'IMAGE',
  'video/mp4': 'VIDEO',
  'video/webm': 'VIDEO',
  'video/quicktime': 'VIDEO',
};

export type CompleteUploadInput = {
  publicId?: string;
  secureUrl?: string;
};

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private configured = false;

  constructor(
    @InjectRepository(MediaAssetEntity)
    private readonly mediaRepo: Repository<MediaAssetEntity>,
    @Inject(appEnv.KEY) private readonly env: ConfigType<typeof appEnv>,
  ) {}

  onModuleInit(): void {
    const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } =
      this.env;
    if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
      this.logger.warn(
        'Cloudinary env missing (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET) — uploads will fail',
      );
      return;
    }
    cloudinary.config({
      cloud_name: cloudinaryCloudName,
      api_key: cloudinaryApiKey,
      api_secret: cloudinaryApiSecret,
      secure: true,
    });
    this.configured = true;
    this.logger.log(
      `Cloudinary ready (cloud=${cloudinaryCloudName}, folder=${this.env.cloudinaryFolder})`,
    );
  }

  private assertConfigured() {
    if (!this.configured) {
      throw new BadRequestException('errors.mediaIncomplete');
    }
  }

  private resourceType(mediaType: 'IMAGE' | 'VIDEO'): 'image' | 'video' {
    return mediaType === 'VIDEO' ? 'video' : 'image';
  }

  /** True for pre-Cloudinary MinIO keys that cannot be served via res.cloudinary.com. */
  private isLegacyObjectKey(objectKey: string): boolean {
    if (objectKey.startsWith('uploads/')) return true;
    // Old object stores often baked the extension into the key.
    return /\.(jpe?g|png|gif|webp|mp4|webm|mov)$/i.test(objectKey);
  }

  /** Build or reuse a public delivery URL for a READY asset (no DB I/O). */
  deliveryUrlFor(asset: MediaAssetEntity): string | undefined {
    if (asset.status !== 'READY') return undefined;
    if (asset.deliveryUrl) return asset.deliveryUrl;
    if (!asset.objectKey || !this.configured) return undefined;
    if (this.isLegacyObjectKey(asset.objectKey)) {
      this.logger.warn(
        `Skipping delivery URL for legacy objectKey=${asset.objectKey}`,
      );
      return undefined;
    }
    return cloudinary.url(asset.objectKey, {
      secure: true,
      resource_type: this.resourceType(asset.mediaType),
      type: 'upload',
    });
  }

  async initiate(
    userId: string,
    input: { mimeType: string; filename?: string; byteSize?: number },
  ) {
    this.assertConfigured();
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
        deliveryUrl: null,
      }),
    );

    const folder = this.env.cloudinaryFolder.replace(/^\/+|\/+$/g, '');
    // Flat public_id leaf — nested UUID paths are a common Cloudinary footgun.
    const publicIdLeaf = `${userId}_${asset.id}`;
    const fullPublicId = `${folder}/${publicIdLeaf}`;
    asset.objectKey = fullPublicId;
    await this.mediaRepo.save(asset);

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign: Record<string, string | number> = {
      timestamp,
      folder,
      public_id: publicIdLeaf,
    };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      this.env.cloudinaryApiSecret,
    );

    const resource = this.resourceType(mediaType);
    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.env.cloudinaryCloudName}/${resource}/upload`;

    return {
      assetId: asset.id,
      uploadUrl,
      method: 'POST' as const,
      objectKey: fullPublicId,
      mediaType,
      fields: {
        api_key: this.env.cloudinaryApiKey,
        timestamp: String(timestamp),
        signature,
        folder,
        public_id: publicIdLeaf,
      },
    };
  }

  async complete(
    userId: string,
    assetId: string,
    input: CompleteUploadInput = {},
  ) {
    this.assertConfigured();
    const asset = await this.mediaRepo.findOne({ where: { id: assetId } });
    if (!asset || asset.ownerUserId !== userId) {
      throw new NotFoundException({
        message: 'errors.mediaNotFound',
        args: { id: assetId },
      });
    }
    if (!asset.objectKey && !input.publicId) {
      throw new BadRequestException('errors.mediaIncomplete');
    }

    const resource = this.resourceType(asset.mediaType);
    const candidates = [
      input.publicId,
      asset.objectKey,
    ].filter((v): v is string => !!v);

    let resolved: { public_id: string; secure_url: string } | null = null;
    for (const publicId of candidates) {
      try {
        const info = await cloudinary.api.resource(publicId, {
          resource_type: resource,
        });
        resolved = {
          public_id: info.public_id as string,
          secure_url: info.secure_url as string,
        };
        break;
      } catch {
        /* try next */
      }
    }

    if (!resolved && input.secureUrl && input.publicId) {
      // Upload response is authoritative when Admin API lags briefly.
      resolved = {
        public_id: input.publicId,
        secure_url: input.secureUrl,
      };
    }

    if (!resolved) {
      throw new BadRequestException('errors.mediaUploadMissing');
    }

    asset.objectKey = resolved.public_id;
    asset.deliveryUrl = resolved.secure_url || input.secureUrl || null;
    asset.status = 'READY';
    await this.mediaRepo.save(asset);
    return this.toDtoWithUrl(asset);
  }

  async getSignedGetUrl(
    assetId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    const asset = await this.mediaRepo.findOne({ where: { id: assetId } });
    if (!asset || asset.status !== 'READY') {
      throw new NotFoundException({
        message: 'errors.mediaNotFound',
        args: { id: assetId },
      });
    }
    const url = this.deliveryUrlFor(asset);
    if (!url) {
      throw new NotFoundException({
        message: 'errors.mediaNotFound',
        args: { id: assetId },
      });
    }
    return { url, expiresIn: 60 * 60 * 24 * 365 };
  }

  async requireReadyOwned(
    assetId: string,
    userId?: string,
  ): Promise<MediaAssetEntity> {
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

  /** Delete assets from Cloudinary + mark DB rows DELETED. */
  async destroyMany(assetIds: string[]): Promise<void> {
    const unique = [...new Set(assetIds.filter(Boolean))];
    if (!unique.length) return;

    for (const id of unique) {
      const asset = await this.mediaRepo.findOne({ where: { id } });
      if (!asset) continue;

      if (this.configured && asset.objectKey && !this.isLegacyObjectKey(asset.objectKey)) {
        try {
          await cloudinary.uploader.destroy(asset.objectKey, {
            resource_type: this.resourceType(asset.mediaType),
            invalidate: true,
          });
        } catch (e) {
          this.logger.warn(
            `Cloudinary destroy failed for ${asset.objectKey}: ${
              e instanceof Error ? e.message : e
            }`,
          );
        }
      }

      asset.status = 'DELETED';
      asset.objectKey = null;
      asset.deliveryUrl = null;
      await this.mediaRepo.save(asset);
    }
  }

  /** Dev helper — uploads a tiny PNG to Cloudinary when configured. */
  async seedPlaceholderImage(
    ownerUserId: string,
    slug: string,
  ): Promise<string> {
    const id = randomUUID();
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    let objectKey: string | null = null;
    let deliveryUrl: string | null = null;
    if (this.configured) {
      const folder = this.env.cloudinaryFolder.replace(/^\/+|\/+$/g, '');
      const publicIdLeaf = `seed/${slug}-${createHash('sha1').update(slug).digest('hex').slice(0, 8)}`;
      const uploaded: UploadApiResponse = await cloudinary.uploader.upload(
        `data:image/png;base64,${png.toString('base64')}`,
        {
          folder,
          public_id: publicIdLeaf,
          overwrite: true,
          resource_type: 'image',
        },
      );
      objectKey = uploaded.public_id;
      deliveryUrl = uploaded.secure_url ?? null;
    }

    const asset = await this.mediaRepo.save(
      this.mediaRepo.create({
        id,
        ownerUserId,
        mediaType: 'IMAGE',
        status: objectKey ? 'READY' : 'FAILED',
        objectKey,
        deliveryUrl,
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

  toDtoWithUrl(asset: MediaAssetEntity) {
    const base = this.toDto(asset);
    const url = this.deliveryUrlFor(asset);
    return url ? { ...base, url } : base;
  }
}
