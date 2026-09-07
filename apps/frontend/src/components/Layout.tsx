import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useI18n } from '../i18n/I18nContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Spinner } from './Spinner'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined
}

export function Layout() {
  const { user, loading } = useAuth()
  const { t } = useI18n()

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          {t('common.brand')}
        </NavLink>

        <nav className="nav nav--desktop" aria-label={t('nav.main')}>
          <NavLink to="/" end className={navClass}>
            {t('nav.recipes')}
          </NavLink>
          <NavLink to="/explore" className={navClass}>
            {t('nav.explore')}
          </NavLink>
          <NavLink to="/studio" className={navClass}>
            {t('nav.studio')}
          </NavLink>
        </nav>

        <div className="auth-bar">
          <LanguageSwitcher />
          {loading ? (
            <Spinner size="sm" label={t('nav.checkingSession')} />
          ) : user ? (
            <NavLink to="/profile" className="auth-chip" title={user.displayName}>
              <span className="avatar" aria-hidden>
                {user.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="auth-chip__name">{user.displayName}</span>
            </NavLink>
          ) : (
            <>
              <NavLink to="/login" className="btn ghost compact">
                {t('nav.login')}
              </NavLink>
            </>
          )}
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>

      <nav className="tabbar" aria-label={t('nav.mobile')}>
        <NavLink to="/" end className={navClass}>
          <svg className="tabbar__icon" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            />
          </svg>
          <span>{t('nav.recipes')}</span>
        </NavLink>
        <NavLink to="/explore" className={navClass}>
          <svg className="tabbar__icon" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm1.2 4.2-1.7 5.3-5.3 1.7 5.3 1.7 1.7 5.3 1.7-5.3 5.3-1.7-5.3-1.7-1.7-5.3Z"
            />
          </svg>
          <span>{t('nav.explore')}</span>
        </NavLink>
        <NavLink
          to="/studio"
          className={({ isActive }) =>
            isActive ? 'active tabbar__add' : 'tabbar__add'
          }
        >
          <span className="tabbar__add-btn" aria-hidden>
            +
          </span>
          <span>{t('nav.add')}</span>
        </NavLink>
        <NavLink to="/studio" className={navClass}>
          <svg className="tabbar__icon" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M4 19.5V17l9.4-9.4 2.5 2.5L6.5 19.5H4Zm14.7-9.8-2.4-2.4 1.4-1.4a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-1.4 1.4Z"
            />
          </svg>
          <span>{t('nav.studio')}</span>
        </NavLink>
        <NavLink to={user ? '/profile' : '/login'} className={navClass}>
          <svg className="tabbar__icon" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="currentColor"
              d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4.5V20h14v-1.5C19 16 16 14 12 14Z"
            />
          </svg>
          <span>{user ? t('nav.me') : t('nav.enter')}</span>
        </NavLink>
      </nav>
    </div>
  )
}
