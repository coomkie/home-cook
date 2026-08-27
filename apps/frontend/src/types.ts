export type Difficulty = 'easy' | 'medium' | 'hard'

export interface User {
  id: string
  name: string
  email: string
  bio?: string
  createdAt: string
}

export interface Ingredient {
  name: string
  amount: string
}

export interface Recipe {
  id: string
  title: string
  description: string
  ingredients: Ingredient[]
  steps: string[]
  cookTimeMinutes: number
  difficulty: Difficulty
  authorId: string
  authorName?: string
  createdAt: string
}

export interface CreateUserPayload {
  name: string
  email: string
  bio?: string
}

export interface CreateRecipePayload {
  title: string
  description: string
  ingredients: Ingredient[]
  steps: string[]
  cookTimeMinutes: number
  difficulty: Difficulty
  authorId: string
}
