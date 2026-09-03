import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { ButtonLabel } from '../components/Spinner'
import { useApiMessage, useI18n } from '../i18n/I18nContext'

export function LoginPage() {
  const { user, login } = useAuth()
  const { t } = useI18n()
  const apiMessage = useApiMessage()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await login({ email: email.trim(), password })
      toast.success(t('auth.loginSuccess'))
      navigate('/')
    } catch (err) {
      toast.error(
        apiMessage(
          err instanceof Error ? err.message : undefined,
          'auth.loginFailed',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="auth-page">
      <h1>{t('auth.loginTitle')}</h1>
      <p className="lede">{t('auth.loginLede')}</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          {t('auth.email')}
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ban@cook.dev"
          />
        </label>
        <label>
          {t('auth.password')}
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <button className="btn primary" type="submit" disabled={saving}>
          <ButtonLabel loading={saving} loadingText={t('auth.loggingIn')}>
            {t('auth.submitLogin')}
          </ButtonLabel>
        </button>
      </form>
      <p className="muted">
        {t('auth.noAccount')} <Link to="/register">{t('auth.submitRegister')}</Link>
      </p>
    </section>
  )
}
