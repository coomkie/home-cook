import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useApiMessage, useI18n } from '../i18n/I18nContext'
import type { RecipeListItem } from '../types'

export function StudioPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const apiMessage = useApiMessage()
  const navigate = useNavigate()
  const [mine, setMine] = useState<RecipeListItem[]>([])
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let alive = true
    ;(async () => {
      try {
        const rows = await api.getMyRecipes()
        if (alive) setMine(rows)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      alive = false
    }
  }, [user])

  async function createNew() {
    setCreating(true)
    try {
      const editor = await api.createRecipe({
        title: t('studio.untitled'),
        summary: '',
      })
      navigate(`/studio/recipes/${editor.id}`)
    } catch (e) {
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'studio.createFailed'),
      )
    } finally {
      setCreating(false)
    }
  }

  async function deleteDraft(recipe: RecipeListItem) {
    if (recipe.status !== 'DRAFT') return
    if (!window.confirm(t('studio.deleteDraftConfirm'))) return

    setDeletingId(recipe.id)
    try {
      await api.deleteDraft(recipe.id)
      try {
        sessionStorage.removeItem(`studio-unlock:${recipe.id}`)
      } catch {
        /* ignore */
      }
      setMine((prev) => prev.filter((r) => r.id !== recipe.id))
      toast.success(t('studio.deleted'))
    } catch (e) {
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'studio.deleteFailed'),
      )
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section>
      <div className="page-head">
        <h1>{t('studio.title')}</h1>
        {user && (
          <button
            type="button"
            className="btn primary"
            disabled={creating}
            onClick={() => void createNew()}
          >
            {t('studio.newRecipe')}
          </button>
        )}
      </div>

      {!user ? (
        <div className="banner error">
          {t('studio.needLogin')} <Link to="/login">{t('nav.login')}</Link>
        </div>
      ) : (
        <>
          {(user.roles.includes('MODERATOR') || user.roles.includes('ADMIN')) && (
            <p>
              <Link to="/studio/moderation">{t('moderation.link')}</Link>
            </p>
          )}
          {mine.length === 0 ? (
            <div className="empty-state">
              <p>{t('studio.empty')}</p>
            </div>
          ) : (
            <ul className="recipe-grid">
              {mine.map((r) => (
                <li key={r.id} className="studio-card">
                  <Link to={`/studio/recipes/${r.id}`} className="recipe-card">
                    <div className="recipe-card__meta">
                      <span className="pill">{r.status}</span>
                      <span>{t('common.minutes', { count: r.cookTimeMinutes })}</span>
                    </div>
                    <h2>{r.title}</h2>
                    <p>{r.summary}</p>
                    <footer>
                      <span>
                        {r.status === 'PUBLISHED'
                          ? t('studio.editRecipe')
                          : t('studio.continueEdit')}
                      </span>
                    </footer>
                  </Link>
                  <div className="studio-card__actions">
                    {r.status === 'PUBLISHED' && (
                      <Link
                        to={`/recipes/${r.id}`}
                        className="btn ghost compact"
                      >
                        {t('studio.viewPublic')}
                      </Link>
                    )}
                    {r.status === 'DRAFT' && (
                      <button
                        type="button"
                        className="btn ghost compact studio-card__delete"
                        disabled={deletingId === r.id}
                        onClick={() => void deleteDraft(r)}
                      >
                        {deletingId === r.id
                          ? t('studio.deleting')
                          : t('studio.deleteDraft')}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
