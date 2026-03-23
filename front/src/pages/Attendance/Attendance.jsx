import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { getStoredToken } from '../Login'
import {
  clockIn,
  clockOut,
  buildClockBody,
  listAttendance,
  getAttendanceStats,
  getAttendanceToday,
  listMyExcuses,
  submitExcuse,
  adminListAttendance,
  adminAttendanceSummary,
  adminListExcuses,
  adminPatchExcuse,
} from '../../api/attendance'
import { getProfile } from '../../api/auth'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table } from '../../components/Table'
import Pagination from '../../components/Pagination'
import Tabs from '../../components/Tabs'
import { StatsCard } from '../../components/StatsCard'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import { LogIn, LogOut, RefreshCw, Clock, UserX, Download } from 'lucide-react'
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
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return dateStr
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not available in this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60_000,
    })
  })
}

function downloadCsv(filename, rows) {
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Attendance() {
  const { t } = useTranslation()
  const { permissions = [] } = useOutletContext() || {}
  const token = getStoredToken()
  const today = new Date().toISOString().slice(0, 10)
  const canAdmin = Array.isArray(permissions) && permissions.includes('attendance.admin')

  const sectionTabs = useMemo(() => {
    const base = [
      { id: 'my', labelKey: 'attendance.tabs.my' },
      { id: 'excuses', labelKey: 'attendance.tabs.excuses' },
    ]
    if (canAdmin) base.push({ id: 'admin', labelKey: 'attendance.tabs.admin' })
    return base.map((tab) => ({ id: tab.id, label: t(tab.labelKey) }))
  }, [canAdmin, t])

  const [activeSection, setActiveSection] = useState('my')
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

  const [myExcuses, setMyExcuses] = useState([])
  const [excusesLoading, setExcusesLoading] = useState(false)
  const [excuseForm, setExcuseForm] = useState({ date: today, reason: '', file: null })
  const [excuseSubmitting, setExcuseSubmitting] = useState(false)

  const [adminFilters, setAdminFilters] = useState({
    employee_id: '',
    date_from: today,
    date_to: today,
    status: '',
    device_type: '',
    is_within_radius: '',
    page: 1,
    per_page: 25,
  })
  const [adminItems, setAdminItems] = useState([])
  const [adminMeta, setAdminMeta] = useState(null)
  const [adminSummary, setAdminSummary] = useState([])
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminSortKey, setAdminSortKey] = useState('date')
  const [adminSortDir, setAdminSortDir] = useState('desc')

  const [adminExcuses, setAdminExcuses] = useState([])
  const [adminExcusesLoading, setAdminExcusesLoading] = useState(false)
  const [excuseActionId, setExcuseActionId] = useState(null)
  const [adminRefresh, setAdminRefresh] = useState(0)
  const adminFiltersRef = useRef(adminFilters)
  adminFiltersRef.current = adminFilters

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
        setList(Array.isArray(data) ? data : [])
      })
      .catch(() => setAlert({ type: 'error', message: t('attendance.errorLoad') }))
      .finally(() => setLoading(false))
  }, [token, filters.from, filters.to, t])

  useEffect(() => {
    if (activeSection === 'my') loadList()
  }, [loadList, activeSection])

  useEffect(() => {
    if (!token || activeSection !== 'my') return
    setStatsLoading(true)
    getAttendanceStats(token, { date: filters.from })
      .then((data) => setStats(data && typeof data === 'object' ? data : null))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [token, filters.from, activeSection])

  const refreshToday = useCallback(() => {
    if (!token) return
    setTodayLoading(true)
    getAttendanceToday(token)
      .then((data) => setTodayData(data && typeof data === 'object' ? data : null))
      .catch(() => setTodayData(null))
      .finally(() => setTodayLoading(false))
  }, [token])

  useEffect(() => {
    if (activeSection === 'my') refreshToday()
  }, [activeSection, refreshToday, checkInSubmitting, checkOutSubmitting])

  const loadMyExcuses = useCallback(() => {
    if (!token) return
    setExcusesLoading(true)
    listMyExcuses(token)
      .then((data) => setMyExcuses(Array.isArray(data) ? data : []))
      .catch(() => setMyExcuses([]))
      .finally(() => setExcusesLoading(false))
  }, [token])

  useEffect(() => {
    if (activeSection === 'excuses') loadMyExcuses()
  }, [activeSection, loadMyExcuses])

  const loadAdminExcuses = useCallback(() => {
    if (!token || !canAdmin) return
    setAdminExcusesLoading(true)
    adminListExcuses(token, { status: 'pending', per_page: 50 })
      .then((res) => {
        setAdminExcuses(Array.isArray(res?.items) ? res.items : [])
      })
      .catch(() => {
        setAdminExcuses([])
      })
      .finally(() => setAdminExcusesLoading(false))
  }, [token, canAdmin])

  useEffect(() => {
    if (activeSection !== 'admin' || !canAdmin || !token) return
    let cancelled = false
    setAdminLoading(true)
    const f = adminFiltersRef.current
    const params = {
      employee_id: f.employee_id || undefined,
      date_from: f.date_from || undefined,
      date_to: f.date_to || undefined,
      status: f.status || undefined,
      device_type: f.device_type || undefined,
      is_within_radius: f.is_within_radius === '' ? undefined : f.is_within_radius,
      page: f.page,
      per_page: f.per_page,
    }
    Promise.all([adminListAttendance(token, params), adminAttendanceSummary(token, params)])
      .then(([listRes, sumRes]) => {
        if (cancelled) return
        setAdminItems(Array.isArray(listRes?.items) ? listRes.items : [])
        setAdminMeta(listRes?.meta ?? null)
        setAdminSummary(Array.isArray(sumRes) ? sumRes : [])
      })
      .catch(() => {
        if (!cancelled) {
          setAdminItems([])
          setAdminMeta(null)
          setAdminSummary([])
        }
      })
      .finally(() => {
        if (!cancelled) setAdminLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeSection, canAdmin, token, adminRefresh, adminFilters.page, adminFilters.per_page])

  useEffect(() => {
    if (activeSection === 'admin' && canAdmin) {
      setAdminRefresh((n) => n + 1)
      loadAdminExcuses()
    }
  }, [activeSection, canAdmin, loadAdminExcuses])

  const handleCheckIn = async () => {
    if (!token) return
    setAlert(null)
    setCheckInSubmitting(true)
    try {
      let position = null
      try {
        position = await getCurrentPosition()
      } catch {
        position = null
      }
      await clockIn(token, buildClockBody(position, ''))
      setAlert({ type: 'success', message: t('attendance.checkInSuccess') })
      loadList()
      refreshToday()
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('attendance.error') })
    } finally {
      setCheckInSubmitting(false)
    }
  }

  const handleCheckOut = async () => {
    if (!token) return
    setAlert(null)
    setCheckOutSubmitting(true)
    try {
      let position = null
      try {
        position = await getCurrentPosition()
      } catch {
        position = null
      }
      await clockOut(token, buildClockBody(position, ''))
      setAlert({ type: 'success', message: t('attendance.checkOutSuccess') })
      loadList()
      refreshToday()
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('attendance.error') })
    } finally {
      setCheckOutSubmitting(false)
    }
  }

  const handleSubmitExcuse = async (e) => {
    e.preventDefault()
    if (!token) return
    setExcuseSubmitting(true)
    setAlert(null)
    try {
      await submitExcuse(token, {
        date: excuseForm.date,
        reason: excuseForm.reason,
        attachment: excuseForm.file || undefined,
      })
      setAlert({ type: 'success', message: t('attendance.excuses.submitSuccess') })
      setExcuseForm({ date: today, reason: '', file: null })
      loadMyExcuses()
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('attendance.error') })
    } finally {
      setExcuseSubmitting(false)
    }
  }

  const handleAdminExcuseDecision = async (id, status) => {
    if (!token) return
    setExcuseActionId(id)
    setAlert(null)
    try {
      await adminPatchExcuse(token, id, { status })
      setAlert({ type: 'success', message: t('attendance.admin.excuseUpdated') })
      loadAdminExcuses()
      setAdminRefresh((n) => n + 1)
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('attendance.error') })
    } finally {
      setExcuseActionId(null)
    }
  }

  const exportAdminCsv = () => {
    const headers = [
      'employee_name',
      'date',
      'clock_in_at',
      'clock_out_at',
      'worked_hours',
      'device_type',
      'is_within_radius',
      'distance_m',
      'status',
    ]
    const esc = (v) => {
      const s = v == null ? '' : String(v)
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const lines = [headers.join(',')]
    adminItems.forEach((r) => {
      lines.push(
        [
          esc(r.employee_name),
          esc(r.date),
          esc(r.clock_in_at),
          esc(r.clock_out_at),
          esc(r.worked_hours),
          esc(r.device_type),
          esc(r.is_within_radius),
          esc(r.distance_from_office_m),
          esc(r.status),
        ].join(',')
      )
    })
    downloadCsv(`attendance-export-${today}.csv`, lines)
  }

  const sortedAdminItems = useMemo(() => {
    const copy = [...adminItems]
    const mult = adminSortDir === 'asc' ? 1 : -1
    copy.sort((a, b) => {
      const va = a[adminSortKey]
      const vb = b[adminSortKey]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * mult
    })
    return copy
  }, [adminItems, adminSortKey, adminSortDir])

  const totalRecords = list.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / filters.per_page))
  const paginatedList = list.slice(
    (filters.page - 1) * filters.per_page,
    filters.page * filters.per_page
  )

  const myRecordToday =
    currentUserId != null && todayData?.records?.length
      ? todayData.records.find((r) => Number(r.user_id) === Number(currentUserId))
      : todayData?.records?.[0]
  const hasCheckedIn = !!myRecordToday?.check_in_at
  const hasCheckedOut = !!myRecordToday?.check_out_at

  const pageLoading = loading || statsLoading || checkInSubmitting || checkOutSubmitting

  const columns = [
    { key: 'user_name', label: t('attendance.user'), sortable: true, render: (_, r) => r.user_name ?? '—' },
    { key: 'date', label: t('attendance.date'), sortable: true, render: (_, r) => formatDateOnly(r.date) },
    { key: 'check_in_at', label: t('attendance.checkIn'), render: (_, r) => formatTime(r.check_in_at_local || r.check_in_at) },
    { key: 'check_out_at', label: t('attendance.checkOut'), render: (_, r) => formatTime(r.check_out_at_local || r.check_out_at) },
    {
      key: 'status',
      label: t('attendance.status'),
      sortable: true,
      render: (_, r) => r.status || '—',
    },
    {
      key: 'worked_minutes',
      label: t('attendance.workedHours'),
      sortable: true,
      render: (_, r) =>
        r.worked_minutes != null ? `${(r.worked_minutes / 60).toFixed(2)} h` : '—',
    },
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

  const adminColumns = [
    { key: 'employee_name', label: t('attendance.user'), sortable: true },
    { key: 'date', label: t('attendance.date'), sortable: true },
    {
      key: 'clock_in_at',
      label: t('attendance.checkIn'),
      render: (_, r) => formatTime(r.clock_in_at_local || r.clock_in_at),
    },
    {
      key: 'clock_out_at',
      label: t('attendance.checkOut'),
      render: (_, r) => formatTime(r.clock_out_at_local || r.clock_out_at),
    },
    { key: 'worked_hours', label: t('attendance.workedHours'), sortable: true },
    { key: 'device_type', label: t('attendance.device'), sortable: true },
    {
      key: 'is_within_radius',
      label: t('attendance.withinRadius'),
      sortable: true,
      render: (v) => (v === true ? t('attendance.yes') : v === false ? t('attendance.no') : '—'),
    },
    {
      key: 'distance_from_office_m',
      label: t('attendance.distanceM'),
      sortable: true,
      render: (v) => (v != null ? Math.round(v) : '—'),
    },
    { key: 'status', label: t('attendance.status'), sortable: true },
  ]

  return (
    <Container size="xl">
      <div className="clients-page attendance-page">
        <div className="mb-4">
          <Tabs tabs={sectionTabs} activeTab={activeSection} onChange={setActiveSection} className="attendance-section-tabs" />
        </div>

        {activeSection === 'my' && (
          <>
            {pageLoading && (
              <div className="clients-page-loader" aria-live="polite" aria-busy="true">
                <LoaderDots />
              </div>
            )}

            <div className="clients-header attendance-header">
              <div className="attendance-header-actions">
                <div className="attendance-status-strip" aria-live="polite" role="status">
                  <span className="attendance-status-item attendance-status-item--label">{t('attendance.myAttendance')}</span>
                  <span
                    className={`attendance-status-item attendance-status-item--checkin ${hasCheckedIn ? 'attendance-status-item--active' : ''}`}
                    title={t('attendance.checkedIn')}
                  >
                    {t('attendance.checkedIn')}
                  </span>
                  <span
                    className={`attendance-status-item attendance-status-item--checkout ${hasCheckedOut ? 'attendance-status-item--active' : ''}`}
                    title={t('attendance.checkedOut')}
                  >
                    {t('attendance.checkedOut')}
                  </span>
                </div>
                <button
                  type="button"
                  className="page-header__btn attendance-refresh-btn"
                  onClick={() => {
                    setFilters((f) => ({ ...f, from: today, to: today, page: 1 }))
                    refreshToday()
                  }}
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('attendance.geoHint')}</p>
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

            {list.length === 0 && !loading ? (
              <p className="clients-empty">{t('attendance.noRecords')}</p>
            ) : (
              <>
                <Table
                  columns={columns}
                  data={paginatedList}
                  getRowKey={(r) => r.id ?? `${r.user_id}-${r.date}`}
                  emptyMessage={t('attendance.noRecords')}
                  sortKey={null}
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
                            <option key={n} value={n}>
                              {n}
                            </option>
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
          </>
        )}

        {activeSection === 'excuses' && (
          <div className="clients-filters-card space-y-6">
            <h2 className="text-lg font-semibold">{t('attendance.excuses.submitTitle')}</h2>
            <form className="settings-form settings-form--stacked max-w-xl" onSubmit={handleSubmitExcuse}>
              <label className="settings-input-wrap">
                <span className="settings-input-label">{t('attendance.date')}</span>
                <input
                  type="date"
                  className="clients-input"
                  value={excuseForm.date}
                  onChange={(e) => setExcuseForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </label>
              <label className="settings-input-wrap">
                <span className="settings-input-label">{t('attendance.excuses.reason')}</span>
                <textarea
                  className="clients-input min-h-[120px]"
                  value={excuseForm.reason}
                  onChange={(e) => setExcuseForm((f) => ({ ...f, reason: e.target.value }))}
                  required
                />
              </label>
              <label className="settings-input-wrap">
                <span className="settings-input-label">{t('attendance.excuses.attachment')}</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setExcuseForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                />
              </label>
              <button type="submit" className="page-header__btn page-header__btn--primary" disabled={excuseSubmitting}>
                {excuseSubmitting ? t('attendance.saving') : t('attendance.excuses.submit')}
              </button>
            </form>

            <h2 className="text-lg font-semibold">{t('attendance.excuses.myList')}</h2>
            {excusesLoading ? (
              <LoaderDots />
            ) : myExcuses.length === 0 ? (
              <p className="clients-empty">{t('attendance.excuses.empty')}</p>
            ) : (
              <ul className="space-y-3">
                {myExcuses.map((ex) => (
                  <li key={ex.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">{formatDateOnly(ex.date)}</span>
                      <span className="text-sm uppercase text-gray-600 dark:text-gray-400">{ex.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ex.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeSection === 'admin' && canAdmin && (
          <div className="space-y-6">
            <div className="clients-filters-card flex flex-wrap items-end gap-3">
              <label className="attendance-filter-label">
                <span>{t('attendance.admin.employeeId')}</span>
                <input
                  type="number"
                  className="clients-input w-28"
                  value={adminFilters.employee_id}
                  onChange={(e) => setAdminFilters((f) => ({ ...f, employee_id: e.target.value, page: 1 }))}
                />
              </label>
              <label className="attendance-filter-label">
                <span>{t('attendance.from')}</span>
                <input
                  type="date"
                  className="clients-input"
                  value={adminFilters.date_from}
                  onChange={(e) => setAdminFilters((f) => ({ ...f, date_from: e.target.value, page: 1 }))}
                />
              </label>
              <label className="attendance-filter-label">
                <span>{t('attendance.to')}</span>
                <input
                  type="date"
                  className="clients-input"
                  value={adminFilters.date_to}
                  onChange={(e) => setAdminFilters((f) => ({ ...f, date_to: e.target.value, page: 1 }))}
                />
              </label>
              <label className="attendance-filter-label">
                <span>{t('attendance.status')}</span>
                <select
                  className="clients-select"
                  value={adminFilters.status}
                  onChange={(e) => setAdminFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                >
                  <option value="">{t('attendance.admin.all')}</option>
                  <option value="on_time">on_time</option>
                  <option value="late">late</option>
                  <option value="early_leave">early_leave</option>
                  <option value="absent">absent</option>
                  <option value="excused">excused</option>
                </select>
              </label>
              <label className="attendance-filter-label">
                <span>{t('attendance.device')}</span>
                <select
                  className="clients-select"
                  value={adminFilters.device_type}
                  onChange={(e) => setAdminFilters((f) => ({ ...f, device_type: e.target.value, page: 1 }))}
                >
                  <option value="">{t('attendance.admin.all')}</option>
                  <option value="android">android</option>
                  <option value="ios">ios</option>
                  <option value="windows">windows</option>
                  <option value="mac">mac</option>
                  <option value="linux">linux</option>
                  <option value="unknown">unknown</option>
                </select>
              </label>
              <label className="attendance-filter-label">
                <span>{t('attendance.withinRadius')}</span>
                <select
                  className="clients-select"
                  value={adminFilters.is_within_radius}
                  onChange={(e) => setAdminFilters((f) => ({ ...f, is_within_radius: e.target.value, page: 1 }))}
                >
                  <option value="">{t('attendance.admin.all')}</option>
                  <option value="1">{t('attendance.yes')}</option>
                  <option value="0">{t('attendance.no')}</option>
                </select>
              </label>
              <button
                type="button"
                className="page-header__btn page-header__btn--primary"
                onClick={() => {
                  setAdminFilters((f) => ({ ...f, page: 1 }))
                  setAdminRefresh((n) => n + 1)
                }}
              >
                {t('attendance.admin.apply')}
              </button>
              <button type="button" className="page-header__btn inline-flex items-center gap-2" onClick={exportAdminCsv}>
                <Download size={18} aria-hidden />
                {t('attendance.admin.exportCsv')}
              </button>
            </div>

            {adminLoading ? (
              <LoaderDots />
            ) : (
              <>
                <Table
                  columns={adminColumns}
                  data={sortedAdminItems}
                  getRowKey={(r) => r.id}
                  emptyMessage={t('attendance.noRecords')}
                  sortKey={adminSortKey}
                  sortDirection={adminSortDir}
                  onSort={(key, dir) => {
                    setAdminSortKey(key)
                    setAdminSortDir(dir)
                  }}
                />
                {adminMeta && adminMeta.total > adminMeta.per_page && (
                  <Pagination
                    currentPage={adminMeta.current_page}
                    totalPages={adminMeta.last_page}
                    onPageChange={(page) => setAdminFilters((f) => ({ ...f, page }))}
                  />
                )}
              </>
            )}

            <h2 className="text-lg font-semibold">{t('attendance.admin.summaryTitle')}</h2>
            {adminSummary.length === 0 ? (
              <p className="clients-empty">{t('attendance.admin.summaryEmpty')}</p>
            ) : (
              <Table
                columns={[
                  { key: 'employee_name', label: t('attendance.user'), sortable: false },
                  { key: 'total_days', label: t('attendance.admin.totalDays'), sortable: false },
                  { key: 'late_count', label: t('attendance.statsLate'), sortable: false },
                  { key: 'absent_count', label: t('attendance.statsAbsent'), sortable: false },
                  { key: 'avg_worked_hours', label: t('attendance.workedHoursAvg'), sortable: false },
                ]}
                data={adminSummary}
                getRowKey={(r) => r.employee_id}
              />
            )}

            <h2 className="text-lg font-semibold">{t('attendance.admin.pendingExcuses')}</h2>
            {adminExcusesLoading ? (
              <LoaderDots />
            ) : adminExcuses.length === 0 ? (
              <p className="clients-empty">{t('attendance.admin.noPendingExcuses')}</p>
            ) : (
              <ul className="space-y-3">
                {adminExcuses.map((ex) => (
                  <li key={ex.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{ex.employee_name}</span>
                      <span>{formatDateOnly(ex.date)}</span>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{ex.reason}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="page-header__btn page-header__btn--primary text-sm"
                        disabled={excuseActionId === ex.id}
                        onClick={() => handleAdminExcuseDecision(ex.id, 'approved')}
                      >
                        {t('attendance.admin.approve')}
                      </button>
                      <button
                        type="button"
                        className="page-header__btn text-sm"
                        disabled={excuseActionId === ex.id}
                        onClick={() => handleAdminExcuseDecision(ex.id, 'rejected')}
                      >
                        {t('attendance.admin.reject')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {alert && (
          <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}
      </div>
    </Container>
  )
}
