import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type MediaType = 'IMAGE' | 'VIDEO';
export type MediaStatus =
  | 'PENDING'
  | 'READY'
  | 'FAILED'
  | 'QUARANTINED'
  | 'DELETED';

@Entity('media_assets')
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId: string;

  @Column({ name: 'media_type', length: 20 })
  mediaType: MediaType;

  @Column({ length: 20, default: 'PENDING' })
  status: MediaStatus;

  @Column({ name: 'object_key', type: 'varchar', length: 500, nullable: true })
  objectKey?: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 120, nullable: true })
  mimeType?: string | null;

  @Column({ name: 'byte_size', type: 'bigint', nullable: true })
  byteSize?: string | null;

  @Column({ name: 'original_filename', type: 'varchar', length: 255, nullable: true })
  originalFilename?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
