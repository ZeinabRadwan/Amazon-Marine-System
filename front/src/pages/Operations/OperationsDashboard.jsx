import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CalendarClock, CalendarDays, Check, Ship } from 'lucide-react'
import { getStoredToken } from '../Login'
import { getOperationsDashboard } from '../../api/dashboard'
import { bulkUpdateShipmentTasks } from '../../api/shipments'
import { StatsCard } from '../../components/StatsCard'
import LoaderDots from '../../components/LoaderDots'
import { formatDate } from '../../utils/dateUtils'
import '../Clients/Clients.css'
import './OperationsDashboard.css'
import '../Shipments/ShipmentsOperationsDashboard.css'
import '../Shipments/Shipments.css'
import {
  getTaskDisplayStatus,
  isTaskCompleted,
  priorityBadgeClass,
  taskStatusBadgeClass,
} from '../Shipments/shipmentOperationTaskUi'

const UPCOMING_OPTIONS = ['tomorrow', '3_days', 'week', 'month']

const SECTION_ACCENT = {
  overdue: 'ops-dash__row-accent--red',
  today: 'ops-dash__row-accent--amber',
  upcoming: 'ops-dash__row-accent--green',
}

function clientCompanyLine(row) {
  const company = (row.client_company_name || '').trim()
  const name = (row.client_name || '').trim()
  if (company && name && company !== name) return { primary: company, secondary: name }
  if (company) return { primary: company, secondary: null }
  if (name) return { primary: name, secondary: null }
  return { primary: null, secondary: null }
}

function taskPayloadForComplete(row) {
  return {
    id: row.id,
    name: row.name,
    sort_order: row.sort_order ?? 1,
    status: 'completed',
    completed_at: new Date().toISOString(),
    priority: row.priority || 'medium',
    due_date: row.due_date || null,
    execution_at: row.execution_at || null,
    assigned_to_id: row.assigned_to_id ?? row.assigned_to?.id ?? null,
    reminder_at: null,
    reminder_before_value: null,
    reminder_before_unit: null,
  }
}

function TaskList({ title, rows, emptyLabel, sectionKey, t, i18nLanguage, token, onTaskCompleted }) {
  const navigate = useNavigate()
  const [completingIds, setCompletingIds] = useState(() => new Set())
  const accentClass = SECTION_ACCENT[sectionKey] || 'ops-dash__row-accent--gray'

  const goToShipment = useCallback(
    (shipmentId) => {
      const n = Number(shipmentId)
      if (!Number.isFinite(n) || n <= 0) return
      navigate({ pathname: '/shipments', search: `?shipment_id=${encodeURIComponent(String(n))}` })
    },
    [navigate],
  )

  const handleMarkComplete = useCallback(
    async (row, e) => {
      e?.stopPropagation?.()
      if (!token || isTaskCompleted(row) || completingIds.has(row.id)) return
      const sid = Number(row.shipment_id)
      if (!Number.isFinite(sid) || sid <= 0) return

      setCompletingIds((prev) => new Set(prev).add(row.id))
      try {
        await bulkUpdateShipmentTasks(token, sid, [taskPayloadForComplete(row)])
        onTaskCompleted?.()
        window.dispatchEvent(new CustomEvent('am:dashboard:refresh'))
      } catch {
        /* reload on next refresh tick */
      } finally {
        setCompletingIds((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [token, onTaskCompleted],
  )

  return (
    <section className="ops-dash-task-section rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-sm overflow-hidden mb-8">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-slate-50/90 dark:bg-slate-900/40">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">{emptyLabel}</p>
      ) : (
        <div className="ops-dash__task-list p-2 sm:p-3">
          {rows.map((row) => {
            const sid = Number(row.shipment_id)
            const canNav = Number.isFinite(sid) && sid > 0
            const completed = isTaskCompleted(row)
            const displayStatus = getTaskDisplayStatus(row)
            const pri = row.priority || 'medium'
            const clientLines = clientCompanyLine(row)
            const isCompleting = completingIds.has(row.id)

            return (
              <div
                key={row.id}
                className={`ops-dash__ship-row ops-dash__task-row${completed ? ' ops-dash__task-row--done' : ''}`}
                role={canNav ? 'button' : undefined}
                tabIndex={canNav ? 0 : undefined}
                onClick={() => {
                  if (canNav) goToShipment(sid)
                }}
                onKeyDown={(e) => {
                  if (!canNav) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    goToShipment(sid)
                  }
                }}
              >
                <div className={`ops-dash__row-accent ${accentClass}`} aria-hidden />
                <div className="ops-dash__task-row-inner">
                  <div
                    className="ops-dash__task-check"
                    data-table-row-ignore
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      className="shipment-op-task-checkbox"
                      checked={completed}
                      disabled={completed || isCompleting || !token}
                      onChange={(e) => handleMarkComplete(row, e)}
                      aria-label={t('shipments.ops.markComplete')}
                    />
                    <button
                      type="button"
                      className="shipment-op-task-icon-btn"
                      disabled={completed || isCompleting || !token}
                      onClick={(e) => handleMarkComplete(row, e)}
                      aria-label={t('shipments.ops.markComplete')}
                      title={t('shipments.ops.markComplete')}
                    >
                      {isCompleting ? (
                        <LoaderDots size={8} />
                      ) : (
                        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                      )}
                    </button>
                  </div>

                  <div className="ops-dash__col ops-dash__col--task">
                    <div className="ops-dash__task-name">{row.name}</div>
                    {clientLines.primary ? (
                      <div className="ops-dash__client-name">{clientLines.primary}</div>
                    ) : null}
                    {clientLines.secondary ? (
                      <div className="ops-dash__bl-ref">{clientLines.secondary}</div>
                    ) : null}
                  </div>

                  <div className="ops-dash__col">
                    <span className="ops-dash__date-label">{t('operationsDashboard.colShipment')}</span>
                    <span
                      className={
                        canNav
                          ? 'ops-dash__bl-ref font-semibold text-sky-700 dark:text-sky-400'
                          : 'ops-dash__bl-ref'
                      }
                    >
                      {row.shipment_ref}
                    </span>
                  </div>

                  <div className="ops-dash__col">
                    <span className="ops-dash__date-label">{t('operationsDashboard.colDue')}</span>
                    <span className="ops-dash__date-val ops-dash__date-val--gray">
                      {row.due_date ? formatDate(row.due_date, { locale: i18nLanguage }) : '—'}
                    </span>
                  </div>

                  <div className="ops-dash__col">
                    <span className="ops-dash__date-label">{t('operationsDashboard.colPriority')}</span>
                    <span className={priorityBadgeClass(pri)}>
                      {t(`shipments.ops.taskPriority.${pri}`, { defaultValue: pri })}
                    </span>
                  </div>

                  <div className="ops-dash__col">
                    <span className="ops-dash__date-label">{t('operationsDashboard.colStatus')}</span>
                    <span className={taskStatusBadgeClass(displayStatus)}>
                      {t(`shipments.ops.taskDisplayStatus.${displayStatus}`, { defaultValue: displayStatus })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/** Operations task dashboard (stats + task lists). Used on home `/` for operations role. */
export function OperationsDashboardPanel({ showHeader = true, className = '' }) {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const [upcomingWindow, setUpcomingWindow] = useState('week')
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [tables, setTables] = useState({ overdue: [], today: [], upcoming: [] })

  const load = useCallback(() => {
    if (!token) {
      setLoading(false)
      setError(t('common.error'))
      return
    }
    setLoading(true)
    setError(null)
    getOperationsDashboard(token, { upcoming_window: upcomingWindow })
      .then((res) => {
        const d = res?.data ?? res
        setStats(d?.stats ?? null)
        setTables({
          overdue: Array.isArray(d?.tables?.overdue) ? d.tables.overdue : [],
          today: Array.isArray(d?.tables?.today) ? d.tables.today : [],
          upcoming: Array.isArray(d?.tables?.upcoming) ? d.tables.upcoming : [],
        })
      })
      .catch((e) => {
        setError(e?.message || t('common.error'))
        setStats(null)
        setTables({ overdue: [], today: [], upcoming: [] })
      })
      .finally(() => setLoading(false))
  }, [token, upcomingWindow, t])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  useEffect(() => {
    const bump = () => setRefreshKey((k) => k + 1)
    const onVisible = () => {
      if (document.visibilityState === 'visible') bump()
    }
    window.addEventListener('am:dashboard:refresh', bump)
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(bump, 45000)
    return () => {
      window.removeEventListener('am:dashboard:refresh', bump)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [])

  const upcomingLabel = useMemo(
    () => t(`operationsDashboard.upcomingWindows.${upcomingWindow}`, { defaultValue: upcomingWindow }),
    [t, upcomingWindow],
  )

  return (
    <div className={`ops-dashboard-panel ${className}`.trim()}>
      {showHeader ? (
        <header className="ops-dashboard-panel__header mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('operationsDashboard.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('operationsDashboard.subtitle')}</p>
        </header>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <LoaderDots />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
            <StatsCard
              variant="red"
              icon={<AlertTriangle className="h-6 w-6" aria-hidden />}
              value={stats?.overdue_tasks ?? 0}
              title={
                <>
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">
                    {t('operationsDashboard.cardOverdueTitle')}
                  </span>
                  <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                    {t('operationsDashboard.cardOverdueCaption')}
                  </span>
                </>
              }
            />
            <StatsCard
              variant="amber"
              icon={<CalendarClock className="h-6 w-6" aria-hidden />}
              value={stats?.today_tasks ?? 0}
              title={
                <>
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">
                    {t('operationsDashboard.cardTodayTitle')}
                  </span>
                  <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                    {t('operationsDashboard.cardTodayCaption')}
                  </span>
                </>
              }
            />
            <div className="flex flex-col gap-2 rounded-lg border border-gray-200/80 bg-white py-3.5 px-4 shadow-sm dark:border-gray-700/80 dark:bg-gray-800/80">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t('operationsDashboard.cardUpcomingTitle')}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{upcomingLabel}</span>
                </div>
                <CalendarDays className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
              </div>
              <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{stats?.upcoming_tasks ?? 0}</p>
              <label className="sr-only" htmlFor="ops-upcoming-window">
                {t('operationsDashboard.upcomingFilterLabel')}
              </label>
              <select
                id="ops-upcoming-window"
                className="clients-input text-sm w-full mt-1"
                value={upcomingWindow}
                onChange={(e) => setUpcomingWindow(e.target.value)}
              >
                {UPCOMING_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {t(`operationsDashboard.upcomingWindows.${k}`)}
                  </option>
                ))}
              </select>
            </div>
            <StatsCard
              variant="blue"
              icon={<Ship className="h-6 w-6" aria-hidden />}
              value={stats?.active_shipments ?? 0}
              title={
                <>
                  <span className="block font-semibold text-slate-700 dark:text-slate-200">
                    {t('operationsDashboard.cardActiveTitle')}
                  </span>
                  <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                    {t('operationsDashboard.cardActiveCaption')}
                  </span>
                </>
              }
            />
          </div>

          <TaskList
            title={t('operationsDashboard.tableOverdue')}
            rows={tables.overdue}
            emptyLabel={t('operationsDashboard.tableEmpty')}
            sectionKey="overdue"
            t={t}
            i18nLanguage={i18n.language}
            token={token}
            onTaskCompleted={load}
          />
          <TaskList
            title={t('operationsDashboard.tableToday')}
            rows={tables.today}
            emptyLabel={t('operationsDashboard.tableEmpty')}
            sectionKey="today"
            t={t}
            i18nLanguage={i18n.language}
            token={token}
            onTaskCompleted={load}
          />
          <TaskList
            title={t('operationsDashboard.tableUpcoming', { window: upcomingLabel })}
            rows={tables.upcoming}
            emptyLabel={t('operationsDashboard.tableEmpty')}
            sectionKey="upcoming"
            t={t}
            i18nLanguage={i18n.language}
            token={token}
            onTaskCompleted={load}
          />
        </>
      )}
    </div>
  )
}
