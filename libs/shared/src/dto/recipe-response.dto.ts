export class MediaAssetDto {
  id: string;
  mediaType: 'IMAGE' | 'VIDEO';
  status: string;
  mimeType?: string;
  url?: string;
}

export class UnitDto {
  id: string;
  code: string;
  name: string;
  symbol: string;
  unitType: string;
  allowsDecimal: boolean;
}

export class IngredientCatalogDto {
  id: string;
  canonicalName: string;
  nameEn?: string;
  slug: string;
  status: string;
  imageAssetId?: string;
  imageUrl?: string;
}

export class RecipeIngredientViewDto {
  id: string;
  ingredientId?: string;
  customName?: string;
  name: string;
  imageUrl?: string;
  quantityMin?: number;
  quantityMax?: number;
  unit?: UnitDto;
  preparationNote?: string;
  isOptional: boolean;
  position: number;
}

export class IngredientGroupViewDto {
  id: string;
  name: string;
  position: number;
  ingredients: RecipeIngredientViewDto[];
}

export class StepMediaViewDto {
  id: string;
  mediaAssetId: string;
  url?: string;
  mediaType?: string;
  caption?: string;
  position: number;
}

export class SubRecipeCardDto {
  recipeId: string;
  versionId: string;
  title: string;
  summary?: string;
  coverUrl?: string;
  authorName?: string;
  cookTimeMinutes: number;
  difficulty: string;
  servingMultiplier: number;
}

export class RecipeStepViewDto {
  id: string;
  position: number;
  mode: 'TEXT' | 'SUB_RECIPE';
  title?: string;
  instruction?: string;
  tip?: string;
  media: StepMediaViewDto[];
  subRecipe?: SubRecipeCardDto;
}

export class RecipeVersionViewDto {
  id: string;
  versionNumber: number;
  status: string;
  title: string;
  summary: string;
  coverUrl?: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: string;
  ingredientGroups: IngredientGroupViewDto[];
  steps: RecipeStepViewDto[];
  publishedAt?: string;
}

/** Public list card */
export class RecipeListItemDto {
  id: string;
  slug: string;
  status: string;
  title: string;
  summary: string;
  coverUrl?: string;
  authorId: string;
  authorName?: string;
  cookTimeMinutes: number;
  difficulty: string;
  createdAt: string;
}

export class RecipeDetailDto {
  id: string;
  slug: string;
  status: string;
  authorId: string;
  authorName?: string;
  version: RecipeVersionViewDto;
  createdAt: string;
}

export class RecipeEditorDto {
  id: string;
  slug: string;
  status: string;
  authorId: string;
  draft: RecipeVersionViewDto;
}

/** @deprecated Phase 0 shape — kept for transitional FE build */
export class RecipeResponseDto {
  id: string;
  title: string;
  description: string;
  ingredients: Array<{ name: string; amount: string }>;
  steps: string[];
  cookTimeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  authorId: string;
  authorName?: string;
  createdAt: string;
}
