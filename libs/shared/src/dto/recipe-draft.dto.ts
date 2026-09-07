import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class DraftIngredientLineDto {
  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @ValidateIf((o: DraftIngredientLineDto) => !o.ingredientId)
  @IsString()
  @MinLength(1)
  customName?: string;

  @IsOptional()
  @ValidateIf((_: DraftIngredientLineDto, v: unknown) => v !== null)
  @IsNumber()
  quantityMin?: number | null;

  @IsOptional()
  @ValidateIf((_: DraftIngredientLineDto, v: unknown) => v !== null)
  @IsNumber()
  quantityMax?: number | null;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  unitText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  preparationNote?: string;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;
}

export class DraftIngredientGroupDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftIngredientLineDto)
  ingredients: DraftIngredientLineDto[];
}

export class DraftStepMediaDto {
  @IsUUID()
  mediaAssetId: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  caption?: string;
}

export class DraftStepDto {
  @IsIn(['TEXT', 'SUB_RECIPE'])
  mode: 'TEXT' | 'SUB_RECIPE';

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  instruction?: string;

  @IsOptional()
  @IsString()
  tip?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftStepMediaDto)
  media?: DraftStepMediaDto[];

  @ValidateIf((o: DraftStepDto) => o.mode === 'SUB_RECIPE')
  @IsUUID()
  childRecipeVersionId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  servingMultiplier?: number;
}

export class CreateRecipeDraftDto {
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;
}

export class UpdateRecipeDraftDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsUUID()
  coverAssetId?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  servings?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prepTimeMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  cookTimeMinutes?: number;

  @IsOptional()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: 'easy' | 'medium' | 'hard';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DraftIngredientGroupDto)
  ingredientGroups?: DraftIngredientGroupDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DraftStepDto)
  steps?: DraftStepDto[];
}
