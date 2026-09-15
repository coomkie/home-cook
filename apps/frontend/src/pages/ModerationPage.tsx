import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, uploadFile } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ButtonLabel } from '../components/Spinner'
import { useApiErrorToast, useI18n } from '../i18n/I18nContext'
import type { CatalogIngredient } from '../types'

export function ModerationPage() {
  const { user, loading } = useAuth()
  const { t } = useI18n()
  const toastApiError = useApiErrorToast()
  const [items, setItems] = useState<CatalogIngredient[]>([])

  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [isStaple, setIsStaple] = useState(false)
  const [imageAssetId, setImageAssetId] = useState<string | undefined>()
  const [imagePreview, setImagePreview] = useState<string | undefined>()
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const canMod =
    !!user &&
    (user.roles.includes('MODERATOR') || user.roles.includes('ADMIN'))

  async function reload() {
    const rows = await api.listPendingIngredients()
    setItems(rows)
  }

  useEffect(() => {
    if (!canMod) return
    void reload().catch((e) => toastApiError(e, 'errors.generic'))
  }, [canMod, toastApiError])

  if (!loading && !user) return <Navigate to="/login" replace />
  if (!loading && user && !canMod) return <Navigate to="/studio" replace />

  async function onPickImage(file: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const asset = await uploadFile(file)
      setImageAssetId(asset.id)
      setImagePreview(asset.url)
      toast.success(t('media.uploaded'))
    } catch (e) {
      toastApiError(e, 'media.uploadFailed')
    } finally {
      setUploading(false)
    }
  }

  async function onCreateCatalog(e: FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) {
      toast.error(t('validation.displayNameMin'))
      return
    }
    setSaving(true)
    try {
      await api.createCatalogIngredient({
        name: name.trim(),
        nameEn: nameEn.trim() || undefined,
        imageAssetId,
        isStaple,
      })
      toast.success(t('moderation.catalogCreated'))
      setName('')
      setNameEn('')
      setIsStaple(false)
      setImageAssetId(undefined)
      setImagePreview(undefined)
    } catch (err) {
      toastApiError(err, 'moderation.catalogFailed')
    } finally {
      setSaving(false)
    }
  }

  async function approve(id: string) {
    try {
      await api.approveIngredient(id)
      toast.success(t('moderation.approved'))
      await reload()
    } catch (e) {
      toastApiError(e, 'errors.generic')
    }
  }

  async function reject(id: string) {
    try {
      await api.rejectIngredient(id)
      toast.success(t('moderation.rejected'))
      await reload()
    } catch (e) {
      toastApiError(e, 'errors.generic')
    }
  }

  return (
    <section>
      <Link to="/studio" className="back">
        {t('studio.backStudio')}
      </Link>
      <h1>{t('moderation.title')}</h1>
      <p className="lede">{t('moderation.lede')}</p>

      <form className="form form--wide catalog-form" onSubmit={onCreateCatalog}>
        <h2>{t('moderation.catalogTitle')}</h2>
        <p className="muted">{t('moderation.catalogHint')}</p>

        <label className="field">
          <span className="field__label">{t('moderation.nameVi')}</span>
          <input
            className="field__control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('moderation.nameViPlaceholder')}
            required
            minLength={2}
          />
        </label>

        <label className="field">
          <span className="field__label">{t('moderation.nameEn')}</span>
          <input
            className="field__control"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder={t('moderation.nameEnPlaceholder')}
          />
        </label>

        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={isStaple}
            onChange={(e) => setIsStaple(e.target.checked)}
          />
          <span>{t('moderation.isStaple')}</span>
        </label>

        <div className="cover-field">
          <span className="field__label">{t('moderation.image')}</span>
          <div className="cover-field__body">
            <div className="cover-preview cover-preview--sm">
              {imagePreview ? (
                <img src={imagePreview} alt="" />
              ) : (
                <span className="cover-preview__empty">
                  {t('moderation.imageEmpty')}
                </span>
              )}
              {uploading && (
                <span className="cover-preview__busy">{t('common.loading')}</span>
              )}
            </div>
            <div className="cover-field__actions">
              <label className="cover-field__pick btn ghost compact">
                {uploading ? t('common.loading') : t('moderation.pickImage')}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={uploading || saving}
                  onChange={(e) => {
                    void onPickImage(e.target.files?.[0] ?? null)
                    e.target.value = ''
                  }}
                />
              </label>
              {imagePreview && (
                <button
                  type="button"
                  className="btn ghost compact"
                  disabled={uploading || saving}
                  onClick={() => {
                    setImageAssetId(undefined)
                    setImagePreview(undefined)
                  }}
                >
                  {t('ingredients.remove')}
                </button>
              )}
            </div>
          </div>
        </div>

        <button type="submit" className="btn primary" disabled={saving || uploading}>
          <ButtonLabel loading={saving} loadingText={t('moderation.catalogSaving')}>
            {t('moderation.catalogSubmit')}
          </ButtonLabel>
        </button>
      </form>

      <h2 className="moderation-queue-title">{t('moderation.queueTitle')}</h2>
      {items.length === 0 ? (
        <p className="muted">{t('moderation.empty')}</p>
      ) : (
        <ul className="ing-search-list">
          {items.map((ing) => (
            <li key={ing.id} className="mod-row">
              {ing.imageUrl ? (
                <img src={ing.imageUrl} alt="" />
              ) : (
                <span className="ing-fallback" />
              )}
              <div>
                <strong>{ing.canonicalName}</strong>
                {ing.nameEn && <p className="muted">{ing.nameEn}</p>}
              </div>
              <button
                type="button"
                className="btn primary compact"
                onClick={() => void approve(ing.id)}
              >
                {t('moderation.approve')}
              </button>
              <button
                type="button"
                className="btn ghost compact"
                onClick={() => void reject(ing.id)}
              >
                {t('moderation.reject')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
