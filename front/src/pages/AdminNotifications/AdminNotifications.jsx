import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import { listAdminNotifications, getAdminNotificationStats } from '../../api/adminNotifications'
import { Container } from '../../components/Container'
import { StatsCard } from '../../components/StatsCard'
import Table from '../../components/Table/Table'
import Pagination from '../../components/Pagination'
import Alert from '../../components/Alert'
import LoaderDots from '../../components/LoaderDots'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import './AdminNotifications.css'

function todayYmd() {
  return new Date().toISOString().slice(0, 10)
}

function startOfMonthYmd() {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default function AdminNotifications() {
  const { t } = useTranslation()
  const token = getStoredToken()

  const [filters, setFilters] = useState({
    from: startOfMonthYmd(),
    to: todayYmd(),
    event_key: '',
    channel: '',
    status: '',
    page: 1,
    per_page: 25,
  })

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [alert, setAlert] = useState(null)
  const [detail, setDetail] = useState(null)

  const listParams = useMemo(
    () => ({
      from: filters.from || undefined,
      to: filters.to || undefined,
      event_key: filters.event_key || undefined,
      channel: filters.channel || undefined,
      status: filters.status || undefined,
      page: filters.page,
      per_page: filters.per_page,
    }),
    [filters]
  )

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listAdminNotifications(token, listParams)
      .then((res) => {
        const data = res.data ?? []
        setRows(Array.isArray(data) ? data : [])
        const m = res.meta ?? {}
        setMeta({
          current_page: m.current_page ?? 1,
          last_page: Math.max(1, m.last_page ?? 1),
          per_page: m.per_page ?? filters.per_page,
          total: m.total ?? 0,
        })
      })
      .catch((err) => {
        setRows([])
        setAlert({ type: 'error', message: err.message || t('notificationsAdmin.errorLoad', 'Failed to load notification logs.') })
      })
      .finally(() => setLoading(false))
  }, [token, listParams, filters.per_page, t])

  const loadStats = useCallback(() => {
    if (!token) return
    setStatsLoading(true)
    getAdminNotificationStats(token, { from: filters.from || undefined, to: filters.to || undefined })
      .then((res) => setStats(res.data ?? res))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [token, filters.from, filters.to])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const pageLoading = loading || statsLoading

  const handleRefresh = () => {
    loadList()
    loadStats()
  }

  const columns = useMemo(
    () => [
      {
        key: 'created_at',
        label: t('notificationsAdmin.fields.created_at', 'Time'),
        sortable: false,
        render: (v) => (v ? new Date(v).toLocaleString() : '—'),
      },
      {
        key: 'event_key',
        label: t('notificationsAdmin.fields.event_key', 'Event'),
        sortable: false,
      },
      {
        key: 'channel',
        label: t('notificationsAdmin.fields.channel', 'Channel'),
        sortable: false,
      },
      {
        key: 'status',
        label: t('notificationsAdmin.fields.status', 'Status'),
        sortable: false,
      },
      {
        key: 'recipient_name',
        label: t('notificationsAdmin.fields.recipient', 'Recipient'),
        sortable: false,
        render: (_, row) => row.recipient_name || row.recipient_id || '—',
      },
      {
        key: 'causer_name',
        label: t('notificationsAdmin.fields.causer', 'Triggered by'),
        sortable: false,
        render: (_, row) => row.causer_name || row.causer_id || '—',
      },
      {
        key: 'entity',
        label: t('notificationsAdmin.fields.entity', 'Entity'),
        sortable: false,
        render: (_, row) =>
          row.notifiable_type && row.notifiable_id ? `${row.notifiable_type} #${row.notifiable_id}` : '—',
      },
      {
        key: 'actions',
        label: t('notificationsAdmin.fields.actions', 'Actions'),
        sortable: false,
        render: (_, row) => (
          <button
            type="button"
            className="page-header__btn page-header__btn--ghost"
            onClick={() => setDetail(row)}
          >
            {t('notificationsAdmin.view', 'View')}
          </button>
        ),
      },
    ],
    [t]
  )

  return (
    <Container size="xl">
      <div className="clients-page admin-notifications-page">
        {pageLoading && (
          <div className="clients-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        <div className="clients-filters-card admin-notifications-filters">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__fields admin-notifications-filters__fields">
              <input
                type="date"
                className="clients-input"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
                aria-label={t('notificationsAdmin.from', 'From')}
              />
              <input
                type="date"
                className="clients-input"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
                aria-label={t('notificationsAdmin.to', 'To')}
              />
              <input
                type="text"
                className="clients-input"
                placeholder={t('notificationsAdmin.eventPlaceholder', 'Event key (e.g. sd_form.sent_to_operations)')}
                value={filters.event_key}
                onChange={(e) => setFilters((f) => ({ ...f, event_key: e.target.value, page: 1 }))}
              />
              <select
                className="clients-input"
                value={filters.channel}
                onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value, page: 1 }))}
                aria-label={t('notificationsAdmin.channel', 'Channel')}
              >
                <option value="">{t('notificationsAdmin.channelAll', 'All channels')}</option>
                <option value="database">In-app</option>
                <option value="email">Email</option>
              </select>
              <select
                className="clients-input"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                aria-label={t('notificationsAdmin.status', 'Status')}
              >
                <option value="">{t('notificationsAdmin.statusAll', 'All statuses')}</option>
                <option value="pending">{t('notificationsAdmin.statusPending', 'Pending')}</option>
                <option value="sent">{t('notificationsAdmin.statusSent', 'Sent')}</option>
                <option value="failed">{t('notificationsAdmin.statusFailed', 'Failed')}</option>
              </select>
            </div>
            <div className="clients-filters__actions">
              <button
                type="button"
                className="page-header__btn"
                onClick={() =>
                  setFilters((f) => ({
                    ...f,
                    from: startOfMonthYmd(),
                    to: todayYmd(),
                    event_key: '',
                    channel: '',
                    status: '',
                    page: 1,
                  }))
                }
              >
                {t('notificationsAdmin.clear', 'Clear')}
              </button>
              <button
                type="button"
                className="page-header__btn page-header__btn--primary"
                onClick={handleRefresh}
              >
                {t('pageHeader.refresh')}
              </button>
            </div>
          </div>
        </div>

        {stats && (
          <div className="clients-stats-grid admin-notifications-stats">
            <StatsCard
              title={t('notificationsAdmin.stats.total', 'Total notifications')}
              value={stats.total ?? 0}
              variant="blue"
            />
            <StatsCard
              title={t('notificationsAdmin.stats.sent', 'Sent')}
              value={(stats.by_status || []).find((x) => x.status === 'sent')?.count ?? 0}
              variant="green"
            />
            <StatsCard
              title={t('notificationsAdmin.stats.failed', 'Failed')}
              value={(stats.by_status || []).find((x) => x.status === 'failed')?.count ?? 0}
              variant="red"
            />
          </div>
        )}

        {alert && (
          <Alert
            variant={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {rows.length === 0 && !loading ? (
          <p className="clients-empty">{t('notificationsAdmin.empty', 'No notification logs yet.')}</p>
        ) : (
          <Table
            columns={columns}
            data={rows}
            getRowKey={(row) => row.id}
            emptyMessage={t('notificationsAdmin.empty', 'No notification logs yet.')}
          />
        )}

        {rows.length > 0 && meta.total > 0 && (
          <div className="clients-pagination">
            <div className="clients-pagination__left">
              <span className="clients-pagination__total">
                {t('notificationsAdmin.total', 'Total')}: {meta.total}
              </span>
              <label className="clients-pagination__per-page">
                <span className="clients-pagination__per-page-label">
                  {t('notificationsAdmin.perPage', 'Per page')}
                </span>
                <select
                  value={filters.per_page}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))
                  }
                  className="clients-select clients-pagination__select"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <Pagination
              currentPage={meta.current_page}
              totalPages={Math.max(1, meta.last_page)}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </div>
        )}

        {detail && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => setDetail(null)} />
            <div className="clients-modal-content admin-notifications-detail">
              <h2>{t('notificationsAdmin.detailTitle', 'Notification log')}</h2>
              <dl className="admin-notifications-detail__list">
                <div>
                  <dt>{t('notificationsAdmin.fields.event_key', 'Event')}</dt>
                  <dd>{detail.event_key}</dd>
                </div>
                <div>
                  <dt>{t('notificationsAdmin.fields.channel', 'Channel')}</dt>
                  <dd>{detail.channel}</dd>
                </div>
                <div>
                  <dt>{t('notificationsAdmin.fields.status', 'Status')}</dt>
                  <dd>{detail.status}</dd>
                </div>
                <div>
                  <dt>{t('notificationsAdmin.fields.recipient', 'Recipient')}</dt>
                  <dd>{detail.recipient_name || detail.recipient_id || '—'}</dd>
                </div>
                <div>
                  <dt>{t('notificationsAdmin.fields.causer', 'Triggered by')}</dt>
                  <dd>{detail.causer_name || detail.causer_id || '—'}</dd>
                </div>
                <div>
                  <dt>{t('notificationsAdmin.fields.entity', 'Entity')}</dt>
                  <dd>
                    {detail.notifiable_type && detail.notifiable_id
                      ? `${detail.notifiable_type} #${detail.notifiable_id}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>{t('notificationsAdmin.fields.created_at', 'Time')}</dt>
                  <dd>{detail.created_at ? new Date(detail.created_at).toLocaleString() : '—'}</dd>
                </div>
                <div>
                  <dt>{t('notificationsAdmin.fields.sent_at', 'Sent at')}</dt>
                  <dd>{detail.sent_at ? new Date(detail.sent_at).toLocaleString() : '—'}</dd>
                </div>
                <div>
                  <dt>{t('notificationsAdmin.fields.error_message', 'Error')}</dt>
                  <dd>{detail.error_message || '—'}</dd>
                </div>
                <div className="admin-notifications-detail__payload">
                  <dt>{t('notificationsAdmin.fields.payload', 'Payload')}</dt>
                  <dd>
                    <pre>
                      {JSON.stringify(detail.payload ?? {}, null, 2)}
                    </pre>
                  </dd>
                </div>
              </dl>
              <div className="clients-modal-actions">
                <button
                  type="button"
                  className="clients-btn"
                  onClick={() => setDetail(null)}
                >
                  {t('notificationsAdmin.close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

