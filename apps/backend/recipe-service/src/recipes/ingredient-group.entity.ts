import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { RecipeVersionEntity } from './recipe-version.entity';
import { RecipeIngredientEntity } from './recipe-ingredient.entity';

@Entity('ingredient_groups')
@Unique(['recipeVersionId', 'position'])
export class IngredientGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_version_id', type: 'uuid' })
  recipeVersionId: string;

  @ManyToOne(() => RecipeVersionEntity, (v) => v.ingredientGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipe_version_id' })
  version: RecipeVersionEntity;

  @Column({ length: 120, default: 'Default' })
  name: string;

  @Column({ type: 'int' })
  position: number;

  @OneToMany(() => RecipeIngredientEntity, (i) => i.group, { cascade: true })
  ingredients?: RecipeIngredientEntity[];
}
