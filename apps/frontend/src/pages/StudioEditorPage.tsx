import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api, uploadFile } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ButtonLabel } from '../components/Spinner'
import { FormPageSkeleton } from '../components/Skeleton'
import { useApiMessage, useI18n } from '../i18n/I18nContext'
import type {
  CatalogIngredient,
  DraftIngredientGroup,
  DraftStep,
  Difficulty,
  RecipeEditor,
  RecipeListItem,
  StepMode,
  Unit,
  UpdateDraftPayload,
} from '../types'

type Tab = 'basics' | 'ingredients' | 'steps' | 'publish'

export function StudioEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const apiMessage = useApiMessage()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('basics')
  const [editor, setEditor] = useState<RecipeEditor | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [servings, setServings] = useState(2)
  const [prep, setPrep] = useState(0)
  const [cook, setCook] = useState(30)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [coverAssetId, setCoverAssetId] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | undefined>()

  const [units, setUnits] = useState<Unit[]>([])
  const [groups, setGroups] = useState<DraftIngredientGroup[]>([
    { name: 'Default', ingredients: [] },
  ])
  const [ingQuery, setIngQuery] = useState('')
  const [ingResults, setIngResults] = useState<CatalogIngredient[]>([])
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>(
    {},
  )
  const [proposeName, setProposeName] = useState('')

  const [steps, setSteps] = useState<DraftStep[]>([
    { mode: 'TEXT', instruction: '', media: [] },
  ])
  const [pubQuery, setPubQuery] = useState('')
  const [pubRecipes, setPubRecipes] = useState<RecipeListItem[]>([])

  const hydrate = useCallback((data: RecipeEditor) => {
    setEditor(data)
    const d = data.draft
    setTitle(d.title)
    setSummary(d.summary)
    setServings(d.servings)
    setPrep(d.prepTimeMinutes)
    setCook(d.cookTimeMinutes)
    setDifficulty((d.difficulty as Difficulty) || 'easy')
    setCoverUrl(d.coverUrl)
    setGroups(
      d.ingredientGroups.length
        ? d.ingredientGroups.map((g) => ({
            name: g.name,
            ingredients: g.ingredients.map((i) => ({
              ingredientId: i.ingredientId,
              customName: i.customName,
              quantityMin: i.quantityMin,
              quantityMax: i.quantityMax,
              unitId: i.unit?.id,
              preparationNote: i.preparationNote,
              isOptional: i.isOptional,
            })),
          }))
        : [{ name: 'Default', ingredients: [] }],
    )
    const labels: Record<string, string> = {}
    for (const g of d.ingredientGroups) {
      for (const i of g.ingredients) {
        if (i.ingredientId) labels[i.ingredientId] = i.name
      }
    }
    setSelectedLabels(labels)
    setSteps(
      d.steps.length
        ? d.steps.map((s) => ({
            mode: s.mode,
            title: s.title,
            instruction: s.instruction,
            tip: s.tip,
            media: s.media.map((m) => ({
              mediaAssetId: m.mediaAssetId,
              caption: m.caption,
            })),
            childRecipeVersionId: s.subRecipe?.versionId,
            servingMultiplier: s.subRecipe?.servingMultiplier,
          }))
        : [{ mode: 'TEXT', instruction: '', media: [] }],
    )
  }, [])

  useEffect(() => {
    if (!user || !id) return
    let alive = true
    ;(async () => {
      try {
        const [data, unitList] = await Promise.all([
          api.getEditor(id),
          api.getUnits(),
        ])
        if (!alive) return
        setUnits(unitList)
        hydrate(data)
      } catch (e) {
        toast.error(
          apiMessage(e instanceof Error ? e.message : undefined, 'errors.generic'),
        )
        navigate('/studio')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [user, id, hydrate, apiMessage, navigate])

  useEffect(() => {
    let alive = true
    const q = ingQuery.trim()
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const rows = await api.searchIngredients(q || undefined)
          if (alive) setIngResults(rows)
        } catch {
          /* ignore */
        }
      })()
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [ingQuery])

  useEffect(() => {
    if (tab !== 'steps') return
    let alive = true
    void (async () => {
      try {
        const rows = await api.getRecipes(pubQuery || undefined)
        if (alive) setPubRecipes(rows.filter((r) => r.id !== id))
      } catch {
        /* ignore */
      }
    })()
    return () => {
      alive = false
    }
  }, [tab, pubQuery, id])

  const buildPayload = useMemo(
    (): UpdateDraftPayload => ({
      title: title.trim(),
      summary: summary.trim(),
      servings,
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      difficulty,
      coverAssetId,
      ingredientGroups: groups,
      steps,
    }),
    [title, summary, servings, prep, cook, difficulty, coverAssetId, groups, steps],
  )

  async function saveDraft() {
    if (!id) return
    setSaving(true)
    try {
      const data = await api.updateDraft(id, buildPayload)
      hydrate(data)
      toast.success(t('studio.saved'))
    } catch (e) {
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'studio.saveFailed'),
      )
    } finally {
      setSaving(false)
    }
  }

  async function onPublish() {
    if (!id) return
    setPublishing(true)
    try {
      await api.updateDraft(id, buildPayload)
      const detail = await api.publishRecipe(id)
      toast.success(t('studio.published'))
      navigate(`/recipes/${detail.id}`)
    } catch (e) {
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'studio.publishFailed'),
      )
    } finally {
      setPublishing(false)
    }
  }

  async function onCover(file: File | null) {
    if (!file) return
    try {
      const asset = await uploadFile(file)
      setCoverAssetId(asset.id)
      toast.success(t('media.uploaded'))
    } catch (e) {
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'media.uploadFailed'),
      )
    }
  }

  function addIngredient(ing: CatalogIngredient) {
    setSelectedLabels((prev) => ({ ...prev, [ing.id]: ing.canonicalName }))
    setGroups((prev) => {
      const next = [...prev]
      const g = { ...next[0], ingredients: [...next[0].ingredients] }
      g.ingredients.push({
        ingredientId: ing.id,
        quantityMin: 1,
        unitId: units[0]?.id,
      })
      next[0] = g
      return next
    })
  }

  async function proposeIngredient() {
    if (!proposeName.trim()) return
    try {
      await api.proposeIngredient({ name: proposeName.trim() })
      toast.success(t('ingredients.proposeSuccess'))
      setProposeName('')
    } catch (e) {
      toast.error(
        apiMessage(
          e instanceof Error ? e.message : undefined,
          'ingredients.proposeFailed',
        ),
      )
    }
  }

  function updateStep(index: number, patch: Partial<DraftStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  async function addStepMedia(index: number, file: File | null) {
    if (!file) return
    try {
      const asset = await uploadFile(file)
      setSteps((prev) =>
        prev.map((s, i) =>
          i === index
            ? {
                ...s,
                media: [...(s.media ?? []), { mediaAssetId: asset.id }],
              }
            : s,
        ),
      )
      toast.success(t('media.uploaded'))
    } catch (e) {
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'media.uploadFailed'),
      )
    }
  }

  if (!authLoading && !user) return <Navigate to="/login" replace />
  if (authLoading || loading || !editor) return <FormPageSkeleton />

  return (
    <section className="studio">
      <div className="page-head">
        <div>
          <Link to="/studio" className="back">
            {t('studio.backStudio')}
          </Link>
          <h1>{t('studio.editorTitle')}</h1>
          <p className="lede muted">{editor.slug}</p>
        </div>
        <button
          type="button"
          className="btn ghost"
          disabled={saving}
          onClick={() => void saveDraft()}
        >
          <ButtonLabel loading={saving} loadingText={t('studio.saving')}>
            {t('studio.save')}
          </ButtonLabel>
        </button>
      </div>

      <div className="studio-tabs" role="tablist">
        {(['basics', 'ingredients', 'steps', 'publish'] as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            className={tab === key ? 'active' : undefined}
            aria-selected={tab === key}
            onClick={() => setTab(key)}
          >
            {t(`studio.tab.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'basics' && (
        <div className="form form--wide">
          <label>
            {t('studio.fieldTitle')}
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            {t('studio.summary')}
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
          <div className="row">
            <label>
              {t('studio.servings')}
              <input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
              />
            </label>
            <label>
              {t('studio.prep')}
              <input
                type="number"
                min={0}
                value={prep}
                onChange={(e) => setPrep(Number(e.target.value))}
              />
            </label>
            <label>
              {t('studio.cook')}
              <input
                type="number"
                min={0}
                value={cook}
                onChange={(e) => setCook(Number(e.target.value))}
              />
            </label>
            <label>
              {t('newRecipe.difficulty')}
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="easy">{t('difficulty.easy')}</option>
                <option value="medium">{t('difficulty.medium')}</option>
                <option value="hard">{t('difficulty.hard')}</option>
              </select>
            </label>
          </div>
          <label>
            {t('studio.cover')}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void onCover(e.target.files?.[0] ?? null)}
            />
          </label>
          {coverUrl && (
            <img src={coverUrl} alt="" className="studio-cover-preview" />
          )}
        </div>
      )}

      {tab === 'ingredients' && (
        <div className="studio-pane">
          <label>
            {t('ingredients.search')}
            <input
              value={ingQuery}
              onChange={(e) => setIngQuery(e.target.value)}
              placeholder={t('ingredients.searchPlaceholder')}
            />
          </label>
          <ul className="ing-search-list">
            {ingResults.map((ing) => (
              <li key={ing.id}>
                <button type="button" className="ing-search-item" onClick={() => addIngredient(ing)}>
                  {ing.imageUrl ? (
                    <img src={ing.imageUrl} alt="" />
                  ) : (
                    <span className="ing-fallback" />
                  )}
                  <span>
                    {ing.canonicalName}
                    {ing.nameEn ? ` · ${ing.nameEn}` : ''}
                  </span>
                  <span className="muted">+</span>
                </button>
              </li>
            ))}
          </ul>

          <h3>{t('studio.selectedIngredients')}</h3>
          {groups[0]?.ingredients.map((line, idx) => (
            <div className="row ing-line" key={idx}>
              <span className="ing-line__name">
                {line.ingredientId
                  ? selectedLabels[line.ingredientId] ||
                    ingResults.find((i) => i.id === line.ingredientId)
                      ?.canonicalName ||
                    line.customName ||
                    '…'
                  : line.customName}
              </span>
              <input
                type="number"
                min={0}
                step="any"
                value={line.quantityMin ?? ''}
                onChange={(e) => {
                  const v = e.target.value === '' ? undefined : Number(e.target.value)
                  setGroups((prev) => {
                    const next = structuredClone(prev)
                    next[0].ingredients[idx].quantityMin = v
                    return next
                  })
                }}
              />
              <select
                value={line.unitId ?? ''}
                onChange={(e) => {
                  setGroups((prev) => {
                    const next = structuredClone(prev)
                    next[0].ingredients[idx].unitId = e.target.value || undefined
                    return next
                  })
                }}
              >
                <option value="">—</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.symbol}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn ghost compact"
                onClick={() =>
                  setGroups((prev) => {
                    const next = structuredClone(prev)
                    next[0].ingredients.splice(idx, 1)
                    return next
                  })
                }
              >
                ×
              </button>
            </div>
          ))}

          <div className="propose-box">
            <h3>{t('ingredients.propose')}</h3>
            <div className="row">
              <input
                value={proposeName}
                onChange={(e) => setProposeName(e.target.value)}
                placeholder={t('ingredients.proposePlaceholder')}
              />
              <button type="button" className="btn ghost" onClick={() => void proposeIngredient()}>
                {t('ingredients.proposeSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'steps' && (
        <div className="studio-pane">
          {steps.map((step, idx) => (
            <div className="step-editor" key={idx}>
              <div className="step-editor__head">
                <strong>
                  {t('studio.step')} {idx + 1}
                </strong>
                <div className="step-mode">
                  {(['TEXT', 'SUB_RECIPE'] as StepMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={step.mode === mode ? 'active' : undefined}
                      onClick={() => updateStep(idx, { mode })}
                    >
                      {t(`studio.stepMode.${mode}`)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn ghost compact"
                  onClick={() => setSteps((p) => p.filter((_, i) => i !== idx))}
                  disabled={steps.length <= 1}
                >
                  ×
                </button>
              </div>

              <input
                placeholder={t('studio.stepTitle')}
                value={step.title ?? ''}
                onChange={(e) => updateStep(idx, { title: e.target.value })}
              />

              {step.mode === 'TEXT' ? (
                <>
                  <textarea
                    rows={3}
                    placeholder={t('studio.instruction')}
                    value={step.instruction ?? ''}
                    onChange={(e) => updateStep(idx, { instruction: e.target.value })}
                  />
                  <label>
                    {t('studio.stepMedia')}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) =>
                        void addStepMedia(idx, e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  <p className="muted">
                    {(step.media?.length ?? 0) > 0
                      ? t('studio.mediaCount', { count: step.media!.length })
                      : t('studio.noMedia')}
                  </p>
                </>
              ) : (
                <>
                  <input
                    value={pubQuery}
                    onChange={(e) => setPubQuery(e.target.value)}
                    placeholder={t('studio.searchSubRecipe')}
                  />
                  <ul className="ing-search-list">
                    {pubRecipes.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className={
                            step.childRecipeVersionId
                              ? 'ing-search-item'
                              : 'ing-search-item'
                          }
                          onClick={async () => {
                            try {
                              const detail = await api.getRecipe(r.id)
                              updateStep(idx, {
                                childRecipeVersionId: detail.version.id,
                                title: step.title || r.title,
                              })
                              toast.success(t('studio.subRecipeLinked'))
                            } catch (e) {
                              toast.error(
                                apiMessage(
                                  e instanceof Error ? e.message : undefined,
                                  'errors.generic',
                                ),
                              )
                            }
                          }}
                        >
                          {r.coverUrl ? <img src={r.coverUrl} alt="" /> : <span className="ing-fallback" />}
                          <span>
                            {r.title}
                            <br />
                            <small className="muted">{r.authorName}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {step.childRecipeVersionId && (
                    <p className="banner ok">
                      {t('studio.linkedVersion')}: {step.childRecipeVersionId.slice(0, 8)}…
                    </p>
                  )}
                </>
              )}

              <input
                placeholder={t('studio.tip')}
                value={step.tip ?? ''}
                onChange={(e) => updateStep(idx, { tip: e.target.value })}
              />
            </div>
          ))}
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              setSteps((p) => [...p, { mode: 'TEXT', instruction: '', media: [] }])
            }
          >
            {t('studio.addStep')}
          </button>
        </div>
      )}

      {tab === 'publish' && (
        <div className="studio-pane">
          <p className="lede">{t('studio.publishHint')}</p>
          <ul className="checklist">
            <li>{title.trim().length >= 3 ? '✓' : '○'} {t('studio.checkTitle')}</li>
            <li>
              {(groups[0]?.ingredients.length ?? 0) >= 1 ? '✓' : '○'}{' '}
              {t('studio.checkIngredients')}
            </li>
            <li>
              {steps.some(
                (s) =>
                  (s.mode === 'TEXT' && (s.instruction?.trim().length ?? 0) > 0) ||
                  (s.mode === 'SUB_RECIPE' && s.childRecipeVersionId),
              )
                ? '✓'
                : '○'}{' '}
              {t('studio.checkSteps')}
            </li>
          </ul>
          <button
            type="button"
            className="btn primary block"
            disabled={publishing}
            onClick={() => void onPublish()}
          >
            <ButtonLabel loading={publishing} loadingText={t('studio.publishing')}>
              {t('studio.publish')}
            </ButtonLabel>
          </button>
        </div>
      )}
    </section>
  )
}
