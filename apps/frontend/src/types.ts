export type Difficulty = 'easy' | 'medium' | 'hard'
export type StepMode = 'TEXT' | 'SUB_RECIPE'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  bio?: string
  status: string
  roles: string[]
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: string
  tokenType: 'Bearer'
}

export interface RegisterPayload {
  email: string
  password: string
  displayName: string
  bio?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface Unit {
  id: string
  code: string
  name: string
  symbol: string
  unitType: string
  allowsDecimal: boolean
}

export interface CatalogIngredient {
  id: string
  canonicalName: string
  nameEn?: string
  slug: string
  status: string
  imageAssetId?: string
  imageUrl?: string
}

export interface MediaAssetRef {
  id: string
  mediaType: 'IMAGE' | 'VIDEO'
  status: string
  mimeType?: string
  url?: string
}

export interface RecipeIngredientView {
  id?: string
  ingredientId?: string
  customName?: string
  name: string
  imageUrl?: string
  quantityMin?: number
  quantityMax?: number
  unit?: Unit
  preparationNote?: string
  isOptional: boolean
  position: number
}

export interface IngredientGroupView {
  id?: string
  name: string
  position: number
  ingredients: RecipeIngredientView[]
}

export interface StepMediaView {
  id?: string
  mediaAssetId: string
  url?: string
  mediaType?: string
  caption?: string
  position: number
}

export interface SubRecipeCard {
  recipeId: string
  versionId: string
  title: string
  summary?: string
  coverUrl?: string
  authorName?: string
  cookTimeMinutes: number
  difficulty: string
  servingMultiplier: number
}

export interface RecipeStepView {
  id?: string
  position: number
  mode: StepMode
  title?: string
  instruction?: string
  tip?: string
  media: StepMediaView[]
  subRecipe?: SubRecipeCard
}

export interface RecipeVersionView {
  id: string
  versionNumber: number
  status: string
  title: string
  summary: string
  coverUrl?: string
  servings: number
  prepTimeMinutes: number
  cookTimeMinutes: number
  difficulty: Difficulty | string
  ingredientGroups: IngredientGroupView[]
  steps: RecipeStepView[]
  publishedAt?: string
}

export interface RecipeListItem {
  id: string
  slug: string
  status: string
  title: string
  summary: string
  coverUrl?: string
  authorId: string
  authorName?: string
  cookTimeMinutes: number
  difficulty: string
  createdAt: string
}

export interface RecipeDetail {
  id: string
  slug: string
  status: string
  authorId: string
  authorName?: string
  version: RecipeVersionView
  createdAt: string
}

export interface RecipeEditor {
  id: string
  slug: string
  status: string
  authorId: string
  draft: RecipeVersionView
}

export interface DraftIngredientLine {
  ingredientId?: string
  customName?: string
  quantityMin?: number
  quantityMax?: number
  unitId?: string
  preparationNote?: string
  isOptional?: boolean
}

export interface DraftIngredientGroup {
  name: string
  ingredients: DraftIngredientLine[]
}

export interface DraftStep {
  mode: StepMode
  title?: string
  instruction?: string
  tip?: string
  media?: Array<{ mediaAssetId: string; caption?: string }>
  childRecipeVersionId?: string
  servingMultiplier?: number
}

export interface UpdateDraftPayload {
  title?: string
  summary?: string
  coverAssetId?: string | null
  servings?: number
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  difficulty?: Difficulty
  ingredientGroups?: DraftIngredientGroup[]
  steps?: DraftStep[]
}

/** @deprecated */
export interface Recipe {
  id: string
  title: string
  description: string
  ingredients: Array<{ name: string; amount: string }>
  steps: string[]
  cookTimeMinutes: number
  difficulty: Difficulty
  authorId: string
  authorName?: string
  createdAt: string
}
