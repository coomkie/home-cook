import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { ButtonLabel } from '../components/Spinner'
import { useApiMessage, useI18n } from '../i18n/I18nContext'

export function RegisterPage() {
  const { user, register } = useAuth()
  const { t } = useI18n()
  const apiMessage = useApiMessage()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        bio: bio.trim() || undefined,
      })
      toast.success(t('auth.registerSuccess'))
      navigate('/')
    } catch (err) {
      toast.error(
        apiMessage(
          err instanceof Error ? err.message : undefined,
          'auth.registerFailed',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="auth-page">
      <h1>{t('auth.registerTitle')}</h1>
      <p className="lede">{t('auth.registerLede')}</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          {t('auth.displayName')}
          <input
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
            placeholder="Lan Nguyen"
          />
        </label>
        <label>
          {t('auth.email')}
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="lan@cook.dev"
          />
        </label>
        <label>
          {t('auth.passwordHint')}
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label>
          {t('auth.bio')}
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="…"
          />
        </label>
        <button className="btn primary" type="submit" disabled={saving}>
          <ButtonLabel loading={saving} loadingText={t('auth.creating')}>
            {t('auth.submitRegister')}
          </ButtonLabel>
        </button>
      </form>
      <p className="muted">
        {t('auth.hasAccount')} <Link to="/login">{t('auth.submitLogin')}</Link>
      </p>
    </section>
  )
}
