import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import {
  checkIn,
  checkOut,
  listAttendance,
  getAttendanceStats,
  getAttendanceToday,
} from '../../api/attendance'
import { getProfile } from '../../api/auth'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table } from '../../components/Table'
import Pagination from '../../components/Pagination'
import { StatsCard } from '../../components/StatsCard'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import { LogIn, LogOut, RefreshCw, Clock, UserX } from 'lucide-react'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import './Attendance.css'

function formatTime(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function formatDateOnly(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return dateStr
  }
}

export default function Attendance() {
  const { t } = useTranslation()
  const token = getStoredToken()
  const today = new Date().toISOString().slice(0, 10)

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [filters, setFilters] = useState({
    from: today,
    to: today,
    page: 1,
    per_page: 15,
  })
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [todayData, setTodayData] = useState(null)
  const [todayLoading, setTodayLoading] = useState(false)
  const [checkInSubmitting, setCheckInSubmitting] = useState(false)
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    if (!token) return
    getProfile(token)
      .then((data) => {
        const u = data.user ?? data.data ?? data
        setCurrentUserId(u?.id ?? null)
      })
      .catch(() => setCurrentUserId(null))
  }, [token])

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listAttendance(token, { from: filters.from, to: filters.to })
      .then((data) => {
        const arr = data.data ?? data.records ?? data
        setList(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setAlert({ type: 'error', message: t('attendance.errorLoad') }))
      .finally(() => setLoading(false))
  }, [token, filters.from, filters.to, t])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!token) return
    setStatsLoading(true)
    getAttendanceStats(token, { date: filters.from })
      .then((data) => setStats(data.data ?? data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [token, filters.from])

  useEffect(() => {
    if (!token) return
    setTodayLoading(true)
    getAttendanceToday(token)
      .then((data) => setTodayData(data.data ?? data))
      .catch(() => setTodayData(null))
      .finally(() => setTodayLoading(false))
  }, [token, checkInSubmitting, checkOutSubmitting])

  const handleCheckIn = () => {
    if (!token) return
    setAlert(null)
    setCheckInSubmitting(true)
    checkIn(token, { notes: '' })
      .then(() => {
        setAlert({ type: 'success', message: t('attendance.checkInSuccess') })
        loadList()
        getAttendanceToday(token).then((d) => setTodayData(d.data ?? d))
      })
      .catch((err) => setAlert({ type: 'error', message: err.message || t('attendance.error') }))
      .finally(() => setCheckInSubmitting(false))
  }

  const handleCheckOut = () => {
    if (!token) return
    setAlert(null)
    setCheckOutSubmitting(true)
    checkOut(token, { notes: '' })
      .then(() => {
        setAlert({ type: 'success', message: t('attendance.checkOutSuccess') })
        loadList()
        getAttendanceToday(token).then((d) => setTodayData(d.data ?? d))
      })
      .catch((err) => setAlert({ type: 'error', message: err.message || t('attendance.error') }))
      .finally(() => setCheckOutSubmitting(false))
  }

  const totalRecords = list.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / filters.per_page))
  const paginatedList = list.slice(
    (filters.page - 1) * filters.per_page,
    filters.page * filters.per_page
  )

  const myRecordToday = currentUserId != null && todayData?.records?.length
    ? todayData.records.find((r) => Number(r.user_id) === Number(currentUserId))
    : todayData?.records?.[0]
  const hasCheckedIn = !!myRecordToday?.check_in_at
  const hasCheckedOut = !!myRecordToday?.check_out_at

  const pageLoading = loading || statsLoading || checkInSubmitting || checkOutSubmitting

  const columns = [
    { key: 'user_name', label: t('attendance.user'), render: (_, r) => r.user_name ?? '—' },
    { key: 'date', label: t('attendance.date'), render: (_, r) => formatDateOnly(r.date) },
    { key: 'check_in_at', label: t('attendance.checkIn'), render: (_, r) => formatTime(r.check_in_at) },
    { key: 'check_out_at', label: t('attendance.checkOut'), render: (_, r) => formatTime(r.check_out_at) },
    {
      key: 'is_late',
      label: t('attendance.late'),
      render: (_, r) =>
        r.is_late ? (
          <span className="attendance-badge attendance-badge--late" title={t('attendance.late')}>
            {t('attendance.late')}
          </span>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <Container size="xl">
      <div className="clients-page attendance-page">
        {pageLoading && (
          <div className="clients-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        <div className="clients-header attendance-header">
          <div className="attendance-header-actions">
            <div className="attendance-status-strip" aria-live="polite" role="status">
              <span className="attendance-status-item attendance-status-item--label">{t('attendance.myAttendance')}</span>
              <span className={`attendance-status-item attendance-status-item--checkin ${hasCheckedIn ? 'attendance-status-item--active' : ''}`} title={t('attendance.checkedIn')}>
                {t('attendance.checkedIn')}
              </span>
              <span className={`attendance-status-item attendance-status-item--checkout ${hasCheckedOut ? 'attendance-status-item--active' : ''}`} title={t('attendance.checkedOut')}>
                {t('attendance.checkedOut')}
              </span>
            </div>
            <button
              type="button"
              className="page-header__btn attendance-refresh-btn"
              onClick={() => setFilters((f) => ({ ...f, from: today, to: today, page: 1 }))}
              disabled={loading}
              aria-label={t('attendance.refresh')}
              title={t('attendance.refresh')}
            >
              <RefreshCw className="clients-filters__btn-icon-svg" size={18} aria-hidden />
              {t('attendance.refresh')}
            </button>
          </div>
        </div>

        {stats && typeof stats === 'object' && (
          <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
            <StatsCard
              title={t('attendance.statsPresent')}
              value={stats.present ?? 0}
              icon={<LogIn className="h-6 w-6" />}
              variant="green"
            />
            <StatsCard
              title={t('attendance.statsLeft')}
              value={stats.left ?? 0}
              icon={<LogOut className="h-6 w-6" />}
              variant="blue"
            />
            <StatsCard
              title={t('attendance.statsLate')}
              value={stats.late ?? 0}
              icon={<Clock className="h-6 w-6" />}
              variant="amber"
            />
            <StatsCard
              title={t('attendance.statsAbsent')}
              value={stats.absent ?? 0}
              icon={<UserX className="h-6 w-6" />}
              variant="default"
            />
          </div>
        )}

        <div className="attendance-actions-card clients-filters-card">
          <h2 className="attendance-actions-title">{t('attendance.myAttendance')}</h2>
          {todayLoading ? (
            <p className="attendance-actions-loading">{t('attendance.loading')}</p>
          ) : (
            <div className="attendance-actions-buttons">
              <button
                type="button"
                className="attendance-btn attendance-btn--checkin page-header__btn page-header__btn--primary"
                onClick={handleCheckIn}
                disabled={checkInSubmitting || hasCheckedIn}
                aria-label={t('attendance.checkIn')}
                aria-pressed={hasCheckedIn}
                title={hasCheckedIn ? t('attendance.checkedIn') : t('attendance.checkIn')}
              >
                <LogIn size={18} aria-hidden />
                {checkInSubmitting ? t('attendance.saving') : hasCheckedIn ? t('attendance.checkedIn') : t('attendance.checkIn')}
              </button>
              {hasCheckedIn && !hasCheckedOut && (
                <button
                  type="button"
                  className="attendance-btn attendance-btn--checkout page-header__btn"
                  onClick={handleCheckOut}
                  disabled={checkOutSubmitting}
                  aria-label={t('attendance.checkOut')}
                  aria-pressed={false}
                  title={t('attendance.checkOut')}
                >
                  <LogOut size={18} aria-hidden />
                  {checkOutSubmitting ? t('attendance.saving') : t('attendance.checkOut')}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="clients-filters-card attendance-filters-card">
          <div className="clients-filters__row clients-filters__row--main attendance-filters-row">
            <label className="attendance-filter-label">
              <span>{t('attendance.from')}</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('attendance.from')}
              />
            </label>
            <label className="attendance-filter-label">
              <span>{t('attendance.to')}</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('attendance.to')}
              />
            </label>
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
          <p className="clients-empty">{t('attendance.noRecords')}</p>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedList}
              getRowKey={(r) => r.id ?? `${r.user_id}-${r.date}`}
              emptyMessage={t('attendance.noRecords')}
            />
            {totalRecords > 0 && (
              <div className="clients-pagination">
                <div className="clients-pagination__left">
                  <span className="clients-pagination__total">
                    {t('attendance.total')}: {totalRecords}
                  </span>
                  <label className="clients-pagination__per-page">
                    <span className="clients-pagination__per-page-label">{t('attendance.perPage')}</span>
                    <select
                      value={filters.per_page}
                      onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
                      className="clients-select clients-pagination__select"
                      aria-label={t('attendance.perPage')}
                    >
                      {[10, 15, 25, 50].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <Pagination
                  currentPage={filters.page}
                  totalPages={totalPages}
                  onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
                />
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  )
}
