import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'
import { ProfileSkeleton } from '../components/Skeleton'
import { ButtonLabel, Spinner } from '../components/Spinner'
import { useApiErrorToast, useI18n } from '../i18n/I18nContext'

export function ProfilePage() {
  const { user, loading, refreshProfile, logout } = useAuth()
  const { t } = useI18n()
  const toastApiError = useApiErrorToast()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName)
    setBio(user.bio ?? '')
  }, [user])

  if (!loading && !user) return <Navigate to="/login" replace />
  if (loading || !user) return <ProfileSkeleton />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateMe({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
      })
      await refreshProfile()
      toast.success(t('profile.updateSuccess'))
    } catch (err) {
      toastApiError(err, 'profile.updateFailed')
    } finally {
      setSaving(false)
    }
  }

  async function onLogout() {
    setLoggingOut(true)
    try {
      await logout()
      toast.success(t('auth.logoutSuccess'))
      navigate('/', { replace: true })
    } catch {
      toast.error(t('auth.logoutFailed'))
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <section>
      <h1>{t('profile.title')}</h1>
      <p className="lede">
        {user.email} · {t('common.roles')}: {user.roles.join(', ') || 'USER'}
      </p>
      <form className="form form--wide" onSubmit={onSubmit}>
        <label>1
          {t('auth.displayName')}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
          />
        </label>
        <label>
          {t('auth.bio')}
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />
        </label>
        <button className="btn primary block" type="submit" disabled={saving}>
          <ButtonLabel loading={saving} loadingText={t('profile.saving')}>
            {t('profile.save')}
          </ButtonLabel>
        </button>
      </form>

      <button
        type="button"
        className="btn ghost block profile-logout"
        onClick={() => void onLogout()}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <span className="btn-label">
            <Spinner size="sm" />
            <span>{t('nav.logout')}</span>
          </span>
        ) : (
          t('nav.logout')
        )}
      </button>

      <p className="muted">
        <Link to="/">{t('common.backHome')}</Link>
      </p>
    </section>
  )
}
