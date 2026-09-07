import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nContext'
import { formatIngredientAmount } from '../lib/ingredient-amount'
import type { RecipeDetail, RecipeStepView } from '../types'

type Props = {
  recipeId: string
  onClose: () => void
}

export function SubRecipeSheet({ recipeId, onClose }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [stack, setStack] = useState<string[]>([recipeId])
  const [detail, setDetail] = useState<RecipeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentId = stack[stack.length - 1]

  useEffect(() => {
    let alive = true
    setDetail(null)
    setError(null)
    ;(async () => {
      try {
        const data = await api.getRecipePreview(currentId)
        if (alive) setDetail(data)
      } catch (e) {
        if (alive)
          setError(e instanceof Error ? e.message : t('recipeDetail.loadFailed'))
      }
    })()
    return () => {
      alive = false
    }
  }, [currentId, t])

  function openNested(id: string) {
    setStack((s) => [...s, id])
  }

  function back() {
    if (stack.length > 1) setStack((s) => s.slice(0, -1))
    else onClose()
  }

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={t('studio.subRecipePreview')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__bar">
          <button type="button" className="btn ghost compact" onClick={back}>
            {stack.length > 1 ? t('common.back') : t('common.close')}
          </button>
          <button
            type="button"
            className="btn primary compact"
            onClick={() => {
              onClose()
              navigate(`/recipes/${currentId}`)
            }}
          >
            {t('studio.viewFull')}
          </button>
        </div>

        {error && <div className="banner error">{error}</div>}
        {!detail && !error && <p className="muted">{t('common.loading')}…</p>}
        {detail && (
          <div className="sheet__body">
            {detail.version.coverUrl && (
              <img
                className="sheet__cover"
                src={detail.version.coverUrl}
                alt=""
              />
            )}
            <h2>{detail.version.title}</h2>
            <p className="muted">
              {detail.authorName ?? t('common.anonymous')} ·{' '}
              {t('common.minutes', { count: detail.version.cookTimeMinutes })}
            </p>
            <p>{detail.version.summary}</p>

            <h3>{t('recipeDetail.ingredients')}</h3>
            <ul className="ingredients">
              {detail.version.ingredientGroups.flatMap((g) =>
                g.ingredients.map((ing) => (
                  <li key={`${g.position}-${ing.position}-${ing.name}`}>
                    <span>
                      {ing.imageUrl && (
                        <img className="ing-thumb" src={ing.imageUrl} alt="" />
                      )}{' '}
                      {ing.name}
                    </span>
                    <span>{formatIngredientAmount(ing)}</span>
                  </li>
                )),
              )}
            </ul>

            <h3>{t('recipeDetail.steps')}</h3>
            <ol className="steps">
              {detail.version.steps.map((step) => (
                <SheetStep
                  key={step.position}
                  step={step}
                  onOpenSub={openNested}
                />
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function SheetStep({
  step,
  onOpenSub,
}: {
  step: RecipeStepView
  onOpenSub: (id: string) => void
}) {
  const { t } = useI18n()
  if (step.mode === 'SUB_RECIPE' && step.subRecipe) {
    return (
      <li>
        <button
          type="button"
          className="sub-recipe-card"
          onClick={() => onOpenSub(step.subRecipe!.recipeId)}
        >
          {step.subRecipe.coverUrl && (
            <img src={step.subRecipe.coverUrl} alt="" />
          )}
          <span>
            <strong>{step.title || step.subRecipe.title}</strong>
            <br />
            <small className="muted">{step.subRecipe.authorName}</small>
          </span>
        </button>
      </li>
    )
  }
  return (
    <li>
      {step.title && <strong>{step.title}</strong>}
      <p>{step.instruction}</p>
      {step.tip && (
        <p className="muted">
          {t('studio.tip')}: {step.tip}
        </p>
      )}
    </li>
  )
}
