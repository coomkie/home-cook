import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useApiMessage, useI18n } from '../i18n/I18nContext'
import type { CatalogIngredient } from '../types'

export function ModerationPage() {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  const apiMessage = useApiMessage()
  const [items, setItems] = useState<CatalogIngredient[]>([])

  const canMod =
    !!user &&
    (user.roles.includes('MODERATOR') || user.roles.includes('ADMIN'))

  async function reload() {
    const rows = await api.listPendingIngredients()
    setItems(rows)
  }

  useEffect(() => {
    if (!canMod) return
    void reload().catch((e) =>
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'errors.generic'),
      ),
    )
  }, [canMod, apiMessage])

  if (!loading && !user) return <Navigate to="/login" replace />
  if (!loading && user && !canMod) return <Navigate to="/studio" replace />

  async function approve(id: string) {
    try {
      await api.approveIngredient(id)
      toast.success(t('moderation.approved'))
      await reload()
    } catch (e) {
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'errors.generic'),
      )
    }
  }

  async function reject(id: string) {
    try {
      await api.rejectIngredient(id)
      toast.success(t('moderation.rejected'))
      await reload()
    } catch (e) {
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'errors.generic'),
      )
    }
  }

  return (
    <section>
      <Link to="/studio" className="back">
        {t('studio.backStudio')}
      </Link>
      <h1>{t('moderation.title')}</h1>
      {items.length === 0 ? (
        <p className="muted">{t('moderation.empty')}</p>
      ) : (
        <ul className="ing-search-list">
          {items.map((ing) => (
            <li key={ing.id} className="mod-row">
              {ing.imageUrl ? <img src={ing.imageUrl} alt="" /> : <span className="ing-fallback" />}
              <div>
                <strong>{ing.canonicalName}</strong>
                {ing.nameEn && <p className="muted">{ing.nameEn}</p>}
              </div>
              <button type="button" className="btn primary compact" onClick={() => void approve(ing.id)}>
                {t('moderation.approve')}
              </button>
              <button type="button" className="btn ghost compact" onClick={() => void reject(ing.id)}>
                {t('moderation.reject')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
