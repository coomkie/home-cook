import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  UpdateDraftPayload,
} from '../types'

type Tab = 'basics' | 'ingredients' | 'steps' | 'publish'

const TAB_ORDER: Tab[] = ['basics', 'ingredients', 'steps', 'publish']

function ingredientInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0) : '?'
}

function unlockStorageKey(recipeId: string) {
  return `studio-unlock:${recipeId}`
}

function readStoredUnlock(recipeId: string): number {
  try {
    const raw = sessionStorage.getItem(unlockStorageKey(recipeId))
    const n = raw == null ? 0 : Number(raw)
    return Number.isFinite(n) ? Math.min(3, Math.max(0, Math.floor(n))) : 0
  } catch {
    return 0
  }
}

function writeStoredUnlock(recipeId: string, level: number) {
  try {
    sessionStorage.setItem(unlockStorageKey(recipeId), String(level))
  } catch {
    /* ignore */
  }
}

function inferUnlocked(data: RecipeEditor): number {
  const d = data.draft
  const lines = d.ingredientGroups.flatMap((g) => g.ingredients)
  const hasStep = d.steps.some(
    (s) =>
      (s.mode === 'TEXT' && (s.instruction?.trim().length ?? 0) > 0) ||
      (s.mode === 'SUB_RECIPE' && !!s.subRecipe?.versionId),
  )
  // Chỉ mở khóa theo dữ liệu đã lưu thật — không unlock chỉ vì title placeholder lúc tạo.
  if (lines.length >= 1 && hasStep) return 3
  if (lines.length >= 1) return 2
  return 0
}

export function StudioEditorPage() {
  const { id } = useParams<{ id: string }>()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const apiMessage = useApiMessage()
  const navigate = useNavigate()
  const selectedTrayRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [ingSearching, setIngSearching] = useState(false)

  const [tab, setTab] = useState<Tab>('basics')
  const [unlocked, setUnlocked] = useState(0)
  const [editor, setEditor] = useState<RecipeEditor | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [servings, setServings] = useState(2)
  const [prep, setPrep] = useState(0)
  const [cook, setCook] = useState(30)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [coverAssetId, setCoverAssetId] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | undefined>()
  const [coverUploading, setCoverUploading] = useState(false)
  const coverObjectUrlRef = useRef<string | null>(null)

  const [groups, setGroups] = useState<DraftIngredientGroup[]>([
    { name: 'Default', ingredients: [] },
  ])
  const [ingQuery, setIngQuery] = useState('')
  const [ingResults, setIngResults] = useState<CatalogIngredient[]>([])
  const [staples, setStaples] = useState<CatalogIngredient[]>([])
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>(
    {},
  )
  const [proposeName, setProposeName] = useState('')

  const [steps, setSteps] = useState<DraftStep[]>([
    { mode: 'TEXT', instruction: '', media: [] },
  ])
  const [pubQuery, setPubQuery] = useState('')
  const [pubRecipes, setPubRecipes] = useState<RecipeListItem[]>([])

  const hydrate = useCallback(
    (
      data: RecipeEditor,
      sections: { basics?: boolean; ingredients?: boolean; steps?: boolean } = {
        basics: true,
        ingredients: true,
        steps: true,
      },
    ) => {
      setEditor(data)
      const d = data.draft
      if (sections.basics) {
        setTitle(d.title)
        setSummary(d.summary)
        setServings(d.servings)
        setPrep(d.prepTimeMinutes)
        setCook(d.cookTimeMinutes)
        setDifficulty((d.difficulty as Difficulty) || 'easy')
        setCoverUrl(d.coverUrl)
        setCoverAssetId(d.coverAssetId ?? null)
      }
      if (sections.ingredients) {
        setGroups(
          d.ingredientGroups.length
            ? d.ingredientGroups.map((g) => ({
                name: g.name,
                ingredients: g.ingredients.map((i) => ({
                  ingredientId: i.ingredientId,
                  customName: i.customName,
                  quantityMin: i.quantityMin ?? null,
                  quantityMax: i.quantityMax ?? null,
                  unitText: i.unitText || i.unit?.symbol || '',
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
      }
      if (sections.steps) {
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
      }
    },
    [],
  )

  const buildPayloadForTab = useCallback(
    (current: Tab): UpdateDraftPayload => {
      const ingredientGroups = groups.map((g) => ({
        name: g.name,
        ingredients: g.ingredients.map((line) => ({
          ingredientId: line.ingredientId,
          customName: line.customName,
          // Explicit null so cleared qty is persisted (JSON drops `undefined`).
          quantityMin:
            line.quantityMin == null || Number.isNaN(line.quantityMin)
              ? null
              : line.quantityMin,
          quantityMax:
            line.quantityMax == null || Number.isNaN(line.quantityMax)
              ? null
              : line.quantityMax,
          unitId: line.unitId,
          unitText: line.unitText?.trim() ? line.unitText.trim() : undefined,
          preparationNote: line.preparationNote,
          isOptional: line.isOptional,
        })),
      }))

      if (current === 'basics') {
        return {
          title: title.trim(),
          summary: summary.trim(),
          servings,
          prepTimeMinutes: prep,
          cookTimeMinutes: cook,
          difficulty,
          coverAssetId,
        }
      }
      if (current === 'ingredients') {
        return { ingredientGroups }
      }
      if (current === 'steps') {
        return { steps }
      }
      return {
        title: title.trim(),
        summary: summary.trim(),
        servings,
        prepTimeMinutes: prep,
        cookTimeMinutes: cook,
        difficulty,
        coverAssetId,
        ingredientGroups,
        steps,
      }
    },
    [title, summary, servings, prep, cook, difficulty, coverAssetId, groups, steps],
  )

  useEffect(() => {
    if (!user || !id) return
    let alive = true
    ;(async () => {
      try {
        const [data, stapleList] = await Promise.all([
          api.getEditor(id),
          api.getStapleIngredients(),
        ])
        if (!alive) return
        hydrate(data)
        setStaples(stapleList)
        setUnlocked(Math.max(inferUnlocked(data), readStoredUnlock(id)))
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
    if (q.length < 1) {
      setIngResults([])
      setIngSearching(false)
      return () => {
        alive = false
      }
    }
    setIngSearching(true)
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const rows = await api.searchIngredients(q)
          if (alive) setIngResults(rows)
        } catch {
          if (alive) setIngResults([])
        } finally {
          if (alive) setIngSearching(false)
        }
      })()
    }, 280)
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

  const checks = useMemo(() => {
    const titleOk = title.trim().length >= 3
    const ingredientsOk = (groups[0]?.ingredients.length ?? 0) >= 1
    const stepsOk = steps.some(
      (s) =>
        (s.mode === 'TEXT' && (s.instruction?.trim().length ?? 0) > 0) ||
        (s.mode === 'SUB_RECIPE' && !!s.childRecipeVersionId),
    )
    return { titleOk, ingredientsOk, stepsOk }
  }, [title, groups, steps])

  function trySelectTab(next: Tab) {
    const idx = TAB_ORDER.indexOf(next)
    if (idx > unlocked) {
      toast.message(t('studio.tabLocked'))
      return
    }
    setTab(next)
  }

  function validateTab(current: Tab): boolean {
    if (current === 'basics' && !checks.titleOk) {
      toast.error(t('studio.checkTitle'))
      return false
    }
    if (current === 'ingredients' && !checks.ingredientsOk) {
      toast.error(t('studio.checkIngredients'))
      return false
    }
    if (current === 'steps' && !checks.stepsOk) {
      toast.error(t('studio.checkSteps'))
      return false
    }
    return true
  }

  async function saveDraft(opts?: { advance?: boolean }) {
    if (!id) return
    const currentIdx = TAB_ORDER.indexOf(tab)
    if (opts?.advance && !validateTab(tab)) return

    setSaving(true)
    try {
      const payload = buildPayloadForTab(tab)
      const data = await api.updateDraft(id, payload)
      // Only re-hydrate sections that were saved — otherwise cleared qty gets
      // wiped back from stale server data when saving another tab.
      hydrate(data, {
        basics:
          payload.title !== undefined ||
          payload.summary !== undefined ||
          payload.servings !== undefined ||
          payload.prepTimeMinutes !== undefined ||
          payload.cookTimeMinutes !== undefined ||
          payload.difficulty !== undefined ||
          payload.coverAssetId !== undefined,
        ingredients: payload.ingredientGroups !== undefined,
        steps: payload.steps !== undefined,
      })
      toast.success(t('studio.saved'))
      if (opts?.advance) {
        const nextLevel = Math.max(unlocked, currentIdx + 1)
        setUnlocked(nextLevel)
        writeStoredUnlock(id, nextLevel)
        const nextTab = TAB_ORDER[Math.min(currentIdx + 1, TAB_ORDER.length - 1)]
        setTab(nextTab)
      } else {
        setUnlocked((u) => {
          const next = Math.max(u, inferUnlocked(data))
          writeStoredUnlock(id, next)
          return next
        })
      }
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
    if (!checks.titleOk || !checks.ingredientsOk || !checks.stepsOk) {
      toast.error(t('studio.publishBlocked'))
      return
    }
    setPublishing(true)
    try {
      await api.updateDraft(id, buildPayloadForTab('publish'))
      const detail = await api.publishRecipe(id)
      toast.success(
        editor.status === 'PUBLISHED' ? t('studio.republished') : t('studio.published'),
      )
      navigate(`/recipes/${detail.id}`)
    } catch (e) {
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'studio.publishFailed'),
      )
    } finally {
      setPublishing(false)
    }
  }

  async function onDeleteDraft() {
    if (!id || !editor || editor.status !== 'DRAFT') return
    if (!window.confirm(t('studio.deleteDraftConfirm'))) return
    setDeleting(true)
    try {
      await api.deleteDraft(id)
      try {
        sessionStorage.removeItem(`studio-unlock:${id}`)
      } catch {
        /* ignore */
      }
      toast.success(t('studio.deleted'))
      navigate('/studio')
    } catch (e) {
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'studio.deleteFailed'),
      )
    } finally {
      setDeleting(false)
    }
  }

  async function onCover(file: File | null) {
    if (!file) return
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current)
      coverObjectUrlRef.current = null
    }
    const localUrl = URL.createObjectURL(file)
    coverObjectUrlRef.current = localUrl
    setCoverUrl(localUrl)
    setCoverUploading(true)
    try {
      const asset = await uploadFile(file)
      setCoverAssetId(asset.id)
      if (asset.url) {
        if (coverObjectUrlRef.current) {
          URL.revokeObjectURL(coverObjectUrlRef.current)
          coverObjectUrlRef.current = null
        }
        setCoverUrl(asset.url)
      }
      toast.success(t('media.uploaded'))
    } catch (e) {
      if (coverObjectUrlRef.current) {
        URL.revokeObjectURL(coverObjectUrlRef.current)
        coverObjectUrlRef.current = null
      }
      setCoverUrl(undefined)
      setCoverAssetId(null)
      toast.error(
        apiMessage(e instanceof Error ? e.message : undefined, 'media.uploadFailed'),
      )
    } finally {
      setCoverUploading(false)
    }
  }

  function clearCover() {
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current)
      coverObjectUrlRef.current = null
    }
    setCoverUrl(undefined)
    setCoverAssetId(null)
  }

  function addIngredient(ing: CatalogIngredient) {
    const already = groups[0]?.ingredients.some((l) => l.ingredientId === ing.id)
    if (already) {
      toast.message(t('ingredients.alreadyAdded', { name: ing.canonicalName }))
      selectedTrayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      setFlashId(ing.id)
      window.setTimeout(() => setFlashId(null), 700)
      return
    }
    setSelectedLabels((prev) => ({ ...prev, [ing.id]: ing.canonicalName }))
    setGroups((prev) => {
      const next = [...prev]
      const g = { ...next[0], ingredients: [...next[0].ingredients] }
      g.ingredients = [
        {
          ingredientId: ing.id,
          unitText: '',
        },
        ...g.ingredients,
      ]
      next[0] = g
      return next
    })
    setFlashId(ing.id)
    window.setTimeout(() => setFlashId(null), 900)
    setIngQuery('')
    setIngResults([])
    selectedTrayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    toast.success(t('ingredients.added', { name: ing.canonicalName }))
    window.setTimeout(() => searchInputRef.current?.focus(), 50)
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

  const selectedIds = useMemo(
    () =>
      new Set(
        (groups[0]?.ingredients ?? [])
          .map((l) => l.ingredientId)
          .filter(Boolean) as string[],
      ),
    [groups],
  )

  const readyCount =
    Number(checks.titleOk) + Number(checks.ingredientsOk) + Number(checks.stepsOk)

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
        {editor.status === 'DRAFT' && (
          <button
            type="button"
            className="btn ghost danger"
            disabled={deleting || saving || publishing}
            onClick={() => void onDeleteDraft()}
          >
            {deleting ? t('studio.deleting') : t('studio.deleteDraft')}
          </button>
        )}
      </div>

      <div className="studio-tabs" role="tablist">
        {TAB_ORDER.map((key, idx) => {
          const locked = idx > unlocked
          const done = idx < unlocked
          return (
            <button
              key={key}
              type="button"
              role="tab"
              className={[
                tab === key ? 'active' : '',
                locked ? 'locked' : '',
                done ? 'done' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-selected={tab === key}
              aria-disabled={locked}
              onClick={() => trySelectTab(key)}
            >
              <span className="studio-tabs__idx">{idx + 1}</span>
              {t(`studio.tab.${key}`)}
            </button>
          )
        })}
      </div>

      {tab === 'basics' && (
        <div className="form form--wide studio-form">
          <label className="field">
            <span className="field__label">{t('studio.fieldTitle')}</span>
            <input
              className="field__control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('studio.untitled')}
            />
          </label>
          <label className="field">
            <span className="field__label">{t('studio.summary')}</span>
            <textarea
              className="field__control"
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
          <div className="row">
            <label className="field">
              <span className="field__label">{t('studio.servings')}</span>
              <input
                className="field__control"
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span className="field__label">{t('studio.prep')}</span>
              <input
                className="field__control"
                type="number"
                min={0}
                value={prep}
                onChange={(e) => setPrep(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span className="field__label">{t('studio.cook')}</span>
              <input
                className="field__control"
                type="number"
                min={0}
                value={cook}
                onChange={(e) => setCook(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span className="field__label">{t('newRecipe.difficulty')}</span>
              <select
                className="field__control"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="easy">{t('difficulty.easy')}</option>
                <option value="medium">{t('difficulty.medium')}</option>
                <option value="hard">{t('difficulty.hard')}</option>
              </select>
            </label>
          </div>
          <div className="cover-field">
            <span className="field__label">{t('studio.cover')}</span>
            <div className="cover-field__body">
              <div className="cover-preview">
                {coverUrl ? (
                  <img src={coverUrl} alt="" />
                ) : (
                  <span className="cover-preview__empty">
                    {coverUploading
                      ? t('studio.coverUploading')
                      : t('studio.coverEmpty')}
                  </span>
                )}
                {coverUploading && (
                  <span className="cover-preview__busy">{t('studio.coverUploading')}</span>
                )}
              </div>
              <div className="cover-field__actions">
                <label className="btn ghost compact cover-field__pick">
                  {coverUploading
                    ? t('studio.coverUploading')
                    : coverUrl
                      ? t('studio.coverChange')
                      : t('studio.coverPick')}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={coverUploading || saving}
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      e.target.value = ''
                      void onCover(f)
                    }}
                  />
                </label>
                {coverUrl && !coverUploading && (
                  <button
                    type="button"
                    className="btn ghost compact"
                    onClick={clearCover}
                  >
                    {t('studio.coverRemove')}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="studio-footer">
            <button
              type="button"
              className="btn primary block"
              disabled={saving}
              onClick={() => void saveDraft({ advance: true })}
            >
              <ButtonLabel loading={saving} loadingText={t('studio.saving')}>
                {t('studio.saveContinue')}
              </ButtonLabel>
            </button>
          </div>
        </div>
      )}

      {tab === 'ingredients' && (
        <div className="studio-pane">
          <div className="ing-catalog">
            {staples.length > 0 && (
              <div className="ing-staples">
                <div className="ing-staples__head">
                  <h3>{t('ingredients.staples')}</h3>
                  <span className="ing-staples__hint">
                    {t('ingredients.staplesHint')}
                  </span>
                </div>
                <div className="ing-staples__grid" role="list">
                  {staples.map((ing) => {
                    const selected = selectedIds.has(ing.id)
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        role="listitem"
                        className={
                          selected
                            ? 'ing-staple ing-staple--selected'
                            : 'ing-staple'
                        }
                        onClick={() => addIngredient(ing)}
                      >
                        {ing.imageUrl ? (
                          <img src={ing.imageUrl} alt="" />
                        ) : (
                          <span className="ing-fallback ing-fallback--sm">
                            {ingredientInitial(ing.canonicalName)}
                          </span>
                        )}
                        <span className="ing-staple__name">
                          {ing.canonicalName}
                        </span>
                        <span className="ing-staple__mark" aria-hidden>
                          {selected ? '✓' : '+'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <label className="field ing-catalog__search">
              <span className="field__label">{t('ingredients.search')}</span>
              <input
                ref={searchInputRef}
                className="field__control"
                value={ingQuery}
                onChange={(e) => setIngQuery(e.target.value)}
                placeholder={t('ingredients.searchPlaceholder')}
                autoComplete="off"
                autoFocus
              />
              <span className="ing-catalog__hint">{t('ingredients.searchHint')}</span>
            </label>

            {ingQuery.trim().length === 0 ? (
              <div className="ing-catalog__empty">
                <p>{t('ingredients.searchIdle')}</p>
              </div>
            ) : ingSearching ? (
              <div className="ing-catalog__empty">
                <p>{t('ingredients.searching')}</p>
              </div>
            ) : ingResults.length === 0 ? (
              <div className="ing-catalog__empty">
                <p>{t('ingredients.noResults', { q: ingQuery.trim() })}</p>
                <button
                  type="button"
                  className="btn ghost compact"
                  onClick={() => {
                    setProposeName(ingQuery.trim())
                    document
                      .getElementById('ing-propose')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }}
                >
                  {t('ingredients.proposeFromSearch')}
                </button>
              </div>
            ) : (
              <ul className="ing-search-list" role="listbox">
                {ingResults.map((ing) => {
                  const selected = selectedIds.has(ing.id)
                  return (
                    <li key={ing.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={
                          selected
                            ? 'ing-search-item ing-search-item--selected'
                            : 'ing-search-item'
                        }
                        onClick={() => addIngredient(ing)}
                      >
                        {ing.imageUrl ? (
                          <img src={ing.imageUrl} alt="" />
                        ) : (
                          <span className="ing-fallback">
                            {ingredientInitial(ing.canonicalName)}
                          </span>
                        )}
                        <span>
                          {ing.canonicalName}
                          {ing.nameEn ? ` · ${ing.nameEn}` : ''}
                        </span>
                        <span className="ing-search-item__action">
                          {selected ? '✓' : '+'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div
            ref={selectedTrayRef}
            className="ing-tray"
            aria-live="polite"
          >
            <div className="ing-tray__head">
              <h3>{t('studio.selectedIngredients')}</h3>
              <span className="ing-tray__count">
                {groups[0]?.ingredients.length ?? 0}
              </span>
            </div>
            {(groups[0]?.ingredients.length ?? 0) === 0 ? (
              <p className="ing-tray__empty">{t('ingredients.trayEmpty')}</p>
            ) : (
              <ul className="ing-chip-list">
                {groups[0].ingredients.map((line, idx) => {
                  const key = line.ingredientId ?? `custom-${idx}`
                  const name = line.ingredientId
                    ? selectedLabels[line.ingredientId] || line.customName || '…'
                    : line.customName
                  return (
                    <li
                      key={`${key}-${idx}`}
                      className={
                        flashId && line.ingredientId === flashId
                          ? 'ing-chip ing-chip--flash'
                          : 'ing-chip'
                      }
                    >
                      <div className="ing-chip__top">
                        <span className="ing-chip__name">{name}</span>
                        <button
                          type="button"
                          className="ing-chip__remove"
                          aria-label={t('ingredients.remove')}
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
                      <div className="ing-chip__meta">
                        <label className="ing-chip__field">
                          <span className="ing-chip__field-label">
                            {t('ingredients.qty')}
                          </span>
                          <input
                            className="field__control field__control--sm"
                            type="text"
                            inputMode="decimal"
                            value={
                              line.quantityMin == null ? '' : String(line.quantityMin)
                            }
                            placeholder="—"
                            onChange={(e) => {
                              const raw = e.target.value.trim()
                              setGroups((prev) => {
                                const next = structuredClone(prev)
                                if (raw === '') {
                                  next[0].ingredients[idx].quantityMin = null
                                } else {
                                  const v = Number(raw.replace(',', '.'))
                                  next[0].ingredients[idx].quantityMin =
                                    Number.isNaN(v) ? null : v
                                }
                                return next
                              })
                            }}
                          />
                        </label>
                        <label className="ing-chip__field">
                          <span className="ing-chip__field-label">
                            {t('ingredients.unit')}
                          </span>
                          <input
                            className="field__control field__control--sm"
                            type="text"
                            value={line.unitText ?? ''}
                            placeholder={t('ingredients.unitPlaceholder')}
                            onChange={(e) => {
                              const v = e.target.value
                              setGroups((prev) => {
                                const next = structuredClone(prev)
                                next[0].ingredients[idx].unitText = v
                                next[0].ingredients[idx].unitId = undefined
                                return next
                              })
                            }}
                          />
                        </label>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="propose-box" id="ing-propose">
            <h3>{t('ingredients.propose')}</h3>
            <p className="propose-box__hint">{t('ingredients.proposeHint')}</p>
            <div className="row">
              <input
                className="field__control"
                value={proposeName}
                onChange={(e) => setProposeName(e.target.value)}
                placeholder={t('ingredients.proposePlaceholder')}
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => void proposeIngredient()}
              >
                {t('ingredients.proposeSubmit')}
              </button>
            </div>
          </div>

          <div className="studio-footer">
            <button
              type="button"
              className="btn ghost"
              onClick={() => trySelectTab('basics')}
            >
              {t('studio.back')}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={saving}
              onClick={() => void saveDraft({ advance: true })}
            >
              <ButtonLabel loading={saving} loadingText={t('studio.saving')}>
                {t('studio.saveContinue')}
              </ButtonLabel>
            </button>
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
                {idx > 0 && (
                  <button
                    type="button"
                    className="btn ghost compact"
                    onClick={() =>
                      setSteps((p) => p.filter((_, i) => i !== idx))
                    }
                  >
                    ×
                  </button>
                )}
              </div>

              <input
                className="field__control"
                placeholder={t('studio.stepTitle')}
                value={step.title ?? ''}
                onChange={(e) => updateStep(idx, { title: e.target.value })}
              />

              {step.mode === 'TEXT' ? (
                <>
                  <textarea
                    className="field__control"
                    rows={3}
                    placeholder={t('studio.instruction')}
                    value={step.instruction ?? ''}
                    onChange={(e) =>
                      updateStep(idx, { instruction: e.target.value })
                    }
                  />
                  <label className="field">
                    <span className="field__label">{t('studio.stepMedia')}</span>
                    <input
                      className="field__control field__control--file"
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
                    className="field__control"
                    value={pubQuery}
                    onChange={(e) => setPubQuery(e.target.value)}
                    placeholder={t('studio.searchSubRecipe')}
                  />
                  <ul className="ing-search-list">
                    {pubRecipes.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="ing-search-item"
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
                          {r.coverUrl ? (
                            <img src={r.coverUrl} alt="" />
                          ) : (
                            <span className="ing-fallback" />
                          )}
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
                      {t('studio.linkedVersion')}:{' '}
                      {step.childRecipeVersionId.slice(0, 8)}…
                    </p>
                  )}
                </>
              )}

              <input
                className="field__control"
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
              setSteps((p) => [
                ...p,
                { mode: 'TEXT', instruction: '', media: [] },
              ])
            }
          >
            {t('studio.addStep')}
          </button>
          <div className="studio-footer">
            <button
              type="button"
              className="btn ghost"
              onClick={() => trySelectTab('ingredients')}
            >
              {t('studio.back')}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={saving}
              onClick={() => void saveDraft({ advance: true })}
            >
              <ButtonLabel loading={saving} loadingText={t('studio.saving')}>
                {t('studio.saveContinue')}
              </ButtonLabel>
            </button>
          </div>
        </div>
      )}

      {tab === 'publish' && (
        <div className="publish-panel">
          <div className="publish-hero">
            {coverUrl && (
              <img src={coverUrl} alt="" className="publish-hero__cover" />
            )}
            <p className="publish-hero__eyebrow">{t('studio.publishReady')}</p>
            <h2>{title.trim() || t('studio.untitled')}</h2>
            <p className="muted">
              {t('studio.publishProgress', { done: readyCount, total: 3 })}
            </p>
            <div className="publish-meter" aria-hidden>
              <span style={{ width: `${(readyCount / 3) * 100}%` }} />
            </div>
          </div>

          <ul className="publish-checks">
            <li className={checks.titleOk ? 'ok' : 'pending'}>
              <span className="publish-checks__icon">
                {checks.titleOk ? '✓' : '!'}
              </span>
              <div>
                <strong>{t('studio.checkTitle')}</strong>
                <p className="muted">{title.trim() || '—'}</p>
              </div>
            </li>
            <li className={checks.ingredientsOk ? 'ok' : 'pending'}>
              <span className="publish-checks__icon">
                {checks.ingredientsOk ? '✓' : '!'}
              </span>
              <div>
                <strong>{t('studio.checkIngredients')}</strong>
                <p className="muted">
                  {t('common.ingredientsCount', {
                    count: groups[0]?.ingredients.length ?? 0,
                  })}
                </p>
              </div>
            </li>
            <li className={checks.stepsOk ? 'ok' : 'pending'}>
              <span className="publish-checks__icon">
                {checks.stepsOk ? '✓' : '!'}
              </span>
              <div>
                <strong>{t('studio.checkSteps')}</strong>
                <p className="muted">
                  {t('studio.stepCount', { count: steps.length })}
                </p>
              </div>
            </li>
          </ul>

          <div className="studio-footer">
            <button
              type="button"
              className="btn ghost"
              onClick={() => trySelectTab('steps')}
            >
              {t('studio.back')}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={
                publishing ||
                !checks.titleOk ||
                !checks.ingredientsOk ||
                !checks.stepsOk
              }
              onClick={() => void onPublish()}
            >
              <ButtonLabel
                loading={publishing}
                loadingText={t('studio.publishing')}
              >
                {editor.status === 'PUBLISHED'
                  ? t('studio.republish')
                  : t('studio.publish')}
              </ButtonLabel>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
