import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Search, Globe, BellRing, ChevronDown } from 'lucide-react'
import { setLanguage } from '../../i18n'
import ThemeToggle from '../ThemeToggle'
import { DropdownMenu } from '../DropdownMenu'
import './Navbar.css'

const NAVBAR_HEIGHT = 64

/**
 * Reusable Navbar for Amazon Marine dashboard. Works with the existing left sidebar layout.
 * Order (left to right): Page title + breadcrumbs → Global Search → Mode Toggle → Localization → Notifications.
 * Light: #FFFFFF bg, #E6EAF2 border. Dark: #111827 bg, #1F2937 border.
 */
export default function Navbar({
  alertsCount = 0,
  className = '',
  pageTitle = '',
  pageBreadcrumbs = [],
}) {
  const { t, i18n } = useTranslation()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLangLabel = i18n.language === 'ar' ? t('common.arabic') : t('common.english')

  return (
    <header
      className={`navbar ${className}`}
      style={{ minHeight: NAVBAR_HEIGHT }}
      role="banner"
    >
      {/* Left: page title + breadcrumbs */}
      <div className="navbar__left">
        {(pageTitle || (pageBreadcrumbs?.length > 0)) && (
          <div className="navbar__page-header">
                        {pageTitle && <h1 className="navbar__title">{pageTitle}</h1>}

            {pageBreadcrumbs?.length > 0 && (
              <nav className="navbar__breadcrumb" aria-label="Breadcrumb">
                <ol className="navbar__breadcrumb-list">
                  {pageBreadcrumbs.map((item, index) => {
                    const isLast = index === pageBreadcrumbs.length - 1
                    return (
                      <li key={index} className="navbar__breadcrumb-item">
                        {index > 0 && (
                          <span className="navbar__breadcrumb-sep" aria-hidden>/</span>
                        )}
                        {isLast || !item.href ? (
                          <span className="navbar__breadcrumb-current" aria-current={isLast ? 'page' : undefined}>
                            {item.label}
                          </span>
                        ) : (
                          <Link to={item.href} className="navbar__breadcrumb-link">
                            {item.label}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </nav>
            )}
          </div>
        )}
      </div>

      {/* Center: search */}
      <div className="navbar__search-wrap">
        <div className="navbar__search">
          <Search className="navbar__search-icon" aria-hidden />
          <input
            type="search"
            placeholder={t('topNav.searchPlaceholder')}
            className="navbar__search-input"
            aria-label={t('topNav.searchPlaceholder')}
          />
        </div>
      </div>

      {/* Right: actions */}
      <div className="navbar__actions">
        <div className="navbar__action-group">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((o) => !o)}
              className="navbar__btn navbar__btn--icon"
              aria-expanded={notifOpen}
              aria-haspopup="true"
              aria-label={t('topNav.notifications')}
            >
              <BellRing className="navbar__btn-icon" aria-hidden />
              {alertsCount > 0 && (
                <span className="navbar__badge" aria-hidden>
                  {alertsCount > 99 ? '99+' : alertsCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div
                className="navbar__dropdown"
                role="dialog"
                aria-label={t('topNav.recentNotifications')}
              >
                <div className="navbar__dropdown-header">
                  <h3 className="navbar__dropdown-title">{t('topNav.recentNotifications')}</h3>
                </div>
                <div className="navbar__dropdown-body">
                  {alertsCount === 0 ? (
                    <p className="navbar__dropdown-empty">{t('topNav.noNotifications')}</p>
                  ) : (
                    <ul className="navbar__dropdown-list">
                      {Array.from({ length: Math.min(alertsCount, 5) }, (_, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            className="navbar__dropdown-item"
                          >
                            <span className="font-medium">
                              {t('topNav.notifications')} #{i + 1}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <ThemeToggle className="navbar__btn navbar__btn--icon theme-toggle-app" />

          <DropdownMenu
            align="end"
            trigger={({ isOpen, getTriggerProps }) => (
              <button
                type="button"
                {...getTriggerProps()}
                className="navbar__btn navbar__btn--with-label"
                aria-label={t('common.language')}
              >
                <Globe className="navbar__btn-icon" aria-hidden />
                <span className="navbar__btn-label">{currentLangLabel}</span>
                <ChevronDown
                  className={`navbar__btn-chevron ${isOpen ? 'navbar__btn-chevron--open' : ''}`}
                  aria-hidden
                />
              </button>
            )}
            items={[
              {
                label: t('common.english'),
                onClick: () => setLanguage('en'),
                selected: i18n.language === 'en',
              },
              {
                label: t('common.arabic'),
                onClick: () => setLanguage('ar'),
                selected: i18n.language === 'ar',
              },
            ]}
          />
        </div>
      </div>
    </header>
  )
}
