export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  cookTimeMinutes: number;
  difficulty: Difficulty;
  authorId: string;
  createdAt: string;
}
