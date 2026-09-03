import { useI18n } from '../i18n/I18nContext'
import type { AppLocale } from '@app/shared/i18n/translate'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  function select(next: AppLocale) {
    if (next !== locale) setLocale(next)
  }

  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')}>
      <button
        type="button"
        className={locale === 'vi' ? 'lang-switch__btn active' : 'lang-switch__btn'}
        onClick={() => select('vi')}
        aria-pressed={locale === 'vi'}
      >
        {t('lang.vi')}
      </button>
      <button
        type="button"
        className={locale === 'en' ? 'lang-switch__btn active' : 'lang-switch__btn'}
        onClick={() => select('en')}
        aria-pressed={locale === 'en'}
      >
        {t('lang.en')}
      </button>
    </div>
  )
}
