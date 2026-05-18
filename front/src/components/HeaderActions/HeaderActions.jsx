import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe, BellRing, ChevronDown } from 'lucide-react'
import { setLanguage } from '../../i18n'
import { getStoredToken } from '../../pages/Login'
import { listNotifications, getUnreadCount, markNotificationRead, markAllNotificationsRead } from '../../api/notifications'
import ThemeToggle from '../ThemeToggle'
import { DropdownMenu } from '../DropdownMenu'
import NotificationRichCard from '../Notifications/NotificationRichCard'
import {
  extractUnreadCountFromResponse,
  getNotificationNavigationPath,
} from '../../utils/notificationsDisplay'
import { dispatchSidebarActivityRefresh } from '../../utils/sidebarActivity'
import './HeaderActions.css'

const RECENT_NOTIF_LIMIT = 8

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
  const [markAllBusy, setMarkAllBusy] = useState(false)

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
        setUnreadCount(extractUnreadCountFromResponse(res))
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

  const handleMarkAllInDropdown = () => {
    if (!token || markAllBusy) return
    setMarkAllBusy(true)
    markAllNotificationsRead(token)
      .then(() => {
        setRecentNotifications((prev) => prev.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })))
        setUnreadCount(0)
        dispatchSidebarActivityRefresh()
        window.dispatchEvent(new CustomEvent('am:notifications:changed'))
      })
      .catch(() => {})
      .finally(() => setMarkAllBusy(false))
  }

  const handleNotificationClick = (n) => {
    const read = !!(n.read_at)
    if (!read && n.id && token) {
      markNotificationRead(token, n.id).then(() => {
        setRecentNotifications((prev) =>
          prev.map((item) => (String(item.id) === String(n.id) ? { ...item, read_at: item.read_at || new Date().toISOString() } : item))
        )
        loadUnreadCount()
        dispatchSidebarActivityRefresh()
        window.dispatchEvent(new CustomEvent('am:notifications:changed'))
      })
    }
    setNotifOpen(false)
    const path = getNotificationNavigationPath(n)
    navigate(path || '/notifications')
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
                <div className="header-actions__dropdown-header-actions">
                  {(unreadCount ?? 0) > 0 ? (
                    <button
                      type="button"
                      className="header-actions__dropdown-mark-all"
                      onClick={handleMarkAllInDropdown}
                      disabled={markAllBusy}
                    >
                      {markAllBusy ? t('notifications.saving') : t('notifications.markAllReadShort', 'Mark all read')}
                    </button>
                  ) : null}
                  <Link
                    to="/notifications"
                    className="header-actions__dropdown-view-all"
                    onClick={() => setNotifOpen(false)}
                  >
                    {t('topNav.viewAllNotifications')}
                  </Link>
                </div>
              </div>
              <div className="header-actions__dropdown-body">
                {notifLoading ? (
                  <p className="header-actions__dropdown-empty">{t('notifications.loading')}</p>
                ) : recentNotifications.length === 0 ? (
                  <div className="header-actions__dropdown-empty-block" role="status">
                    <BellRing className="header-actions__dropdown-empty-icon" aria-hidden />
                    <p className="header-actions__dropdown-empty-title">{t('notifications.emptyTitle', 'You are all caught up')}</p>
                    <p className="header-actions__dropdown-empty">{t('topNav.noNotifications')}</p>
                  </div>
                ) : (
                  <ul className="header-actions__dropdown-list">
                    {recentNotifications.map((n) => (
                      <li key={n.id}>
                        <button
                          type="button"
                          className={`header-actions__dropdown-item ${!(n.read_at) ? 'header-actions__dropdown-item--unread' : ''}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <NotificationRichCard
                            notification={n}
                            variant="dropdown"
                            compact
                            unread={!n.read_at}
                          />
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
