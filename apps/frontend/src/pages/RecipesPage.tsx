import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../api/client'
import { RecipeListSkeleton } from '../components/Skeleton'
import { useApiMessage, useI18n } from '../i18n/I18nContext'
import type { RecipeListItem } from '../types'

export function RecipesPage() {
  const { t } = useI18n()
  const apiMessage = useApiMessage()
  const [recipes, setRecipes] = useState<RecipeListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await api.getRecipes()
        if (alive) setRecipes(data)
      } catch (e) {
        const msg = apiMessage(
          e instanceof Error ? e.message : undefined,
          'recipes.loadFailed',
        )
        if (alive) {
          setError(msg)
          toast.error(msg)
        }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [apiMessage])

  if (loading) return <RecipeListSkeleton count={3} />

  if (error) {
    return (
      <div className="banner error">
        <strong>{t('recipes.apiDown')}</strong> {error}
        <p className="hint">{t('recipes.apiHint')}</p>
      </div>
    )
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{t('recipes.title')}</h1>
        </div>
        <Link className="btn primary block" to="/studio">
          {t('recipes.add')}
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state">
          <p>{t('recipes.empty')}</p>
          <Link className="btn primary" to="/studio">
            {t('recipes.createFirst')}
          </Link>
        </div>
      ) : (
        <ul className="recipe-grid">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link to={`/recipes/${r.id}`} className="recipe-card">
                {r.coverUrl && (
                  <img className="recipe-card__cover" src={r.coverUrl} alt="" />
                )}
                <div className="recipe-card__meta">
                  <span className={`pill difficulty-${r.difficulty}`}>
                    {t(`difficulty.${r.difficulty}`)}
                  </span>
                  <span>{t('common.minutes', { count: r.cookTimeMinutes })}</span>
                </div>
                <h2>{r.title}</h2>
                <p>{r.summary}</p>
                <footer>{r.authorName ?? t('common.anonymous')}</footer>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
