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
  DEFAULT_LOCALE,
  isAppLocale,
  looksLikeMessageKey,
  t as sharedT,
  type AppLocale,
  type TranslateArgs,
} from '@app/shared/i18n/translate'

const STORAGE_KEY = 'homecook_locale'

type I18nContextValue = {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  t: (key: string, args?: TranslateArgs) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function readStoredLocale(): AppLocale {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && isAppLocale(raw)) return raw
  } catch {
    /* ignore */
  }
  const nav = navigator.language?.toLowerCase() ?? ''
  if (nav.startsWith('en')) return 'en'
  return DEFAULT_LOCALE
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale())

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const t = useCallback(
    (key: string, args?: TranslateArgs) => sharedT(locale, key, args),
    [locale],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

/** API đã dịch theo Accept-Language; nếu còn key thì map thêm bằng t(). */
export function useApiMessage() {
  const { t } = useI18n()
  return useCallback(
    (message: string | undefined, fallbackKey: string) => {
      if (!message) return t(fallbackKey)
      if (looksLikeMessageKey(message)) return t(message)
      return message
    },
    [t],
  )
}

/** Toast API errors; skips duplicate when session-expired already handled globally. */
export function useApiErrorToast() {
  const apiMessage = useApiMessage()
  return useCallback(
    (error: unknown, fallbackKey: string) => {
      const message = error instanceof Error ? error.message : undefined
      if (message === 'errors.sessionExpired') {
        toast.error(apiMessage(message, 'auth.sessionExpired'), {
          id: 'session-expired',
        })
        return
      }
      toast.error(apiMessage(message, fallbackKey))
    },
    [apiMessage],
  )
}
