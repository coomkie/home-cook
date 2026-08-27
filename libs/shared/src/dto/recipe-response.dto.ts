import { IngredientDto } from './create-recipe.dto';

export class RecipeResponseDto {
  id: string;
  title: string;
  description: string;
  ingredients: IngredientDto[];
  steps: string[];
  cookTimeMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  authorId: string;
  /** Có khi recipe-service đã gọi sang user-service */
  authorName?: string;
  createdAt: string;
}
