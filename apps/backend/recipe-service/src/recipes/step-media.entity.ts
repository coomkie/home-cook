import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { MediaAssetEntity } from '../media/media-asset.entity';
import { RecipeStepEntity } from './recipe-step.entity';

@Entity('step_media')
@Unique(['recipeStepId', 'position'])
export class StepMediaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_step_id', type: 'uuid' })
  recipeStepId: string;

  @ManyToOne(() => RecipeStepEntity, (s) => s.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_step_id' })
  step: RecipeStepEntity;

  @Column({ name: 'media_asset_id', type: 'uuid' })
  mediaAssetId: string;

  @ManyToOne(() => MediaAssetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_asset_id' })
  mediaAsset: MediaAssetEntity;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 250, nullable: true })
  caption?: string | null;
}
