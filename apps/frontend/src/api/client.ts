import type {
  CreateRecipePayload,
  CreateUserPayload,
  Recipe,
  User,
} from '../types'

const BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { message?: string | string[] }
      if (Array.isArray(body.message)) message = body.message.join(', ')
      else if (body.message) message = body.message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export const api = {
  getUsers: () => request<User[]>('/users'),
  createUser: (payload: CreateUserPayload) =>
    request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getRecipes: (authorId?: string) => {
    const q = authorId ? `?authorId=${encodeURIComponent(authorId)}` : ''
    return request<Recipe[]>(`/recipes${q}`)
  },
  getRecipe: (id: string) => request<Recipe>(`/recipes/${id}`),
  createRecipe: (payload: CreateRecipePayload) =>
    request<Recipe>('/recipes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
