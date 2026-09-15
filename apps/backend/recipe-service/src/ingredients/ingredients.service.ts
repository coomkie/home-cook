import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { MediaService } from '../media/media.service';
import { IngredientEntity } from './ingredient.entity';
import { UnitEntity } from './unit.entity';

function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160);
}

@Injectable()
export class IngredientsService {
  constructor(
    @InjectRepository(IngredientEntity)
    private readonly ingredientsRepo: Repository<IngredientEntity>,
    @InjectRepository(UnitEntity)
    private readonly unitsRepo: Repository<UnitEntity>,
    private readonly media: MediaService,
  ) {}

  listUnits() {
    return this.unitsRepo.find({ order: { code: 'ASC' } });
  }

  async search(q?: string, status: 'APPROVED' | 'PENDING' = 'APPROVED') {
    const needle = q?.trim();
    // Catalog is large — require a query; don't dump the whole warehouse.
    if (!needle) {
      return [];
    }

    const rows = await this.ingredientsRepo.find({
      where: [
        { status, canonicalName: ILike(`%${needle}%`) },
        { status, nameEn: ILike(`%${needle}%`) },
      ],
      order: { canonicalName: 'ASC' },
      take: 20,
      relations: ['imageAsset'],
    });

    return Promise.all(rows.map((r) => this.toDto(r)));
  }

  async listStaples() {
    const rows = await this.ingredientsRepo.find({
      where: { status: 'APPROVED', isStaple: true },
      order: { canonicalName: 'ASC' },
      relations: ['imageAsset'],
    });
    return Promise.all(rows.map((r) => this.toDto(r)));
  }

  async propose(
    userId: string,
    input: { name: string; nameEn?: string; imageAssetId?: string },
  ) {
    const name = input.name.trim();
    if (name.length < 2) throw new BadRequestException('validation.displayNameMin');

    let slug = slugify(name);
    const exists = await this.ingredientsRepo.exist({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;

    if (input.imageAssetId) {
      await this.media.requireReadyOwned(input.imageAssetId, userId);
    }

    const saved = await this.ingredientsRepo.save(
      this.ingredientsRepo.create({
        canonicalName: name,
        nameEn: input.nameEn?.trim() || null,
        slug,
        imageAssetId: input.imageAssetId ?? null,
        status: 'PENDING',
        createdByUserId: userId,
      }),
    );
    return this.toDto(saved);
  }

  async createCatalog(
    userId: string,
    input: {
      name: string;
      nameEn?: string;
      imageAssetId?: string;
      isStaple?: boolean;
    },
  ) {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new BadRequestException('validation.displayNameMin');
    }

    let slug = slugify(name);
    if (!slug) slug = `ing-${Date.now().toString(36)}`;
    const exists = await this.ingredientsRepo.exist({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now().toString(36)}`;

    if (input.imageAssetId) {
      await this.media.requireReadyOwned(input.imageAssetId, userId);
    }

    const saved = await this.ingredientsRepo.save(
      this.ingredientsRepo.create({
        canonicalName: name,
        nameEn: input.nameEn?.trim() || null,
        slug,
        imageAssetId: input.imageAssetId ?? null,
        status: 'APPROVED',
        isStaple: !!input.isStaple,
        createdByUserId: userId,
        approvedByUserId: userId,
      }),
    );
    return this.toDto(saved);
  }

  async listPending() {
    const rows = await this.ingredientsRepo.find({
      where: { status: 'PENDING' },
      order: { createdAt: 'ASC' },
      relations: ['imageAsset'],
    });
    return Promise.all(rows.map((r) => this.toDto(r)));
  }

  async approve(id: string, moderatorId: string) {
    const row = await this.ingredientsRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException({
        message: 'errors.ingredientNotFound',
        args: { id },
      });
    }
    row.status = 'APPROVED';
    row.approvedByUserId = moderatorId;
    await this.ingredientsRepo.save(row);
    return this.toDto(row);
  }

  async reject(id: string, moderatorId: string) {
    const row = await this.ingredientsRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException({
        message: 'errors.ingredientNotFound',
        args: { id },
      });
    }
    row.status = 'REJECTED';
    row.approvedByUserId = moderatorId;
    await this.ingredientsRepo.save(row);
    return this.toDto(row);
  }

  async toDto(row: IngredientEntity) {
    let imageUrl: string | undefined;
    if (row.imageAssetId) {
      try {
        const signed = await this.media.getSignedGetUrl(row.imageAssetId);
        imageUrl = signed.url;
      } catch {
        imageUrl = undefined;
      }
    }
    return {
      id: row.id,
      canonicalName: row.canonicalName,
      nameEn: row.nameEn ?? undefined,
      slug: row.slug,
      status: row.status,
      isStaple: row.isStaple,
      imageAssetId: row.imageAssetId ?? undefined,
      imageUrl,
      createdByUserId: row.createdByUserId ?? undefined,
    };
  }
}
