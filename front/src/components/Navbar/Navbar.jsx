import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Globe, BellRing, ChevronDown } from 'lucide-react'
import { setLanguage } from '../../i18n'
import { getStoredToken } from '../../pages/Login'
import { listNotifications, getUnreadCount, markNotificationRead } from '../../api/notifications'
import ThemeToggle from '../ThemeToggle'
import { DropdownMenu } from '../DropdownMenu'
import './Navbar.css'

const NAVBAR_HEIGHT = 64
const RECENT_NOTIF_LIMIT = 5

function formatNotificationTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString(undefined, { dateStyle: 'short' })
  } catch {
    return iso
  }
}

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
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const token = getStoredToken()

  const [recentNotifications, setRecentNotifications] = useState([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(null)

  const loadNotifications = useCallback(() => {
    if (!token) return
    setNotifLoading(true)
    listNotifications(token, { page: 1, per_page: RECENT_NOTIF_LIMIT })
      .then((res) => {
        const raw = res.data ?? res.notifications ?? res
        const arr = Array.isArray(raw) ? raw : (res.data && Array.isArray(res.data) ? res.data : [])
        setRecentNotifications(arr)
      })
      .catch(() => setRecentNotifications([]))
      .finally(() => setNotifLoading(false))
  }, [token])

  const loadUnreadCount = useCallback(() => {
    if (!token) return
    getUnreadCount(token)
      .then((res) => {
        const count = res.unread_count ?? res.count ?? res.data?.unread_count ?? res.data?.count ?? 0
        setUnreadCount(Number(count))
      })
      .catch(() => setUnreadCount(0))
  }, [token])

  useEffect(() => {
    if (!token) return
    loadUnreadCount()
  }, [token, loadUnreadCount])

  useEffect(() => {
    if (notifOpen && token) {
      loadNotifications()
      loadUnreadCount()
    }
  }, [notifOpen, token, loadNotifications, loadUnreadCount])

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = (n) => {
    const read = !!(n.read_at)
    if (!read && n.id && token) {
      markNotificationRead(token, n.id).then(() => {
        setRecentNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read_at: item.read_at || new Date().toISOString() } : item))
        )
        loadUnreadCount()
      })
    }
    setNotifOpen(false)
    navigate('/notifications')
  }

  const badgeCount = unreadCount !== null ? unreadCount : alertsCount

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
              {badgeCount > 0 && (
                <span className="navbar__badge" aria-hidden>
                  {badgeCount > 99 ? '99+' : badgeCount}
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
                  <Link
                    to="/notifications"
                    className="navbar__dropdown-view-all"
                    onClick={() => setNotifOpen(false)}
                  >
                    {t('topNav.viewAllNotifications')}
                  </Link>
                </div>
                <div className="navbar__dropdown-body">
                  {notifLoading ? (
                    <p className="navbar__dropdown-empty">{t('notifications.loading')}</p>
                  ) : recentNotifications.length === 0 ? (
                    <p className="navbar__dropdown-empty">{t('topNav.noNotifications')}</p>
                  ) : (
                    <ul className="navbar__dropdown-list">
                      {recentNotifications.map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            className={`navbar__dropdown-item ${!(n.read_at) ? 'navbar__dropdown-item--unread' : ''}`}
                            onClick={() => handleNotificationClick(n)}
                          >
                            <span className="navbar__dropdown-item-title">
                              {n.title ?? n.message ?? t('notifications.noTitle')}
                            </span>
                            {(n.body ?? n.message) && (n.body !== (n.title ?? n.message)) && (
                              <span className="navbar__dropdown-item-body">
                                {typeof n.body === 'string' && n.body.length > 80 ? `${n.body.slice(0, 80)}…` : n.body}
                              </span>
                            )}
                            <span className="navbar__dropdown-item-time">
                              {formatNotificationTime(n.created_at)}
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
