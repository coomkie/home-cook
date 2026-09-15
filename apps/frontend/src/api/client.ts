import type {
  AuthTokens,
  AuthUser,
  CatalogIngredient,
  LoginPayload,
  MediaAssetRef,
  RecipeDetail,
  RecipeEditor,
  RecipeListItem,
  RegisterPayload,
  Unit,
  UpdateDraftPayload,
} from '../types'
import { resolveDevDelayMs, sleep } from './dev-delay'

const BASE = import.meta.env.VITE_API_BASE ?? '/api'
const ACCESS_KEY = 'homecook_access_token'
const REFRESH_KEY = 'homecook_refresh_token'
const LOCALE_KEY = 'homecook_locale'

/** Dispatched when refresh fails — AuthContext clears the logged-in UI. */
export const SESSION_EXPIRED_EVENT = 'homecook:session-expired'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
  sessionExpiredNotified = false
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

let refreshInFlight: Promise<boolean> | null = null
let sessionExpiredNotified = false

function notifySessionExpired() {
  if (sessionExpiredNotified) return
  sessionExpiredNotified = true
  clearTokens()
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
}

/** Single-flight refresh so parallel 401s share one /auth/refresh. */
async function tryRefreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refresh = getRefreshToken()
    if (!refresh) return false
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': acceptLanguage(),
        },
        body: JSON.stringify({ refreshToken: refresh }),
      })
      if (!res.ok) return false
      const tokens = (await res.json()) as AuthTokens
      if (!tokens?.accessToken || !tokens?.refreshToken) return false
      saveTokens(tokens)
      return true
    } catch {
      return false
    }
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

function acceptLanguage(): string {
  try {
    const stored = localStorage.getItem(LOCALE_KEY)
    if (stored === 'en' || stored === 'vi') return stored
  } catch {
    /* ignore */
  }
  return 'vi'
}

async function request<T>(
  path: string,
  init?: RequestInit,
  auth = false,
  retried = false,
): Promise<T> {
  const delayMs = resolveDevDelayMs(path)
  if (delayMs > 0) await sleep(delayMs)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': acceptLanguage(),
    ...(init?.headers as Record<string, string> | undefined),
  }

  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401 && auth && !retried) {
    const refreshed = await tryRefreshSession()
    if (refreshed) {
      return request<T>(path, init, auth, true)
    }
    notifySessionExpired()
    throw new ApiError('errors.sessionExpired', 401)
  }

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { message?: string | string[] }
      if (Array.isArray(body.message)) message = body.message.join(', ')
      else if (body.message) message = body.message
    } catch {
      /* ignore */
    }
    if (res.status === 401 && auth) {
      notifySessionExpired()
      throw new ApiError('errors.sessionExpired', 401)
    }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function uploadFile(file: File): Promise<MediaAssetRef> {
  const mimeType =
    file.type ||
    (/\.(jpe?g)$/i.test(file.name)
      ? 'image/jpeg'
      : /\.png$/i.test(file.name)
        ? 'image/png'
        : /\.webp$/i.test(file.name)
          ? 'image/webp'
          : /\.gif$/i.test(file.name)
            ? 'image/gif'
            : /\.webm$/i.test(file.name)
              ? 'video/webm'
              : /\.(mp4|m4v)$/i.test(file.name)
                ? 'video/mp4'
                : /\.mov$/i.test(file.name)
                  ? 'video/quicktime'
                  : 'application/octet-stream')

  const initiated = await request<{
    assetId: string
    uploadUrl: string
    method?: 'POST' | 'PUT'
    fields?: Record<string, string>
    headers?: Record<string, string>
  }>(
    '/media/uploads/initiate',
    {
      method: 'POST',
      body: JSON.stringify({
        mimeType,
        filename: file.name,
        byteSize: file.size,
      }),
    },
    true,
  )

  let publicId: string | undefined
  let secureUrl: string | undefined

  if (initiated.method === 'POST' && initiated.fields) {
    const form = new FormData()
    form.append('file', file)
    for (const [key, value] of Object.entries(initiated.fields)) {
      form.append(key, value)
    }
    const uploaded = await fetch(initiated.uploadUrl, {
      method: 'POST',
      body: form,
    })
    if (!uploaded.ok) {
      const detail = await uploaded.text().catch(() => '')
      throw new Error(
        detail
          ? `Upload failed HTTP ${uploaded.status}: ${detail.slice(0, 200)}`
          : `Upload failed HTTP ${uploaded.status}`,
      )
    }
    try {
      const cloud = (await uploaded.json()) as {
        public_id?: string
        secure_url?: string
      }
      publicId = cloud.public_id
      secureUrl = cloud.secure_url
    } catch {
      /* response may be empty in some edge cases */
    }
  } else {
    const put = await fetch(initiated.uploadUrl, {
      method: 'PUT',
      headers: initiated.headers,
      body: file,
    })
    if (!put.ok) throw new Error(`Upload failed HTTP ${put.status}`)
  }

  return request<MediaAssetRef>(
    `/media/uploads/${initiated.assetId}/complete`,
    {
      method: 'POST',
      body: JSON.stringify({
        ...(publicId ? { publicId } : {}),
        ...(secureUrl ? { secureUrl } : {}),
      }),
    },
    true,
  )
}

export const api = {
  register: (payload: RegisterPayload) =>
    request<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginPayload) =>
    request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: (refreshToken: string) =>
    request<{ ok: true }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  refresh: (refreshToken: string) =>
    request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  getMe: () => request<AuthUser>('/users/me', undefined, true),
  updateMe: (payload: { displayName?: string; bio?: string }) =>
    request<AuthUser>(
      '/users/me',
      { method: 'PATCH', body: JSON.stringify(payload) },
      true,
    ),

  getUnits: () => request<Unit[]>('/units'),
  getStapleIngredients: () =>
    request<CatalogIngredient[]>('/ingredients/staples'),
  searchIngredients: (q?: string) => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : ''
    return request<CatalogIngredient[]>(`/ingredients${qs}`)
  },
  proposeIngredient: (payload: {
    name: string
    nameEn?: string
    imageAssetId?: string
  }) =>
    request<CatalogIngredient>('/ingredients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true),
  createCatalogIngredient: (payload: {
    name: string
    nameEn?: string
    imageAssetId?: string
    isStaple?: boolean
  }) =>
    request<CatalogIngredient>('/ingredients/catalog', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true),
  listPendingIngredients: () =>
    request<CatalogIngredient[]>('/ingredients/moderation', undefined, true),
  approveIngredient: (id: string) =>
    request<CatalogIngredient>(`/ingredients/${id}/approve`, { method: 'POST' }, true),
  rejectIngredient: (id: string) =>
    request<CatalogIngredient>(`/ingredients/${id}/reject`, { method: 'POST' }, true),

  getRecipes: (q?: string) => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : ''
    return request<RecipeListItem[]>(`/recipes${qs}`)
  },
  getMyRecipes: () => request<RecipeListItem[]>('/recipes/mine', undefined, true),
  getRecipe: (id: string) => request<RecipeDetail>(`/recipes/${id}`),
  getRecipePreview: (id: string) => request<RecipeDetail>(`/recipes/${id}/preview`),
  createRecipe: (payload: { title: string; summary?: string }) =>
    request<RecipeEditor>('/recipes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, true),
  getEditor: (id: string) =>
    request<RecipeEditor>(`/recipes/${id}/editor`, undefined, true),
  updateDraft: (id: string, payload: UpdateDraftPayload) =>
    request<RecipeEditor>(`/recipes/${id}/draft`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, true),
  publishRecipe: (id: string) =>
    request<RecipeDetail>(`/recipes/${id}/publish`, { method: 'POST' }, true),
  deleteDraft: (id: string) =>
    request<void>(`/recipes/${id}`, { method: 'DELETE' }, true),
}
