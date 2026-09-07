import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { RecipeDetailSkeleton } from '../components/Skeleton'
import { SubRecipeSheet } from '../components/SubRecipeSheet'
import { useApiMessage, useI18n } from '../i18n/I18nContext'
import { formatIngredientAmount } from '../lib/ingredient-amount'
import type { RecipeDetail } from '../types'

export function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t } = useI18n()
  const apiMessage = useApiMessage()
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    ;(async () => {
      try {
        const data = await api.getRecipe(id)
        if (alive) setRecipe(data)
      } catch (e) {
        const msg = apiMessage(
          e instanceof Error ? e.message : undefined,
          'recipeDetail.loadFailed',
        )
        if (alive) {
          setError(msg)
          toast.error(msg)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [id, apiMessage])

  if (error) return <div className="banner error">{error}</div>
  if (!recipe) return <RecipeDetailSkeleton />

  const v = recipe.version
  const isOwner = !!user && user.id === recipe.authorId

  return (
    <article className="detail">
      <div className="detail__nav">
        <Link to="/" className="back">
          {t('common.backRecipes')}
        </Link>
        {isOwner && (
          <Link to={`/studio/recipes/${recipe.id}`} className="btn ghost compact">
            {t('studio.editRecipe')}
          </Link>
        )}
      </div>
      <div className="detail__hero">
        {v.coverUrl && (
          <img className="detail__cover" src={v.coverUrl} alt="" />
        )}
        <span className={`pill difficulty-${v.difficulty}`}>
          {t(`difficulty.${v.difficulty}`)}
        </span>
        <h1>{v.title}</h1>
        <p className="lede">{v.summary}</p>
        <p className="detail__meta">
          {recipe.authorName ?? t('common.anonymous')} ·{' '}
          {t('common.minutes', { count: v.cookTimeMinutes })}
        </p>
      </div>

      <h2>{t('recipeDetail.ingredients')}</h2>
      {v.ingredientGroups.map((g) => (
        <div key={g.position}>
          {v.ingredientGroups.length > 1 && <h3>{g.name}</h3>}
          <ul className="ingredients">
            {g.ingredients.map((ing) => (
              <li key={`${g.position}-${ing.position}-${ing.name}`}>
                <span>
                  {ing.imageUrl && (
                    <img className="ing-thumb" src={ing.imageUrl} alt="" />
                  )}{' '}
                  {ing.name}
                  {ing.preparationNote ? ` (${ing.preparationNote})` : ''}
                </span>
                <span>{formatIngredientAmount(ing)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h2>{t('recipeDetail.steps')}</h2>
      <ol className="steps">
        {v.steps.map((step) => (
          <li key={step.position}>
            {step.mode === 'SUB_RECIPE' && step.subRecipe ? (
              <button
                type="button"
                className="sub-recipe-card"
                onClick={() => setPreviewId(step.subRecipe!.recipeId)}
              >
                {step.subRecipe.coverUrl && (
                  <img src={step.subRecipe.coverUrl} alt="" />
                )}
                <span>
                  <strong>{step.title || step.subRecipe.title}</strong>
                  <br />
                  <small className="muted">
                    {step.subRecipe.authorName} ·{' '}
                    {t('common.minutes', {
                      count: step.subRecipe.cookTimeMinutes,
                    })}
                  </small>
                </span>
              </button>
            ) : (
              <>
                {step.title && <strong>{step.title}</strong>}
                <p>{step.instruction}</p>
                {step.tip && (
                  <p className="muted">
                    {t('studio.tip')}: {step.tip}
                  </p>
                )}
                <div className="step-media">
                  {step.media.map((m) =>
                    m.mediaType === 'VIDEO' && m.url ? (
                      <video key={m.mediaAssetId} src={m.url} controls />
                    ) : m.url ? (
                      <img key={m.mediaAssetId} src={m.url} alt={m.caption ?? ''} />
                    ) : null,
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ol>

      {previewId && (
        <SubRecipeSheet
          recipeId={previewId}
          onClose={() => setPreviewId(null)}
        />
      )}
    </article>
  )
}
