import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe, BellRing, ChevronDown } from 'lucide-react'
import { setLanguage } from '../../i18n'
import { getStoredToken } from '../../pages/Login'
import { listNotifications, getUnreadCount, markNotificationRead } from '../../api/notifications'
import ThemeToggle from '../ThemeToggle'
import { DropdownMenu } from '../DropdownMenu'
import './HeaderActions.css'

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
 * Notifications + theme toggle + language dropdown.
 * Used in Navbar (desktop) and Sidebar (mobile only).
 * variant: 'navbar' | 'sidebar' for layout/styling.
 */
export default function HeaderActions({ variant = 'navbar', className = '', alertsCount = 0 }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const token = getStoredToken()
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
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
  const isSidebar = variant === 'sidebar'

  return (
    <div className={`header-actions header-actions--${variant} ${className}`.trim()} role="group" aria-label={t('pageHeader.actions')}>
      <div className="header-actions__group">
        <div className="header-actions__notif-wrap" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen((o) => !o)}
            className="header-actions__btn header-actions__btn--icon"
            aria-expanded={notifOpen}
            aria-haspopup="true"
            aria-label={t('topNav.notifications')}
          >
            <BellRing className="header-actions__btn-icon" aria-hidden />
            {badgeCount > 0 && (
              <span className="header-actions__badge" aria-hidden>
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div
              className="header-actions__dropdown"
              role="dialog"
              aria-label={t('topNav.recentNotifications')}
            >
              <div className="header-actions__dropdown-header">
                <h3 className="header-actions__dropdown-title">{t('topNav.recentNotifications')}</h3>
                <Link
                  to="/notifications"
                  className="header-actions__dropdown-view-all"
                  onClick={() => setNotifOpen(false)}
                >
                  {t('topNav.viewAllNotifications')}
                </Link>
              </div>
              <div className="header-actions__dropdown-body">
                {notifLoading ? (
                  <p className="header-actions__dropdown-empty">{t('notifications.loading')}</p>
                ) : recentNotifications.length === 0 ? (
                  <p className="header-actions__dropdown-empty">{t('topNav.noNotifications')}</p>
                ) : (
                  <ul className="header-actions__dropdown-list">
                    {recentNotifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`header-actions__dropdown-item ${!(n.read_at) ? 'header-actions__dropdown-item--unread' : ''}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <span className="header-actions__dropdown-item-title">
                            {n.title ?? n.message ?? t('notifications.noTitle')}
                          </span>
                          {(n.body ?? n.message) && (n.body !== (n.title ?? n.message)) && (
                            <span className="header-actions__dropdown-item-body">
                              {typeof n.body === 'string' && n.body.length > 80 ? `${n.body.slice(0, 80)}…` : n.body}
                            </span>
                          )}
                          <span className="header-actions__dropdown-item-time">
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

        <ThemeToggle className={`header-actions__btn header-actions__btn--icon theme-toggle-app ${isSidebar ? 'header-actions__theme-toggle' : ''}`} />

        <DropdownMenu
          align={isSidebar ? 'start' : 'end'}
          trigger={({ isOpen, getTriggerProps }) => (
            <button
              type="button"
              {...getTriggerProps()}
              className={`header-actions__btn ${isSidebar ? 'header-actions__btn--full' : 'header-actions__btn--with-label'}`}
              aria-label={t('common.language')}
            >
              <Globe className="header-actions__btn-icon" aria-hidden />
              <span className="header-actions__btn-label">{currentLangLabel}</span>
              <ChevronDown
                className={`header-actions__btn-chevron ${isOpen ? 'header-actions__btn-chevron--open' : ''}`}
                aria-hidden
              />
            </button>
          )}
          items={[
            { label: t('common.english'), onClick: () => setLanguage('en'), selected: i18n.language === 'en' },
            { label: t('common.arabic'), onClick: () => setLanguage('ar'), selected: i18n.language === 'ar' },
          ]}
        />
      </div>
    </div>
  )
}
