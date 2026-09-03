import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { RecipeVersionEntity } from './recipe-version.entity';
import { StepMediaEntity } from './step-media.entity';
import { SubRecipeReferenceEntity } from './sub-recipe-reference.entity';

export type StepMode = 'TEXT' | 'SUB_RECIPE';

@Entity('recipe_steps')
@Unique(['recipeVersionId', 'position'])
export class RecipeStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_version_id', type: 'uuid' })
  recipeVersionId: string;

  @ManyToOne(() => RecipeVersionEntity, (v) => v.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_version_id' })
  version: RecipeVersionEntity;

  @Column({ type: 'int' })
  position: number;

  @Column({ length: 20, default: 'TEXT' })
  mode: StepMode;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title?: string | null;

  @Column({ type: 'text', nullable: true })
  instruction?: string | null;

  @Column({ type: 'text', nullable: true })
  tip?: string | null;

  @OneToMany(() => StepMediaEntity, (m) => m.step, { cascade: true })
  media?: StepMediaEntity[];

  @OneToOne(() => SubRecipeReferenceEntity, (r) => r.step, {
    cascade: true,
    nullable: true,
  })
  subRecipe?: SubRecipeReferenceEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
