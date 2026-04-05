import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
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
  openAdminExcuseAttachment,
  openMyExcuseAttachment,
} from '../../api/attendance'
import { getProfile } from '../../api/auth'
import { listUsers } from '../../api/users'
import { getSettings } from '../../api/settings'
import { haversineMeters, wallClockToUtc, formatYmdInTimeZone, durationPartsFromMs } from '../../utils/geoTime'
import { normalizeEmployeeOption } from '../../utils/entitySelectOptions'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table } from '../../components/Table'
import Pagination from '../../components/Pagination'
import Tabs from '../../components/Tabs'
import { StatsCard } from '../../components/StatsCard'
import LoaderDots from '../../components/LoaderDots'
import LeafletOfficeMapPreview from '../../components/LeafletOfficeMapPreview/LeafletOfficeMapPreview'
import Alert from '../../components/Alert'
import {
  LogIn,
  LogOut,
  Clock,
  UserX,
  MapPin,
  Building2,
  Timer,
  Paperclip,
  XCircle,
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import './Attendance.css'

function formatTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function dateLocaleForLang(lang) {
  if (!lang) return undefined
  const base = String(lang).split('-')[0].toLowerCase()
  if (base === 'ar') return 'ar-EG'
  if (base === 'en') return 'en-GB'
  return undefined
}

function formatDateOnly(dateStr, lang) {
  if (!dateStr) return '—'
  try {
    const loc = dateLocaleForLang(lang)
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString(loc, { dateStyle: 'medium' })
  } catch {
    return dateStr
  }
}

function excuseStatusLabel(t, status) {
  if (status == null || String(status).trim() === '') return '—'
  const key = String(status).trim().toLowerCase().replace(/\s+/g, '_')
  if (key === 'pending' || key === 'approved' || key === 'rejected') {
    return t(`attendance.excuses.status.${key}`)
  }
  return String(status).replace(/_/g, ' ')
}

/** Policy `HH:mm` / `H:mm` → 12h label for the shift timeline (locale-aware). */
function formatWorkdayClockLabel(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return timeStr
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (!m) return timeStr
  const h = Number(m[1])
  const min = Number(m[2])
  const sec = m[3] != null ? Number(m[3]) : 0
  if (!Number.isFinite(h) || !Number.isFinite(min)) return timeStr
  const d = new Date()
  d.setHours(h, min, sec, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
}

/** Prefer API `worked_minutes`; then closed-shift `worked_hours`; else derive from timestamps (open shift uses nowMs). */
function resolveWorkedMinutes(r, nowMs = Date.now()) {
  const raw = r.worked_minutes ?? r.workedMinutes
  if (raw != null && raw !== '' && Number.isFinite(Number(raw))) {
    return { minutes: Math.max(0, Math.round(Number(raw))), openShift: false }
  }
  const inT = r.check_in_at_local || r.check_in_at
  const outT = r.check_out_at_local || r.check_out_at
  const open = r.shift_open === true || (!!inT && !outT)
  if (!open && r.worked_hours != null && Number.isFinite(Number(r.worked_hours))) {
    return { minutes: Math.max(0, Math.round(Number(r.worked_hours) * 60)), openShift: false }
  }
  if (!inT) return null
  if (outT) {
    const mins = Math.round((new Date(outT).getTime() - new Date(inT).getTime()) / 60000)
    return mins >= 0 ? { minutes: mins, openShift: false } : null
  }
  const mins = Math.round((nowMs - new Date(inT).getTime()) / 60000)
  return mins >= 0 ? { minutes: mins, openShift: true } : null
}

function resolveDistanceM(r) {
  const d = r.distance_from_office_m ?? r.clock_in_distance_from_office
  if (d == null || d === '') return null
  const n = Number(d)
  return Number.isFinite(n) ? n : null
}

function attendanceStatusLabel(t, status) {
  if (!status) return '—'
  const key = String(status).trim()
  if (key === 'on_time') {
    return t('attendance.onTime')
  }
  if (key === 'late') {
    return t('attendance.late')
  }
  if (key === 'early_leave') {
    return t('attendance.earlyLeave')
  }
  if (key === 'absent') {
    return t('attendance.statsAbsent')
  }
  if (key === 'excused') {
    return t('attendance.excused')
  }

  return key.replace(/_/g, ' ')
}

function attendanceStatusBadgeClass(status) {
  const key = status ? String(status).trim() : ''
  const base = 'attendance-badge'
  if (key === 'on_time') {
    return `${base} attendance-badge--on-time`
  }
  if (key === 'late') {
    return `${base} attendance-badge--late`
  }
  if (key === 'early_leave') {
    return `${base} attendance-badge--early-leave`
  }
  if (key === 'absent') {
    return `${base} attendance-badge--absent`
  }
  if (key === 'excused') {
    return `${base} attendance-badge--excused`
  }

  return `${base} attendance-badge--muted`
}

function renderAttendanceStatusBadge(t, r) {
  const status = r.status
  if (!status) {
    return '—'
  }

  return (
    <span className={attendanceStatusBadgeClass(status)} title={String(status)}>
      {attendanceStatusLabel(t, status)}
    </span>
  )
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
  const { t, i18n } = useTranslation()
  const { isAdminRole, user: outletUser } = useAuthAccess()
  const token = getStoredToken()
  const today = useMemo(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    return formatYmdInTimeZone(new Date(), tz)
  }, [])
  const canShowAdminTab = isAdminRole
  const canAdminAttendance = isAdminRole
  const canManageAttendanceExcuses = isAdminRole
  const canFilterAll = isAdminRole

  const sectionTabs = useMemo(() => {
    // Admin (role 1): Only sees Admin/Reports tab, loses personal recording/excuses
    if (isAdminRole) {
      return [{ id: 'admin', label: t('attendance.tabs.admin') }]
    }
    // Regular User: Sees personal tabs, loses Admin/Reports
    return [
      { id: 'my', label: t('attendance.tabs.my') },
      { id: 'excuses', label: t('attendance.tabs.excuses') },
    ]
  }, [isAdminRole, t])

  const [activeSection, setActiveSection] = useState(isAdminRole ? 'admin' : 'my')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [filters, setFilters] = useState({
    from: today,
    to: today,
    user_id: '',
    status: '',
    is_within_radius: '',
    page: 1,
    per_page: 15,
  })
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [todayData, setTodayData] = useState(null)
  const [todayLoading, setTodayLoading] = useState(false)
  const [checkInSubmitting, setCheckInSubmitting] = useState(false)
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  const [dashboardTick, setDashboardTick] = useState(() => Date.now())
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState(null)
  const [userGeo, setUserGeo] = useState({
    status: 'idle',
    lat: null,
    lng: null,
    accuracy: null,
    error: null,
    updatedAt: null,
  })

  const [myExcuses, setMyExcuses] = useState([])
  const [excusesLoading, setExcusesLoading] = useState(false)
  const [excuseForm, setExcuseForm] = useState({ date: today, reason: '', file: null })
  const [excuseErrors, setExcuseErrors] = useState({})
  const [excuseSubmitting, setExcuseSubmitting] = useState(false)

  const [adminFilters, setAdminFilters] = useState({
    employee_id: '',
    date_from: today,
    date_to: today,
    status: '',
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
  const [openingAttachmentId, setOpeningAttachmentId] = useState(null)
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

  useEffect(() => {
    if (!token || !isAdminRole) return
    listUsers(token, { per_page: 500, status: 'active' })
      .then((data) => {
        const list = data.data ?? data.users ?? data
        const arr = Array.isArray(list) ? list : []
        setEmployeeOptions(arr.map(normalizeEmployeeOption).filter(Boolean))
      })
      .catch(() => setEmployeeOptions([]))
  }, [token, isAdminRole, activeSection])

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listAttendance(token, {
      from: filters.from,
      to: filters.to,
      user_id: canFilterAll && filters.user_id ? filters.user_id : undefined,
      status: filters.status || undefined,
      is_within_radius:
        filters.is_within_radius === '' || filters.is_within_radius === undefined
          ? undefined
          : filters.is_within_radius,
    })
      .then((data) => {
        setList(Array.isArray(data) ? data : [])
      })
      .catch(() => setAlert({ type: 'error', message: t('attendance.errorLoad') }))
      .finally(() => setLoading(false))
  }, [
    token,
    filters.from,
    filters.to,
    filters.user_id,
    filters.status,
    filters.is_within_radius,
    canFilterAll,
    t,
  ])

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

  useEffect(() => {
    if (activeSection !== 'my') return undefined
    const id = setInterval(() => setDashboardTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [activeSection])

  useEffect(() => {
    if (!token || activeSection !== 'my') return undefined
    let cancelled = false
    getSettings(token)
      .then((res) => {
        if (cancelled) return
        const s = res?.data ?? res
        const loc = s?.company?.location
        const pol = s?.attendance?.policy
        const sysTz = s?.system?.preferences?.timezone
        const office =
          loc && loc.lat != null && loc.lng != null
            ? { lat: Number(loc.lat), lng: Number(loc.lng), radius_m: loc.radius_m }
            : null
        setWorkspaceSnapshot({
          office,
          policy: pol && typeof pol === 'object' ? pol : null,
          systemTimezone: typeof sysTz === 'string' ? sysTz : null,
        })
      })
      .catch(() => {
        if (!cancelled) setWorkspaceSnapshot({ office: null, policy: null, systemTimezone: null })
      })
    return () => {
      cancelled = true
    }
  }, [token, activeSection])

  const refreshUserLocation = useCallback(() => {
    setUserGeo((prev) => ({ ...prev, status: 'loading', error: null }))
    getCurrentPosition()
      .then((pos) => {
        setUserGeo({
          status: 'ok',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
          error: null,
          updatedAt: Date.now(),
        })
      })
      .catch((err) => {
        setUserGeo({
          status: 'error',
          lat: null,
          lng: null,
          accuracy: null,
          error: err?.message || 'denied',
          updatedAt: Date.now(),
        })
      })
  }, [])

  useEffect(() => {
    if (activeSection !== 'my') return
    refreshUserLocation()
  }, [activeSection, refreshUserLocation])

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
    if (!token || !canManageAttendanceExcuses) return
    setAdminExcusesLoading(true)
    adminListExcuses(token, { status: 'pending', per_page: 50 })
      .then((res) => {
        setAdminExcuses(Array.isArray(res?.items) ? res.items : [])
      })
      .catch(() => {
        setAdminExcuses([])
      })
      .finally(() => setAdminExcusesLoading(false))
  }, [token, canManageAttendanceExcuses])

  useEffect(() => {
    if (activeSection !== 'admin' || !canAdminAttendance || !token) return
    let cancelled = false
    setAdminLoading(true)
    const f = adminFiltersRef.current
    const params = {
      employee_id: f.employee_id || undefined,
      date_from: f.date_from || undefined,
      date_to: f.date_to || undefined,
      status: f.status || undefined,
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
  }, [
    activeSection,
    canAdminAttendance,
    token,
    adminRefresh,
    adminFilters.employee_id,
    adminFilters.date_from,
    adminFilters.date_to,
    adminFilters.status,
    adminFilters.is_within_radius,
    adminFilters.page,
    adminFilters.per_page,
  ])

  useEffect(() => {
    if (activeSection === 'admin' && canAdminAttendance) {
      setAdminRefresh((n) => n + 1)
    }
  }, [activeSection, canAdminAttendance])

  useEffect(() => {
    if (activeSection === 'admin' && canManageAttendanceExcuses) {
      loadAdminExcuses()
    }
  }, [activeSection, canManageAttendanceExcuses, loadAdminExcuses])

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
      refreshUserLocation()
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
      refreshUserLocation()
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('attendance.error') })
    } finally {
      setCheckOutSubmitting(false)
    }
  }

  const handleSubmitExcuse = async (e) => {
    e.preventDefault()
    if (!token) return
    const nextErrors = {}
    if (!excuseForm.date) nextErrors.date = t('attendance.date')
    if (!excuseForm.reason?.trim()) nextErrors.reason = t('attendance.excuses.reason')
    if (Object.keys(nextErrors).length > 0) {
      setExcuseErrors(nextErrors)
      return
    }
    setExcuseErrors({})
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
      setExcuseErrors({})
      loadMyExcuses()
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('attendance.error') })
    } finally {
      setExcuseSubmitting(false)
    }
  }

  const handleResetExcuseForm = () => {
    setExcuseForm({ date: today, reason: '', file: null })
    setExcuseErrors({})
  }

  const handleOpenAdminExcuseAttachment = async (id) => {
    if (!token) return
    setOpeningAttachmentId(id)
    setAlert(null)
    try {
      await openAdminExcuseAttachment(token, id)
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('attendance.error') })
    } finally {
      setOpeningAttachmentId(null)
    }
  }

  const handleOpenMyExcuseAttachment = async (id) => {
    if (!token) return
    setOpeningAttachmentId(id)
    setAlert(null)
    try {
      await openMyExcuseAttachment(token, id)
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('attendance.error') })
    } finally {
      setOpeningAttachmentId(null)
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
      if (canAdminAttendance) setAdminRefresh((n) => n + 1)
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

  const liveDashboard = useMemo(() => {
    const now = new Date(dashboardTick)
    const policy = workspaceSnapshot?.policy ?? {}
    const workdayStart = typeof policy.workday_start === 'string' ? policy.workday_start : '09:00'
    const workdayEnd = typeof policy.workday_end === 'string' ? policy.workday_end : '17:00'
    const enforceSchedule = policy.enforce_schedule === true || policy.enforce_schedule === 1
    const profileTz =
      outletUser?.timezone && typeof outletUser.timezone === 'string' && outletUser.timezone.trim() !== ''
        ? outletUser.timezone.trim()
        : null
    const systemTz =
      workspaceSnapshot?.systemTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    const workTz = myRecordToday?.timezone_used || profileTz || systemTz
    const refYmd =
      myRecordToday?.date ||
      todayData?.date ||
      formatYmdInTimeZone(now, workTz)

    const workEnd = wallClockToUtc(refYmd, workdayEnd, workTz)
    const workStart = wallClockToUtc(refYmd, workdayStart, workTz)

    let shiftPhase = 'not_in'
    if (hasCheckedIn && !hasCheckedOut) shiftPhase = 'on_shift'
    if (hasCheckedOut) shiftPhase = 'done'

    let elapsedMs = null
    if (hasCheckedIn && myRecordToday?.check_in_at) {
      const t0 = new Date(myRecordToday.check_in_at_local || myRecordToday.check_in_at).getTime()
      const t1 =
        hasCheckedOut && myRecordToday?.check_out_at
          ? new Date(myRecordToday.check_out_at_local || myRecordToday.check_out_at).getTime()
          : now.getTime()
      elapsedMs = Math.max(0, t1 - t0)
    }

    let remainingToEndMs = null
    if (shiftPhase === 'on_shift' && workEnd) {
      remainingToEndMs = Math.max(0, workEnd.getTime() - now.getTime())
    }

    let untilStartMs = null
    if (shiftPhase === 'not_in' && workStart && now.getTime() < workStart.getTime()) {
      untilStartMs = Math.max(0, workStart.getTime() - now.getTime())
    }

    const office = workspaceSnapshot?.office
    let distanceNowM = null
    if (
      office &&
      Number.isFinite(office.lat) &&
      Number.isFinite(office.lng) &&
      userGeo.status === 'ok' &&
      userGeo.lat != null &&
      userGeo.lng != null
    ) {
      distanceNowM = haversineMeters(userGeo.lat, userGeo.lng, office.lat, office.lng)
    }

    const radiusM =
      office?.radius_m != null && office.radius_m !== '' && Number.isFinite(Number(office.radius_m))
        ? Number(office.radius_m)
        : null

    const checkInMs = myRecordToday?.check_in_at
      ? new Date(myRecordToday.check_in_at_local || myRecordToday.check_in_at).getTime()
      : null
    const checkOutMs =
      hasCheckedOut && myRecordToday?.check_out_at
        ? new Date(myRecordToday.check_out_at_local || myRecordToday.check_out_at).getTime()
        : null

    let timelineNowPct = null
    if (checkInMs != null && workEnd) {
      const span = workEnd.getTime() - checkInMs
      if (span > 0) {
        const x = (now.getTime() - checkInMs) / span
        timelineNowPct = Math.min(100, Math.max(0, x * 100))
      }
    }

    let scheduleDayPct = null
    if (workStart && workEnd) {
      const span = workEnd.getTime() - workStart.getTime()
      if (span > 0) {
        scheduleDayPct = Math.min(100, Math.max(0, ((now.getTime() - workStart.getTime()) / span) * 100))
      }
    }

    const clockInBlockedBySchedule =
      enforceSchedule && workStart != null && now.getTime() < workStart.getTime()

    let expectedShiftDurationMs = null
    if (workStart && workEnd) {
      const span = workEnd.getTime() - workStart.getTime()
      if (span > 0) expectedShiftDurationMs = span
    }

    return {
      now,
      workTz,
      refYmd,
      workdayStart,
      workdayEnd,
      enforceSchedule,
      clockInBlockedBySchedule,
      workEnd,
      workStart,
      shiftPhase,
      elapsedMs,
      expectedShiftDurationMs,
      remainingToEndMs,
      untilStartMs,
      office,
      distanceNowM,
      radiusM,
      checkInMs,
      checkOutMs,
      timelineNowPct,
      scheduleDayPct,
    }
  }, [
    dashboardTick,
    workspaceSnapshot,
    myRecordToday,
    todayData,
    hasCheckedIn,
    hasCheckedOut,
    userGeo.status,
    userGeo.lat,
    userGeo.lng,
    outletUser?.timezone,
  ])

  const formatDashboardDuration = useCallback(
    (ms) => {
      const { h, m } = durationPartsFromMs(ms)
      return h > 0
        ? t('attendance.dashboard.durationHM', { h, m })
        : t('attendance.dashboard.durationM', { m })
    },
    [t]
  )

  const formatSignedDiff = useCallback(
    (diffMs) => {
      if (diffMs == null) return '—'
      const sign = diffMs > 0 ? '+' : diffMs < 0 ? '−' : ''
      return `${sign}${formatDashboardDuration(Math.abs(diffMs))}`
    },
    [formatDashboardDuration]
  )

  const shiftDurationCardState = useMemo(() => {
    const act = liveDashboard.elapsedMs
    if (act == null) return null
    const exp = liveDashboard.expectedShiftDurationMs
    const remaining = liveDashboard.remainingToEndMs
    const phase = liveDashboard.shiftPhase
    const hasSchedule = exp != null && exp > 0

    let progressPct = 0
    if (hasSchedule) {
      progressPct = Math.min(100, (act / exp) * 100)
    }

    const diffMs = hasSchedule ? act - exp : null
    const WARN_MS = 30 * 60 * 1000
    let status = 'neutral'
    if (hasSchedule) {
      if (diffMs > 60000) status = 'over'
      else if (
        phase === 'on_shift' &&
        remaining != null &&
        remaining > 0 &&
        remaining <= WARN_MS
      ) {
        status = 'warning'
      } else {
        status = 'ok'
      }
    }

    const ringSize = 144
    const ringStroke = 10
    const ringR = (ringSize - ringStroke) / 2
    const ringCircumference = 2 * Math.PI * ringR
    const ringCx = ringSize / 2
    const ringDashOffset = ringCircumference * (1 - progressPct / 100)

    return {
      act,
      exp,
      hasSchedule,
      progressPct,
      diffMs,
      status,
      ring: {
        size: ringSize,
        stroke: ringStroke,
        r: ringR,
        circumference: ringCircumference,
        cx: ringCx,
        cy: ringCx,
        dashOffset: ringDashOffset,
      },
    }
  }, [
    liveDashboard.elapsedMs,
    liveDashboard.expectedShiftDurationMs,
    liveDashboard.remainingToEndMs,
    liveDashboard.shiftPhase,
  ])

  const pageLoading = loading || statsLoading || checkInSubmitting || checkOutSubmitting

  const columns = useMemo(
    () => [
      {
        key: 'user_name',
        label: t('attendance.user'),
        sortable: true,
        render: (_, r) => {
          const name = r.user_name ?? r.employee_name
          if (name) return name
          if (currentUserId != null && Number(r.user_id) === Number(currentUserId) && outletUser?.name) {
            return outletUser.name
          }
          return '—'
        },
      },
      {
        key: 'date',
        label: t('attendance.date'),
        sortable: true,
        render: (_, r) => formatDateOnly(r.date, i18n.language),
      },
      { key: 'check_in_at', label: t('attendance.checkIn'), render: (_, r) => formatTime(r.check_in_at_local || r.check_in_at) },
      { key: 'check_out_at', label: t('attendance.checkOut'), render: (_, r) => formatTime(r.check_out_at_local || r.check_out_at) },
      {
        key: 'status',
        label: t('attendance.status'),
        sortable: true,
        render: (_, r) => renderAttendanceStatusBadge(t, r),
      },
      {
        key: 'worked_minutes',
        label: t('attendance.workedHours'),
        sortable: true,
        render: (_, r) => {
          const w = resolveWorkedMinutes(r, dashboardTick)
          if (!w) return '—'
          const hrs = `${(w.minutes / 60).toFixed(2)} h`
          return w.openShift ? `${hrs} (${t('attendance.shiftOpen')})` : hrs
        },
      },
      {
        key: 'distance_from_office_m',
        label: t('attendance.distanceM'),
        sortable: true,
        render: (_, r) => {
          const d = resolveDistanceM(r)
          return d != null ? Math.round(d) : '—'
        },
      },
    ],
    [t, i18n.language, currentUserId, outletUser?.name, dashboardTick]
  )

  const adminColumns = [
    { key: 'employee_name', label: t('attendance.user'), sortable: true },
    {
      key: 'date',
      label: t('attendance.date'),
      sortable: true,
      render: (_, r) => formatDateOnly(r.date, i18n.language),
    },
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
    {
      key: 'worked_hours',
      label: t('attendance.workedHours'),
      sortable: true,
      render: (_, r) => {
        if (r.worked_hours != null && Number.isFinite(Number(r.worked_hours))) {
          const hrs = `${Number(r.worked_hours).toFixed(2)} h`
          return r.shift_open ? `${hrs} (${t('attendance.shiftOpen')})` : hrs
        }
        return '—'
      },
    },
    {
      key: 'distance_from_office_m',
      label: t('attendance.distanceM'),
      sortable: true,
      render: (v) => (v != null ? Math.round(v) : '—'),
    },
    {
      key: 'status',
      label: t('attendance.status'),
      sortable: true,
      render: (_, r) => renderAttendanceStatusBadge(t, r),
    },
  ]

  const adminReportMetrics = useMemo(() => {
    const employeesCount = Array.isArray(adminSummary) ? adminSummary.length : 0
    const totalDays = Array.isArray(adminSummary)
      ? adminSummary.reduce((sum, row) => sum + Number(row.total_days || 0), 0)
      : 0
    const avgWorked =
      employeesCount > 0
        ? (
            adminSummary.reduce((sum, row) => sum + Number(row.avg_worked_hours || 0), 0) /
            employeesCount
          ).toFixed(2)
        : '0.00'
    const recordsCount = adminMeta?.total ?? sortedAdminItems.length ?? 0

    return {
      recordsCount,
      employeesCount,
      totalDays,
      avgWorked,
    }
  }, [adminSummary, adminMeta?.total, sortedAdminItems.length])

  return (
    <Container size="xl">
      <div className="clients-page attendance-page">
        <div className="mb-4">
          <Tabs tabs={sectionTabs} activeTab={activeSection} onChange={setActiveSection} className="attendance-section-tabs" />
        </div>

        {activeSection === 'my' && (
          <>
            <div className="attendance-dashboard" role="region" aria-label={t('attendance.dashboard.regionLabel')}>
              <div className="attendance-dashboard__card attendance-dashboard__time-location">
                <div className="attendance-dashboard__time-location-inner">
                  <section className="attendance-dashboard__section attendance-dashboard__section--time attendance-dashboard__time-location-primary">
                    <div className="attendance-dashboard__section-inner">
                  <div className="attendance-dashboard__timeline attendance-dashboard__timeline--visual" dir="ltr">
                    {(() => {
                      const pct =
                        liveDashboard.shiftPhase === 'on_shift' &&
                        liveDashboard.timelineNowPct != null
                          ? liveDashboard.timelineNowPct
                          : liveDashboard.scheduleDayPct
                      const softFill =
                        !(liveDashboard.shiftPhase === 'on_shift' && liveDashboard.timelineNowPct != null)
                      const safePct =
                        pct != null && Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0
                      const pctRounded = Math.round(safePct)
                      const nowLine =
                        liveDashboard.now.toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true,
                        })
                      return (
                        <>
                        <div
                          className="attendance-dashboard__shift-timeline"
                          role="group"
                          aria-label={`${t('attendance.dashboard.timelineSectionTitle')} ${t('attendance.dashboard.shiftProgressPercent', { pct: pctRounded })}`}
                        >
                          <span className="attendance-dashboard__shift-timeline-edge">
                            {formatWorkdayClockLabel(liveDashboard.workdayStart)}
                          </span>
                          <div className="attendance-dashboard__shift-timeline-core">
                            <div className="attendance-dashboard__shift-timeline-track-wrap">
                              <span
                                className="attendance-dashboard__shift-progress-pct attendance-dashboard__shift-progress-pct--on-track"
                                style={{ left: `${safePct}%` }}
                                title={t('attendance.dashboard.shiftProgressPercent', { pct: pctRounded })}
                              >
                                {t('attendance.dashboard.shiftProgressPercent', { pct: pctRounded })}
                              </span>
                              <div className="attendance-dashboard__timeline-track attendance-dashboard__timeline-track--shift">
                                <div
                                  className={
                                    softFill
                                      ? 'attendance-dashboard__timeline-fill attendance-dashboard__timeline-fill--soft'
                                      : 'attendance-dashboard__timeline-fill'
                                  }
                                  style={{ width: `${safePct}%` }}
                                />
                                <span
                                  className="attendance-dashboard__timeline-now"
                                  style={{ left: `${safePct}%` }}
                                />
                              </div>
                            </div>
                            <div className="attendance-dashboard__shift-timeline-below">
                              <div
                                className="attendance-dashboard__shift-timeline-now-card"
                                style={{ left: `${safePct}%` }}
                              >
                                <span className="attendance-dashboard__shift-timeline-arrow" aria-hidden>
                                  ↑
                                </span>
                                <span className="attendance-dashboard__shift-timeline-now-label">
                                  {t('attendance.dashboard.axisNow')}
                                </span>
                                <time
                                  className="attendance-dashboard__shift-timeline-now-clock"
                                  dateTime={liveDashboard.now.toISOString()}
                                  suppressHydrationWarning
                                >
                                  {nowLine}
                                </time>
                              </div>
                            </div>
                          </div>
                          <span className="attendance-dashboard__shift-timeline-edge">
                            {formatWorkdayClockLabel(liveDashboard.workdayEnd)}
                          </span>
                        </div>
                        </>
                      )
                    })()}
                  </div>

                  <div className="attendance-dashboard__shifts-section">
                    <div className="attendance-dashboard__pairs attendance-dashboard__pairs--with-stats">
                    <div className="attendance-dashboard__pair">
                      <div className="attendance-dashboard__pair-head-row">
                        <span className="attendance-dashboard__k">{t('attendance.dashboard.clockInTime')}</span>
                        <div className="attendance-dashboard__pair-inline">
                          <span className="attendance-dashboard__v">
                            {formatTime(myRecordToday?.check_in_at_local || myRecordToday?.check_in_at)}
                          </span>
                          <span
                            className={`attendance-dashboard__done-pill ${hasCheckedIn ? 'attendance-dashboard__done-pill--yes' : ''}`}
                          >
                            {hasCheckedIn ? t('attendance.yes') : t('attendance.dashboard.notYet')}
                          </span>
                        </div>
                      </div>
                      {todayLoading && (
                        <p className="attendance-dashboard__pair-loading">{t('attendance.loading')}</p>
                      )}
                      {!todayLoading && !hasCheckedIn && (
                        <div className="attendance-dashboard__pair-action">
                          <button
                            type="button"
                            className="attendance-btn attendance-btn--checkin page-header__btn page-header__btn--primary attendance-dashboard__clock-btn"
                            onClick={handleCheckIn}
                            disabled={checkInSubmitting || liveDashboard.clockInBlockedBySchedule}
                            aria-label={t('attendance.checkIn')}
                            title={
                              liveDashboard.clockInBlockedBySchedule
                                ? t('attendance.scheduleBlockBeforeStart', {
                                    start: liveDashboard.workdayStart,
                                    tz: liveDashboard.workTz,
                                  })
                                : t('attendance.checkIn')
                            }
                          >
                            <LogIn size={18} aria-hidden />
                            {checkInSubmitting ? t('attendance.saving') : t('attendance.checkIn')}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="attendance-dashboard__pair">
                      <div className="attendance-dashboard__pair-head-row">
                        <span className="attendance-dashboard__k">{t('attendance.dashboard.clockOutTime')}</span>
                        <div className="attendance-dashboard__pair-inline">
                          <span className="attendance-dashboard__v">
                            {formatTime(myRecordToday?.check_out_at_local || myRecordToday?.check_out_at)}
                          </span>
                          <span
                            className={`attendance-dashboard__done-pill ${hasCheckedOut ? 'attendance-dashboard__done-pill--yes' : ''}`}
                          >
                            {hasCheckedOut ? t('attendance.yes') : t('attendance.dashboard.notYet')}
                          </span>
                        </div>
                      </div>
                      {!todayLoading && hasCheckedIn && !hasCheckedOut && (
                        <div className="attendance-dashboard__pair-action">
                          <button
                            type="button"
                            className="attendance-btn attendance-btn--checkout page-header__btn attendance-dashboard__clock-btn"
                            onClick={handleCheckOut}
                            disabled={checkOutSubmitting}
                            aria-label={t('attendance.checkOut')}
                            title={t('attendance.checkOut')}
                          >
                            <LogOut size={18} aria-hidden />
                            {checkOutSubmitting ? t('attendance.saving') : t('attendance.checkOut')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
                </section>
                <section className="attendance-dashboard__section attendance-dashboard__section--shift">
                  <div className="attendance-dashboard__section-inner">
                  {shiftDurationCardState && (
                    <section
                      className="attendance-dashboard__shift-duration-card"
                      aria-label={t('attendance.dashboard.shiftDurationCardTitle')}
                    >
                      <div className="attendance-dashboard__shift-duration-card__body">
                        <div className="attendance-dashboard__shift-duration-card__ring-wrap">
                          <svg
                            className="attendance-dashboard__shift-ring-svg"
                            width={shiftDurationCardState.ring.size}
                            height={shiftDurationCardState.ring.size}
                            viewBox={`0 0 ${shiftDurationCardState.ring.size} ${shiftDurationCardState.ring.size}`}
                            aria-hidden
                          >
                            <circle
                              className="attendance-dashboard__shift-ring-track"
                              cx={shiftDurationCardState.ring.cx}
                              cy={shiftDurationCardState.ring.cy}
                              r={shiftDurationCardState.ring.r}
                              fill="none"
                              strokeWidth={shiftDurationCardState.ring.stroke}
                            />
                            <circle
                              className={`attendance-dashboard__shift-ring-progress attendance-dashboard__shift-ring-progress--${shiftDurationCardState.status}`}
                              cx={shiftDurationCardState.ring.cx}
                              cy={shiftDurationCardState.ring.cy}
                              r={shiftDurationCardState.ring.r}
                              fill="none"
                              strokeWidth={shiftDurationCardState.ring.stroke}
                              strokeLinecap="round"
                              strokeDasharray={shiftDurationCardState.ring.circumference}
                              strokeDashoffset={shiftDurationCardState.ring.dashOffset}
                              transform={`rotate(-90 ${shiftDurationCardState.ring.cx} ${shiftDurationCardState.ring.cy})`}
                            />
                          </svg>
                          <div className="attendance-dashboard__shift-duration-card__center">
                            <span className="attendance-dashboard__shift-duration-card__value">
                              {formatDashboardDuration(shiftDurationCardState.act)}
                            </span>
                            <span className="attendance-dashboard__shift-duration-card__actual-label">
                              {t('attendance.dashboard.actualTimeLabel')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="attendance-dashboard__shift-duration-card__footer">
                        {shiftDurationCardState.hasSchedule ? (
                          <>
                            <div className="attendance-dashboard__shift-duration-card__row">
                              <span className="attendance-dashboard__shift-duration-card__row-k">
                                {t('attendance.dashboard.scheduledDurationLabel')}
                              </span>
                              <span className="attendance-dashboard__shift-duration-card__row-v">
                                {formatDashboardDuration(shiftDurationCardState.exp)}
                              </span>
                            </div>
                            <div className="attendance-dashboard__shift-duration-card__row">
                              <span className="attendance-dashboard__shift-duration-card__row-k">
                                {t('attendance.dashboard.differenceLabel')}
                              </span>
                              <span
                                className={`attendance-dashboard__shift-duration-card__row-v attendance-dashboard__shift-duration-card__row-v--diff attendance-dashboard__shift-duration-card__row-v--${shiftDurationCardState.status}`}
                              >
                                {formatSignedDiff(shiftDurationCardState.diffMs)}
                              </span>
                            </div>
                          </>
                        ) : null}
                        <div
                          className={`attendance-dashboard__shift-duration-card__status attendance-dashboard__shift-duration-card__status--${shiftDurationCardState.status}`}
                        >
                          <span className="attendance-dashboard__shift-duration-card__status-dot" aria-hidden />
                          {shiftDurationCardState.status === 'ok' && t('attendance.dashboard.statusWithinTime')}
                          {shiftDurationCardState.status === 'over' && t('attendance.dashboard.statusLate')}
                          {shiftDurationCardState.status === 'warning' &&
                            t('attendance.dashboard.statusEndingSoon')}
                          {shiftDurationCardState.status === 'neutral' && t('attendance.dashboard.statusNeutral')}
                        </div>
                      </div>
                    </section>
                  )}
                  </div>
                </section>

                  <section className="attendance-dashboard__section attendance-dashboard__section--map attendance-dashboard__time-location-maps">
                    <div className="attendance-dashboard__section-inner">
                    <div className="attendance-dashboard__location-block">
                      <div className="attendance-dashboard__geo-cols">
                    <div className="attendance-dashboard__geo-block">
                      <div className="attendance-dashboard__geo-label">
                        <Building2 size={16} aria-hidden />
                        {t('attendance.locationPanel.office')}
                      </div>
                      {liveDashboard.office &&
                      Number.isFinite(liveDashboard.office.lat) &&
                      Number.isFinite(liveDashboard.office.lng) ? (
                        <div className="attendance-dashboard__office-map-wrap">
                          <LeafletOfficeMapPreview
                            key={`office-map-${liveDashboard.office.lat}-${liveDashboard.office.lng}-${userGeo.status === 'ok' ? `${userGeo.lat}-${userGeo.lng}` : 'nou'}`}
                            lat={liveDashboard.office.lat}
                            lng={liveDashboard.office.lng}
                            radiusMeters={liveDashboard.radiusM}
                            userLat={userGeo.status === 'ok' ? userGeo.lat : undefined}
                            userLng={userGeo.status === 'ok' ? userGeo.lng : undefined}
                          />
                        </div>
                      ) : (
                        <p className="attendance-dashboard__geo-empty">{t('attendance.locationPanel.noOffice')}</p>
                      )}
                    </div>
                    <div className="attendance-dashboard__geo-block">
                      <div className="attendance-dashboard__geo-label">
                        <MapPin size={16} aria-hidden />
                        {t('attendance.locationPanel.you')}
                      </div>
                      {userGeo.status === 'loading' && (
                        <p className="attendance-dashboard__geo-empty">{t('attendance.locationPanel.geoLoading')}</p>
                      )}
                      {userGeo.status === 'error' && (
                        <div className="attendance-dashboard__geo-error-alert" role="alert">
                          <div className="attendance-dashboard__geo-error-alert__head">
                            <AlertTriangle
                              className="attendance-dashboard__geo-error-alert__icon"
                              size={22}
                              aria-hidden
                            />
                            <strong className="attendance-dashboard__geo-error-alert__title">
                              {t('attendance.locationPanel.geoErrorTitle')}
                            </strong>
                          </div>
                          <p className="attendance-dashboard__geo-error-alert__hint">
                            {t('attendance.locationPanel.geoErrorInstructions')}
                          </p>
                        </div>
                      )}
                      {userGeo.status === 'ok' && userGeo.lat != null && userGeo.lng != null && (
                        <div className="attendance-dashboard__office-map-wrap">
                          <LeafletOfficeMapPreview
                            key={
                              liveDashboard.office &&
                              Number.isFinite(liveDashboard.office.lat) &&
                              Number.isFinite(liveDashboard.office.lng)
                                ? `you-office-${liveDashboard.office.lat}-${liveDashboard.office.lng}-${userGeo.lat}-${userGeo.lng}`
                                : `you-only-${userGeo.lat}-${userGeo.lng}`
                            }
                            lat={
                              liveDashboard.office &&
                              Number.isFinite(liveDashboard.office.lat) &&
                              Number.isFinite(liveDashboard.office.lng)
                                ? liveDashboard.office.lat
                                : undefined
                            }
                            lng={
                              liveDashboard.office &&
                              Number.isFinite(liveDashboard.office.lat) &&
                              Number.isFinite(liveDashboard.office.lng)
                                ? liveDashboard.office.lng
                                : undefined
                            }
                            radiusMeters={
                              liveDashboard.office &&
                              Number.isFinite(liveDashboard.office.lat) &&
                              Number.isFinite(liveDashboard.office.lng)
                                ? liveDashboard.radiusM
                                : undefined
                            }
                            userLat={userGeo.lat}
                            userLng={userGeo.lng}
                            ariaLabel={t('attendance.locationPanel.userMapAria')}
                          />
                        </div>
                      )}
                      {userGeo.status === 'ok' &&
                        userGeo.lat != null &&
                        userGeo.lng != null &&
                        userGeo.accuracy != null &&
                        Number.isFinite(userGeo.accuracy) && (
                          <p className="attendance-dashboard__geo-meta">
                            {t('attendance.locationPanel.accuracy', { m: Math.round(userGeo.accuracy) })}
                          </p>
                        )}
                      {userGeo.status === 'idle' && (
                        <p className="attendance-dashboard__geo-empty">{t('attendance.locationPanel.geoIdle')}</p>
                      )}
                    </div>
                  </div>
                  {(liveDashboard.distanceNowM != null || liveDashboard.clockInBlockedBySchedule) && (
                    <div className="attendance-dashboard__distance-banner">
                      {liveDashboard.distanceNowM != null && (
                        <>
                          <strong>{t('attendance.locationPanel.distanceNow')}</strong>
                          <span>
                            {Math.round(liveDashboard.distanceNowM)} {t('attendance.locationPanel.metersAbbr')}
                            {liveDashboard.radiusM != null ? (
                              <span
                                className={
                                  liveDashboard.distanceNowM <= liveDashboard.radiusM
                                    ? 'attendance-dashboard__radius-tag'
                                    : 'attendance-dashboard__radius-tag attendance-dashboard__radius-tag--warn'
                                }
                              >
                                {liveDashboard.distanceNowM <= liveDashboard.radiusM
                                  ? t('attendance.locationPanel.insideRadius')
                                  : t('attendance.locationPanel.outsideRadius')}
                              </span>
                            ) : null}
                          </span>
                        </>
                      )}
                      {liveDashboard.clockInBlockedBySchedule ? (
                        <p className="attendance-dashboard__schedule-block-alert" role="alert">
                          {t('attendance.scheduleBlockBeforeStart', {
                            start: liveDashboard.workdayStart,
                            tz: liveDashboard.workTz,
                          })}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
                  </div>
                </section>
                </div>
              </div>
            </div>

            {pageLoading && (
              <div className="clients-page-loader" aria-live="polite" aria-busy="true">
                <LoaderDots />
              </div>
            )}

            {stats && typeof stats === 'object' && (
              <div className="clients-stats-grid">
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

            <div className="clients-filters-card attendance-filters-card">
              <div className="clients-filters__row clients-filters__row--main">
                <div className="clients-filters__fields flex flex-wrap gap-2">
                  {canFilterAll && (
                    <select
                      value={filters.user_id}
                      onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value, page: 1 }))}
                      className="clients-input min-w-[10rem]"
                      aria-label={t('attendance.filters.employee')}
                    >
                      <option value="">{t('attendance.filters.allEmployees')}</option>
                      {employeeOptions.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
                    className="clients-input"
                    aria-label={t('attendance.from')}
                  />
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
                    className="clients-input"
                    aria-label={t('attendance.to')}
                  />
                  <select
                    className="clients-input min-w-[8rem]"
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                    aria-label={t('attendance.status')}
                  >
                    <option value="">{t('attendance.admin.all')}</option>
                    <option value="on_time">on_time</option>
                    <option value="late">late</option>
                    <option value="early_leave">early_leave</option>
                    <option value="absent">absent</option>
                    <option value="excused">excused</option>
                  </select>
                  <select
                    className="clients-input min-w-[8rem]"
                    value={filters.is_within_radius}
                    onChange={(e) => setFilters((f) => ({ ...f, is_within_radius: e.target.value, page: 1 }))}
                    aria-label={t('attendance.withinRadius')}
                  >
                    <option value="">{t('attendance.admin.all')}</option>
                    <option value="1">{t('attendance.yes')}</option>
                    <option value="0">{t('attendance.no')}</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="clients-filters__clear clients-filters__btn-icon"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      from: today,
                      to: today,
                      user_id: '',
                      status: '',
                      is_within_radius: '',
                      page: 1,
                    }))
                  }
                  aria-label={t('attendance.refresh')}
                  title={t('attendance.refresh')}
                >
                  <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
                </button>
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
          <div className="space-y-6">
            <div className="clients-filters-card attendance-excuse-card">
              <div className="clients-filters__row clients-filters__row--main">
                <div className="min-w-0 flex-1">
                  <h2 className="attendance-excuse-title">{t('attendance.excuses.submitTitle')}</h2>
                  <p className="attendance-excuse-subtitle">{t('attendance.excuses.submitHint')}</p>
                </div>
              </div>

              <form className="attendance-excuse-form" onSubmit={handleSubmitExcuse}>
                <div className="attendance-excuse-grid">
                  <label className="settings-input-wrap">
                    <span className="settings-input-label">{t('attendance.date')}</span>
                    <input
                      type="date"
                      lang={i18n.language}
                      className={`clients-input ${excuseErrors.date ? 'attendance-input--error' : ''}`}
                      value={excuseForm.date}
                      onChange={(e) => {
                        setExcuseForm((f) => ({ ...f, date: e.target.value }))
                        if (excuseErrors.date) setExcuseErrors((prev) => ({ ...prev, date: undefined }))
                      }}
                      required
                    />
                    {excuseErrors.date && (
                      <span className="attendance-field-error">
                        {t('attendance.excuses.requiredField', { field: excuseErrors.date })}
                      </span>
                    )}
                  </label>

                  <label className="settings-input-wrap">
                    <span className="settings-input-label">{t('attendance.excuses.attachment')}</span>
                    <div className="attendance-file-upload">
                      <label className="page-header__btn attendance-file-upload__choose">
                        <Paperclip size={16} aria-hidden />
                        <span>{t('attendance.excuses.chooseFile')}</span>
                        <input
                          type="file"
                          className="attendance-file-upload__input"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => setExcuseForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                        />
                      </label>
                      {excuseForm.file ? (
                        <div className="attendance-file-upload__selected">
                          <span className="attendance-file-upload__name">{excuseForm.file.name}</span>
                          <button
                            type="button"
                            className="clients-filters__btn-icon"
                            onClick={() => setExcuseForm((f) => ({ ...f, file: null }))}
                            aria-label={t('attendance.excuses.removeFile')}
                            title={t('attendance.excuses.removeFile')}
                          >
                            <XCircle className="clients-filters__btn-icon-svg" aria-hidden />
                          </button>
                        </div>
                      ) : (
                        <span className="attendance-file-upload__hint">{t('attendance.excuses.noFile')}</span>
                      )}
                    </div>
                  </label>

                  <label className="settings-input-wrap attendance-excuse-grid__full">
                    <span className="settings-input-label">{t('attendance.excuses.reason')}</span>
                    <textarea
                      className={`clients-input min-h-[120px] ${excuseErrors.reason ? 'attendance-input--error' : ''}`}
                      value={excuseForm.reason}
                      onChange={(e) => {
                        setExcuseForm((f) => ({ ...f, reason: e.target.value }))
                        if (excuseErrors.reason) setExcuseErrors((prev) => ({ ...prev, reason: undefined }))
                      }}
                      placeholder={t('attendance.excuses.reasonPlaceholder')}
                      required
                    />
                    {excuseErrors.reason && (
                      <span className="attendance-field-error">
                        {t('attendance.excuses.requiredField', { field: excuseErrors.reason })}
                      </span>
                    )}
                  </label>
                </div>

                <div className="attendance-excuse-actions">
                  <button type="button" className="page-header__btn" onClick={handleResetExcuseForm} disabled={excuseSubmitting}>
                    {t('attendance.excuses.reset')}
                  </button>
                  <button type="submit" className="page-header__btn page-header__btn--primary" disabled={excuseSubmitting}>
                    {excuseSubmitting ? t('attendance.saving') : t('attendance.excuses.submit')}
                  </button>
                </div>
              </form>
            </div>

            <div className="clients-filters-card attendance-my-excuses-card">
              <div className="attendance-my-excuses-head">
                <h2 className="text-lg font-semibold">{t('attendance.excuses.myList')}</h2>
                <span className="attendance-my-excuses-count">{myExcuses.length}</span>
              </div>
              {excusesLoading ? (
                <LoaderDots />
              ) : myExcuses.length === 0 ? (
                <p className="clients-empty">{t('attendance.excuses.empty')}</p>
              ) : (
                <ul className="attendance-my-excuses-list">
                  {myExcuses.map((ex) => (
                    <li key={ex.id} className="attendance-my-excuses-item">
                      <div className="attendance-my-excuses-item__head">
                        <span className="attendance-my-excuses-item__date">{formatDateOnly(ex.date, i18n.language)}</span>
                        <span className={`attendance-my-excuses-item__status attendance-my-excuses-item__status--${String(ex.status || '').toLowerCase()}`}>
                          {excuseStatusLabel(t, ex.status)}
                        </span>
                      </div>
                      <p className="attendance-my-excuses-item__reason">{ex.reason}</p>
                      {(ex.has_attachment || ex.attachment_path) && (
                        <div className="attendance-my-excuses-item__attachment">
                          <button
                            type="button"
                            className="page-header__btn inline-flex items-center gap-2 text-sm"
                            disabled={openingAttachmentId === ex.id}
                            onClick={() => handleOpenMyExcuseAttachment(ex.id)}
                          >
                            <Paperclip size={16} aria-hidden />
                            {openingAttachmentId === ex.id ? t('attendance.saving') : t('attendance.excuses.viewAttachment')}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeSection === 'admin' && canShowAdminTab && (
          <div className="space-y-6">
            {canAdminAttendance ? (
              <>
            <div className="attendance-admin-metrics">
              <StatsCard title={t('attendance.admin.records', 'Records')} value={adminReportMetrics.recordsCount} icon={<Clock className="h-6 w-6" />} variant="blue" />
              <StatsCard title={t('attendance.admin.employees', 'Employees')} value={adminReportMetrics.employeesCount} icon={<UserX className="h-6 w-6" />} variant="green" />
              <StatsCard title={t('attendance.admin.totalDays', 'Total days')} value={adminReportMetrics.totalDays} icon={<Timer className="h-6 w-6" />} variant="amber" />
              <StatsCard title={t('attendance.admin.avgWorkedHours', 'Avg worked hours')} value={adminReportMetrics.avgWorked} icon={<Building2 className="h-6 w-6" />} variant="default" />
            </div>

            <div className="clients-filters-card attendance-admin-card">
              <div className="clients-filters__row clients-filters__row--main">
                <div className="clients-filters__fields flex flex-wrap gap-2">
                  <select
                    className="clients-input min-w-[10rem]"
                    value={adminFilters.employee_id}
                    onChange={(e) => setAdminFilters((f) => ({ ...f, employee_id: e.target.value, page: 1 }))}
                    aria-label={t('attendance.filters.employee')}
                  >
                    <option value="">{t('attendance.filters.allEmployees')}</option>
                    {employeeOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className="clients-input"
                    value={adminFilters.date_from}
                    onChange={(e) => setAdminFilters((f) => ({ ...f, date_from: e.target.value, page: 1 }))}
                    aria-label={t('attendance.from')}
                  />
                  <input
                    type="date"
                    className="clients-input"
                    value={adminFilters.date_to}
                    onChange={(e) => setAdminFilters((f) => ({ ...f, date_to: e.target.value, page: 1 }))}
                    aria-label={t('attendance.to')}
                  />
                  <select
                    className="clients-input min-w-[8rem]"
                    value={adminFilters.status}
                    onChange={(e) => setAdminFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                    aria-label={t('attendance.status')}
                  >
                    <option value="">{t('attendance.admin.all')}</option>
                    <option value="on_time">on_time</option>
                    <option value="late">late</option>
                    <option value="early_leave">early_leave</option>
                    <option value="absent">absent</option>
                    <option value="excused">excused</option>
                  </select>
                  <select
                    className="clients-input min-w-[8rem]"
                    value={adminFilters.is_within_radius}
                    onChange={(e) => setAdminFilters((f) => ({ ...f, is_within_radius: e.target.value, page: 1 }))}
                    aria-label={t('attendance.withinRadius')}
                  >
                    <option value="">{t('attendance.admin.all')}</option>
                    <option value="1">{t('attendance.yes')}</option>
                    <option value="0">{t('attendance.no')}</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="clients-filters__clear clients-filters__btn-icon"
                  onClick={() =>
                    setAdminFilters((f) => ({
                      ...f,
                      employee_id: '',
                      date_from: today,
                      date_to: today,
                      status: '',
                      is_within_radius: '',
                      page: 1,
                    }))
                  }
                  aria-label={t('attendance.refresh')}
                  title={t('attendance.refresh')}
                >
                  <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
                </button>
                <div className="clients-filters__actions">
                  <button
                    type="button"
                    className="clients-filters__btn-icon clients-filters__btn-icon--export"
                    onClick={exportAdminCsv}
                    aria-label={t('attendance.admin.exportCsv')}
                    title={t('attendance.admin.exportCsv')}
                  >
                    <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
                  </button>
                </div>
              </div>
            </div>

            {adminLoading ? (
              <LoaderDots />
            ) : (
              <>
                <div className="clients-filters-card attendance-admin-card">
                  <h3 className="attendance-admin-section-title">{t('attendance.admin.detailsTitle')}</h3>
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
                </div>
                {adminMeta && adminMeta.total > 0 && adminMeta.last_page > 0 && (
                  <div className="clients-pagination">
                    <div className="clients-pagination__left">
                      <span className="clients-pagination__total">
                        {t('attendance.total')}: {adminMeta.total}
                      </span>
                      <label className="clients-pagination__per-page">
                        <span className="clients-pagination__per-page-label">{t('attendance.perPage')}</span>
                        <select
                          value={adminFilters.per_page}
                          onChange={(e) =>
                            setAdminFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))
                          }
                          className="clients-select clients-pagination__select"
                          aria-label={t('attendance.perPage')}
                        >
                          {[10, 15, 25, 50, 100].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <Pagination
                      currentPage={adminMeta.current_page}
                      totalPages={Math.max(1, adminMeta.last_page)}
                      onPageChange={(page) => setAdminFilters((f) => ({ ...f, page }))}
                    />
                  </div>
                )}
              </>
            )}

            <div className="clients-filters-card attendance-admin-card">
              <h3 className="attendance-admin-section-title">{t('attendance.admin.summaryTitle')}</h3>
              {adminSummary.length === 0 ? (
                <p className="clients-empty">{t('attendance.admin.summaryEmpty')}</p>
              ) : (
                <Table
                  columns={[
                    { key: 'employee_name', label: t('attendance.user'), sortable: false },
                    { key: 'total_days', label: t('attendance.admin.totalDays'), sortable: false },
                    { key: 'late_count', label: t('attendance.statsLate'), sortable: false },
                    { key: 'absent_count', label: t('attendance.statsAbsent'), sortable: false },
                    { key: 'avg_worked_hours', label: t('attendance.admin.avgWorkedHours'), sortable: false },
                  ]}
                  data={adminSummary}
                  getRowKey={(r) => r.employee_id}
                />
              )}
            </div>
              </>
            ) : null}

            {canManageAttendanceExcuses ? (
              <>
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
                      <span>{formatDateOnly(ex.date, i18n.language)}</span>
                    </div>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{ex.reason}</p>
                    {(ex.has_attachment || ex.attachment_path) && (
                      <div className="mt-2">
                        <button
                          type="button"
                          className="page-header__btn inline-flex items-center gap-2 text-sm"
                          disabled={excuseActionId === ex.id || openingAttachmentId === ex.id}
                          onClick={() => handleOpenAdminExcuseAttachment(ex.id)}
                        >
                          <Paperclip size={16} aria-hidden />
                          {openingAttachmentId === ex.id ? t('attendance.saving') : t('attendance.admin.viewAttachment')}
                        </button>
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
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
              </>
            ) : null}
          </div>
        )}

        {alert && (
          <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        )}
      </div>
    </Container>
  )
}
