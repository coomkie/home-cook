import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { RecipeEntity } from './recipe.entity';
import { IngredientGroupEntity } from './ingredient-group.entity';
import { RecipeStepEntity } from './recipe-step.entity';

export type VersionStatus = 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
export type Difficulty = 'easy' | 'medium' | 'hard';

@Entity('recipe_versions')
@Unique(['recipeId', 'versionNumber'])
export class RecipeVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id', type: 'uuid' })
  recipeId: string;

  @ManyToOne(() => RecipeEntity, (r) => r.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: RecipeEntity;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber: number;

  @Column({ length: 20, default: 'DRAFT' })
  status: VersionStatus;

  @Column({ length: 180 })
  title: string;

  @Column({ type: 'varchar', length: 500, default: '' })
  summary: string;

  @Column({ name: 'cover_asset_id', type: 'uuid', nullable: true })
  coverAssetId?: string | null;

  @ManyToOne(() => MediaAssetEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cover_asset_id' })
  coverAsset?: MediaAssetEntity | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 1 })
  servings: string;

  @Column({ name: 'prep_time_minutes', type: 'int', default: 0 })
  prepTimeMinutes: number;

  @Column({ name: 'cook_time_minutes', type: 'int', default: 0 })
  cookTimeMinutes: number;

  @Column({ length: 20, default: 'easy' })
  difficulty: Difficulty;

  @Column({ name: 'created_by_user_id', type: 'uuid' })
  createdByUserId: string;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  @OneToMany(() => IngredientGroupEntity, (g) => g.version, { cascade: true })
  ingredientGroups?: IngredientGroupEntity[];

  @OneToMany(() => RecipeStepEntity, (s) => s.version, { cascade: true })
  steps?: RecipeStepEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
