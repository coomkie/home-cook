import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import {
  api,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
  SESSION_EXPIRED_EVENT,
} from '../api/client'
import { useI18n } from '../i18n/I18nContext'
import type { AuthUser, LoginPayload, RegisterPayload } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!getAccessToken() && !getRefreshToken()) {
      setUser(null)
      return
    }
    try {
      if (!getAccessToken() && getRefreshToken()) {
        const tokens = await api.refresh(getRefreshToken()!)
        saveTokens(tokens)
      }
      const me = await api.getMe()
      setUser(me)
    } catch {
      const refresh = getRefreshToken()
      if (!refresh) {
        clearTokens()
        setUser(null)
        return
      }
      try {
        const tokens = await api.refresh(refresh)
        saveTokens(tokens)
        const me = await api.getMe()
        setUser(me)
      } catch {
        clearTokens()
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await refreshProfile()
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [refreshProfile])

  useEffect(() => {
    const onExpired = () => {
      setUser(null)
      toast.error(t('auth.sessionExpired'), { id: 'session-expired' })
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [t])

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await api.login(payload)
    saveTokens(tokens)
    const me = await api.getMe()
    setUser(me)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const tokens = await api.register(payload)
    saveTokens(tokens)
    const me = await api.getMe()
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    const refresh = getRefreshToken()
    try {
      if (refresh) await api.logout(refresh)
    } catch {
      /* ignore */
    }
    clearTokens()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshProfile }),
    [user, loading, login, register, logout, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
