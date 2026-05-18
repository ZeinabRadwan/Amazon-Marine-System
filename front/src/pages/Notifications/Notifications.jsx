import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getStoredToken } from '../Login'
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notifications'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import { Bell, CheckCheck, RefreshCw } from 'lucide-react'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import './Notifications.css'
import NotificationRichCard from '../../components/Notifications/NotificationRichCard'
import {
  extractUnreadCountFromResponse,
  getNotificationNavigationPath,
} from '../../utils/notificationsDisplay'
import { dispatchSidebarActivityRefresh } from '../../utils/sidebarActivity'

export default function Notifications() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = getStoredToken()

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [unreadCount, setUnreadCount] = useState(null)
  const [unreadLoading, setUnreadLoading] = useState(false)
  const [markingId, setMarkingId] = useState(null)
  const [markAllSubmitting, setMarkAllSubmitting] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
  })

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listNotifications(token, { page: pagination.page, per_page: pagination.per_page })
      .then((res) => {
        const raw = res.data ?? res.notifications ?? res
        const arr = Array.isArray(raw) ? raw : (res.data && Array.isArray(res.data) ? res.data : [])
        setList(arr)
        const meta = res.meta ?? {}
        const total = Number(meta.total ?? res.total ?? arr.length) || 0
        const lastPage = Math.max(1, Number(meta.last_page ?? res.last_page) || 1)
        setPagination((p) => ({
          ...p,
          total,
          last_page: lastPage,
        }))
      })
      .catch(() => setAlert({ type: 'error', message: t('notifications.errorLoad') }))
      .finally(() => setLoading(false))
  }, [token, pagination.page, pagination.per_page, t])

  const loadUnreadCount = useCallback(() => {
    if (!token) return
    setUnreadLoading(true)
    getUnreadCount(token)
      .then((res) => {
        setUnreadCount(extractUnreadCountFromResponse(res))
      })
      .catch(() => setUnreadCount(0))
      .finally(() => setUnreadLoading(false))
  }, [token])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    loadUnreadCount()
  }, [loadUnreadCount])

  useEffect(() => {
    if (!loading) loadUnreadCount()
  }, [loading, loadUnreadCount])

  const handleMarkRead = (id) => {
    if (!token || !id) return
    setAlert(null)
    setMarkingId(id)
    markNotificationRead(token, id)
      .then(() => {
        setList((prev) =>
          prev.map((n) => (String(n.id) === String(id) ? { ...n, read_at: n.read_at || new Date().toISOString() } : n))
        )
        loadUnreadCount()
        dispatchSidebarActivityRefresh()
        window.dispatchEvent(new CustomEvent('am:notifications:changed'))
      })
      .catch((err) => setAlert({ type: 'error', message: err.message || t('notifications.errorMarkRead') }))
      .finally(() => setMarkingId(null))
  }

  const handleMarkAllRead = () => {
    if (!token) return
    setAlert(null)
    setMarkAllSubmitting(true)
    markAllNotificationsRead(token)
      .then(() => {
        setList((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
        setUnreadCount(0)
        dispatchSidebarActivityRefresh()
        window.dispatchEvent(new CustomEvent('am:notifications:changed'))
        setAlert({ type: 'success', message: t('notifications.markAllSuccess') })
      })
      .catch((err) => setAlert({ type: 'error', message: err.message || t('notifications.errorMarkAll') }))
      .finally(() => setMarkAllSubmitting(false))
  }

  const handleRefresh = () => {
    loadList()
    loadUnreadCount()
  }

  const isRead = (n) => !!n.read_at

  const handleRowActivate = (n) => {
    const read = isRead(n)
    const path = getNotificationNavigationPath(n)
    if (!read && n.id && token) {
      markNotificationRead(token, n.id)
        .then(() => {
          setList((prev) =>
            prev.map((x) => (String(x.id) === String(n.id) ? { ...x, read_at: x.read_at || new Date().toISOString() } : x))
          )
          loadUnreadCount()
        })
        .catch(() => {})
    }
    if (path) navigate(path)
  }

  return (
    <Container size="xl">
      <div className="clients-page notifications-page">
        {loading && (
          <div className="clients-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        <div className="clients-header notifications-header">
          <div className="notifications-header__left">
            <h1 className="notifications-title">
              <Bell className="notifications-title-icon" aria-hidden />
              {t('notifications.title')}
            </h1>
            {!unreadLoading && unreadCount != null && unreadCount > 0 && (
              <span className="notifications-unread-badge" aria-live="polite">
                {unreadCount} {t('notifications.unread')}
              </span>
            )}
          </div>
          <div className="notifications-header-actions">
            <button
              type="button"
              className="page-header__btn attendance-refresh-btn"
              onClick={handleRefresh}
              disabled={loading}
              aria-label={t('notifications.refresh')}
              title={t('notifications.refresh')}
            >
              <RefreshCw className="clients-filters__btn-icon-svg" size={18} aria-hidden />
              {t('notifications.refresh')}
            </button>
            {unreadCount != null && unreadCount > 0 && (
              <button
                type="button"
                className="page-header__btn page-header__btn--primary"
                onClick={handleMarkAllRead}
                disabled={markAllSubmitting}
                aria-label={t('notifications.markAllRead')}
              >
                <CheckCheck size={18} aria-hidden />
                {markAllSubmitting ? t('notifications.saving') : t('notifications.markAllRead')}
              </button>
            )}
          </div>
        </div>

        {alert && (
          <Alert
            variant={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {list.length === 0 && !loading ? (
          <div className="notifications-empty clients-filters-card">
            <Bell className="notifications-empty-icon" aria-hidden />
            <p className="notifications-empty-title">{t('notifications.emptyTitle', 'You are all caught up')}</p>
            <p className="notifications-empty-text">{t('notifications.empty')}</p>
          </div>
        ) : (
          <ul className="notifications-list" role="list" aria-label={t('notifications.title')}>
            {list.map((n) => {
              const read = isRead(n)
              const marking = markingId === n.id
              return (
                <li key={n.id} className="notifications-item-wrap" role="listitem">
                  <div
                    className={`notifications-item ${read ? 'notifications-item--read' : 'notifications-item--unread'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRowActivate(n)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleRowActivate(n)
                      }
                    }}
                  >
                    <NotificationRichCard
                      notification={n}
                      variant="page"
                      unread={!read}
                      onMarkRead={() => handleMarkRead(n.id)}
                      markingRead={marking}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {pagination.last_page > 1 && (
          <div className="notifications-pagination clients-pagination">
            <button
              type="button"
              className="clients-pagination__btn"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
              aria-label={t('notifications.previous')}
            >
              {t('notifications.previous')}
            </button>
            <span className="notifications-pagination__info">
              {t('notifications.pageOf', { current: pagination.page, total: pagination.last_page })}
            </span>
            <button
              type="button"
              className="clients-pagination__btn"
              disabled={pagination.page >= pagination.last_page || loading}
              onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.last_page, p.page + 1) }))}
              aria-label={t('notifications.next')}
            >
              {t('notifications.next')}
            </button>
          </div>
        )}
      </div>
    </Container>
  )
}
