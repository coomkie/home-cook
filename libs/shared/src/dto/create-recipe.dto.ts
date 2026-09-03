import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IngredientDto {
  @IsString({ message: 'validation.string' })
  @MinLength(1, { message: 'validation.ingredientsMin' })
  name: string;

  @IsString({ message: 'validation.string' })
  @MinLength(1, { message: 'validation.ingredientsMin' })
  amount: string;
}

export class CreateRecipeDto {
  @IsString({ message: 'validation.string' })
  @MinLength(3, { message: 'validation.titleMin' })
  title: string;

  @IsString({ message: 'validation.string' })
  @MinLength(10, { message: 'validation.descriptionMin' })
  description: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'validation.ingredientsMin' })
  @ValidateNested({ each: true })
  @Type(() => IngredientDto)
  ingredients: IngredientDto[];

  @IsArray()
  @ArrayMinSize(1, { message: 'validation.stepsMin' })
  @IsString({ each: true, message: 'validation.string' })
  steps: string[];

  @IsInt()
  @Min(1, { message: 'validation.cookTimeMin' })
  cookTimeMinutes: number;

  @IsIn(['easy', 'medium', 'hard'], { message: 'validation.difficulty' })
  difficulty: 'easy' | 'medium' | 'hard';

  @IsUUID('4', { message: 'validation.authorIdUuid' })
  authorId: string;
}
