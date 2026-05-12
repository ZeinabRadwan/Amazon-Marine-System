import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CalendarClock, CalendarDays, Ship } from 'lucide-react'
import { getStoredToken } from '../Login'
import { getOperationsDashboard } from '../../api/dashboard'
import { Container } from '../../components/Container'
import { StatsCard } from '../../components/StatsCard'
import LoaderDots from '../../components/LoaderDots'
import { formatDate } from '../../utils/dateUtils'
import '../Clients/Clients.css'
import { getTaskDisplayStatus } from '../Shipments/shipmentOperationTaskUi'

const UPCOMING_OPTIONS = ['tomorrow', '3_days', 'week', 'month']

function TaskTable({ title, rows, emptyLabel, t, i18nLanguage }) {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-sm overflow-hidden mb-8">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-slate-50/90 dark:bg-slate-900/40">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">{emptyLabel}</p>
        ) : (
          <table className="min-w-full text-sm ops-dash-table">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/50">
                <th className="text-start px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{t('operationsDashboard.colTask')}</th>
                <th className="text-start px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{t('operationsDashboard.colShipment')}</th>
                <th className="text-start px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{t('operationsDashboard.colDue')}</th>
                <th className="text-start px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{t('operationsDashboard.colPriority')}</th>
                <th className="text-start px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{t('operationsDashboard.colStatus')}</th>
                <th className="text-start px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">{t('operationsDashboard.colCompletion')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700/80 hover:bg-gray-50/60 dark:hover:bg-gray-900/30">
                  <td className="px-3 py-2 align-top text-gray-900 dark:text-gray-100">{row.name}</td>
                  <td className="px-3 py-2 align-top">
                    <Link
                      className="font-medium text-sky-700 dark:text-sky-400 hover:underline"
                      to={`/shipments?shipment_id=${encodeURIComponent(String(row.shipment_id))}`}
                    >
                      {row.shipment_ref}
                    </Link>
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap text-gray-700 dark:text-gray-300">
                    {row.due_date ? formatDate(row.due_date, { locale: i18nLanguage }) : '—'}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {t(`shipments.ops.taskPriority.${row.priority}`, { defaultValue: row.priority || '—' })}
                  </td>
                  <td className="px-3 py-2 align-top text-gray-700 dark:text-gray-300">
                    {t(
                      `shipments.ops.taskDisplayStatus.${getTaskDisplayStatus({
                        status: row.status,
                        completed_at: row.completed_at,
                        execution_at: row.execution_at,
                        due_date: row.due_date,
                      })}`,
                      { defaultValue: row.status || '—' }
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-gray-700 dark:text-gray-300">
                    {row.completed_at
                      ? formatDate(row.completed_at, { locale: i18nLanguage, includeTime: true })
                      : t('operationsDashboard.notCompleted')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default function OperationsDashboard() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const [upcomingWindow, setUpcomingWindow] = useState('week')
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
  }, [load])

  const upcomingLabel = useMemo(
    () => t(`operationsDashboard.upcomingWindows.${upcomingWindow}`, { defaultValue: upcomingWindow }),
    [t, upcomingWindow],
  )

  return (
    <Container size="xl">
      <div className="clients-page py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('operationsDashboard.title')}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('operationsDashboard.subtitle')}</p>
        </header>

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

            <TaskTable
              title={t('operationsDashboard.tableOverdue')}
              rows={tables.overdue}
              emptyLabel={t('operationsDashboard.tableEmpty')}
              t={t}
              i18nLanguage={i18n.language}
            />
            <TaskTable
              title={t('operationsDashboard.tableToday')}
              rows={tables.today}
              emptyLabel={t('operationsDashboard.tableEmpty')}
              t={t}
              i18nLanguage={i18n.language}
            />
            <TaskTable
              title={t('operationsDashboard.tableUpcoming', { window: upcomingLabel })}
              rows={tables.upcoming}
              emptyLabel={t('operationsDashboard.tableEmpty')}
              t={t}
              i18nLanguage={i18n.language}
            />
          </>
        )}
      </div>
    </Container>
  )
}
