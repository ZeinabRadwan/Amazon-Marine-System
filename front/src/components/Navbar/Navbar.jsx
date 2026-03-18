import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Search, Menu } from 'lucide-react'
import HeaderActions from '../HeaderActions'
import './Navbar.css'

const NAVBAR_HEIGHT = 64

/**
 * Navbar: page title + breadcrumbs, search. Notifications, theme toggle, language are in HeaderActions.
 * On desktop HeaderActions show here; on mobile they are hidden here and shown in Sidebar only.
 * On mobile when sidebar is collapsed, shows an "open sidebar" button.
 */
export default function Navbar({
  alertsCount = 0,
  className = '',
  pageTitle = '',
  pageBreadcrumbs = [],
  sidebarCollapsed = false,
  onOpenSidebar,
}) {
  const { t } = useTranslation()

  return (
    <header
      className={`navbar ${sidebarCollapsed ? 'navbar--sidebar-collapsed' : ''} ${className}`.trim()}
      style={{ minHeight: NAVBAR_HEIGHT }}
      role="banner"
    >
      {/* Left: open sidebar (mobile when collapsed) + page title + breadcrumbs */}
      <div className="navbar__left">
        <button
          type="button"
          className="navbar__open-sidebar"
          onClick={onOpenSidebar}
          aria-label={t('sidebar.expand')}
          title={t('sidebar.expand')}
        >
          <Menu className="navbar__open-sidebar-icon" aria-hidden />
        </button>
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

      {/* Right: actions (hidden on mobile – shown in Sidebar instead) */}
      <HeaderActions
        variant="navbar"
        className="navbar__actions navbar__actions--desktop"
        alertsCount={alertsCount}
      />
    </header>
  )
}
