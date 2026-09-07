import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IngredientEntity } from '../ingredients/ingredient.entity';
import { UnitEntity } from '../ingredients/unit.entity';
import { IngredientGroupEntity } from './ingredient-group.entity';

@Entity('recipe_ingredients')
@Check(
  `("ingredient_id" IS NOT NULL AND "custom_name" IS NULL) OR ("ingredient_id" IS NULL AND "custom_name" IS NOT NULL)`,
)
export class RecipeIngredientEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ingredient_group_id', type: 'uuid' })
  ingredientGroupId: string;

  @ManyToOne(() => IngredientGroupEntity, (g) => g.ingredients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ingredient_group_id' })
  group: IngredientGroupEntity;

  @Column({ name: 'ingredient_id', type: 'uuid', nullable: true })
  ingredientId?: string | null;

  @ManyToOne(() => IngredientEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ingredient_id' })
  ingredient?: IngredientEntity | null;

  @Column({ name: 'custom_name', type: 'varchar', length: 150, nullable: true })
  customName?: string | null;

  @Column({
    name: 'quantity_min',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  quantityMin?: string | null;

  @Column({
    name: 'quantity_max',
    type: 'numeric',
    precision: 12,
    scale: 4,
    nullable: true,
  })
  quantityMax?: string | null;

  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId?: string | null;

  @ManyToOne(() => UnitEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'unit_id' })
  unit?: UnitEntity | null;

  /** Free-text unit label (e.g. "muỗng canh", "củ", "g"). Preferred over unitId. */
  @Column({ name: 'unit_text', type: 'varchar', length: 80, nullable: true })
  unitText?: string | null;

  @Column({
    name: 'preparation_note',
    type: 'varchar',
    length: 250,
    nullable: true,
  })
  preparationNote?: string | null;

  @Column({ name: 'is_optional', type: 'boolean', default: false })
  isOptional: boolean;

  @Column({ type: 'int' })
  position: number;
}
