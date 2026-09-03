import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RecipeVersionEntity } from './recipe-version.entity';

export type RecipeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

@Entity('recipes')
export class RecipeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ length: 200, unique: true })
  slug: string;

  @Column({ length: 20, default: 'DRAFT' })
  status: RecipeStatus;

  @Column({ name: 'current_published_version_id', type: 'uuid', nullable: true })
  currentPublishedVersionId?: string | null;

  @Column({ name: 'active_draft_version_id', type: 'uuid', nullable: true })
  activeDraftVersionId?: string | null;

  @ManyToOne(() => RecipeVersionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_published_version_id' })
  currentPublishedVersion?: RecipeVersionEntity | null;

  @ManyToOne(() => RecipeVersionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'active_draft_version_id' })
  activeDraftVersion?: RecipeVersionEntity | null;

  @OneToMany(() => RecipeVersionEntity, (v) => v.recipe)
  versions?: RecipeVersionEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
