import { useI18n } from '../i18n/I18nContext'

export function ExplorePage() {
  const { t } = useI18n()
  return (
    <section>
      <h1>{t('explore.title')}</h1>
      <div className="banner ok">{t('explore.ready')}</div>
    </section>
  )
}
