import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MediaAssetEntity } from '../media/media-asset.entity';

export type IngredientStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

@Entity('ingredients')
export class IngredientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'canonical_name', length: 150 })
  canonicalName: string;

  @Column({ length: 180, unique: true })
  slug: string;

  @Column({ name: 'name_en', type: 'varchar', length: 150, nullable: true })
  nameEn?: string | null;

  @Column({ name: 'image_asset_id', type: 'uuid', nullable: true })
  imageAssetId?: string | null;

  @ManyToOne(() => MediaAssetEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'image_asset_id' })
  imageAsset?: MediaAssetEntity | null;

  @Column({ length: 20, default: 'PENDING' })
  status: IngredientStatus;

  /** Quick-pick pantry staples (salt, sugar, fish sauce, …). */
  @Column({ name: 'is_staple', type: 'boolean', default: false })
  isStaple: boolean;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @Column({ name: 'approved_by_user_id', type: 'uuid', nullable: true })
  approvedByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
