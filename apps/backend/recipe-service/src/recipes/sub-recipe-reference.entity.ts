import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RecipeStepEntity } from './recipe-step.entity';
import { RecipeVersionEntity } from './recipe-version.entity';

@Entity('sub_recipe_references')
export class SubRecipeReferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'step_id', type: 'uuid', unique: true })
  stepId: string;

  @OneToOne(() => RecipeStepEntity, (s) => s.subRecipe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'step_id' })
  step: RecipeStepEntity;

  @Column({ name: 'child_recipe_version_id', type: 'uuid' })
  childRecipeVersionId: string;

  @ManyToOne(() => RecipeVersionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'child_recipe_version_id' })
  childVersion: RecipeVersionEntity;

  @Column({
    name: 'serving_multiplier',
    type: 'numeric',
    precision: 8,
    scale: 2,
    default: 1,
  })
  servingMultiplier: string;
}
