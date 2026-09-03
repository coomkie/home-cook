import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nContext'

export function ChefsPage() {
  const { t } = useI18n()
  return (
    <section>
      <h1>{t('chefs.title')}</h1>
      <div className="banner ok">
        <Link to="/register">{t('nav.register')}</Link> · {t('chefs.hint')}
      </div>
    </section>
  )
}
