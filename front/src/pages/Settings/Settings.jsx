import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Search, RotateCcw } from 'lucide-react'
import { getStoredToken } from '../Login'
import { Container } from '../../components/Container'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import Tabs from '../../components/Tabs'
import { Table } from '../../components/Table'
import {
  getSettings,
  updateCompanyProfile,
  updateCompanyLocation,
  updateSystemPreferences,
  updateNotificationPreferences,
  updateSessionSettings,
  updateAttendancePolicy,
  getTodaySession,
  listSessionsHistory,
  logoutOtherSessions,
  listActivities,
  listShipmentStatuses,
  createShipmentStatus,
  updateShipmentStatus,
  deleteShipmentStatus,
} from '../../api/settings'
import '../../components/PageHeader/PageHeader.css'
import '../../components/LoaderDots/LoaderDots.css'
import '../../components/Tabs/Tabs.css'
import '../Clients/Clients.css'
import '../CustomerServices/styles/CustomerServices.css'
import './Settings.css'
import GoogleMapsCompanyLocationPicker from '../../components/GoogleMapsCompanyLocationPicker/GoogleMapsCompanyLocationPicker'

function SectionCard({ title, subtitle, children, actions, compact }) {
  return (
    <section className={`settings-section-card ${compact ? 'settings-section-card--compact' : ''}`.trim()}>
      <header className="settings-section-header">
        <div className="settings-section-title-wrap">
          <h2 className="settings-section-title">{title}</h2>
          {subtitle ? <p className="settings-section-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="settings-section-actions">{actions}</div> : null}
      </header>
      <div className="settings-section-body">{children}</div>
    </section>
  )
}

function Input({ label, className = '', ...props }) {
  return (
    <label className={`settings-input-wrap ${className}`.trim()}>
      <span className="settings-input-label">{label}</span>
      <input {...props} className="clients-input settings-input" />
    </label>
  )
}

function CheckboxRow({ label, checked, onChange }) {
  return (
    <label className="settings-checkbox-row">
      <span className="settings-checkbox-label">{label}</span>
      <input type="checkbox" className="settings-checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

const SETTINGS_TABS = [
  { id: 'company', labelKey: 'settings.tabs.company' },
  { id: 'system', labelKey: 'settings.tabs.system' },
  { id: 'sessions', labelKey: 'settings.tabs.sessions' },
  { id: 'activity', labelKey: 'settings.tabs.activity' },
  { id: 'shipment-statuses', labelKey: 'settings.tabs.shipmentStatuses' },
]

export default function Settings() {
  const { user } = useOutletContext() || {}
  const token = getStoredToken()
  const { t, i18n } = useTranslation()
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [alert, setAlert] = useState(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('company')

  const [companyProfile, setCompanyProfile] = useState({
    name_ar: '',
    name_en: '',
    phone: '',
    email: '',
    address: '',
    commercial_register: '',
    tax_card: '',
  })
  const [companyLocation, setCompanyLocation] = useState({ lat: '', lng: '', radius_m: '' })
  const [systemPrefs, setSystemPrefs] = useState({
    timezone: '',
    currency: '',
    date_format: '',
    default_tax_pct: '',
  })
  const [notifPrefs, setNotifPrefs] = useState({
    shipments: true,
    finance: true,
    crm: true,
    email: false,
    docs_expiry: true,
  })
  const [sessionSettings, setSessionSettings] = useState({
    reset_hour: 0,
    idle_logout_minutes: 30,
  })

  const [todaySession, setTodaySession] = useState(null)
  const [sessionsHistory, setSessionsHistory] = useState([])
  const [sessionsFilters, setSessionsFilters] = useState({ from: '', to: '' })
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const [activities, setActivities] = useState([])
  const [activityFilters, setActivityFilters] = useState({ from: '', to: '', event: '' })
  const [activityLoading, setActivityLoading] = useState(false)

  const [shipmentStatuses, setShipmentStatuses] = useState([])
  const [showShipmentStatusModal, setShowShipmentStatusModal] = useState(false)
  const [editingShipmentStatus, setEditingShipmentStatus] = useState(null)
  const [deleteShipmentStatusId, setDeleteShipmentStatusId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [shipmentStatusForm, setShipmentStatusForm] = useState({
    name_ar: '',
    name_en: '',
    color: '#3B82F6',
    description: '',
    active: true,
    sort_order: 0,
  })

  const isAdminLike = useMemo(() => {
    const primaryRole = user?.primary_role ?? user?.roles?.[0]
    const name = (primaryRole || '').toString().toLowerCase()
    return name === 'admin' || name === 'sales_manager'
  }, [user])

  const csTabs = useMemo(() => {
    const tabs = SETTINGS_TABS.filter((tab) => tab.id !== 'shipment-statuses' || isAdminLike)
    return tabs.map((tab) => ({ id: tab.id, label: t(tab.labelKey) }))
  }, [isAdminLike, t])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [settingsRes, todayRes, historyRes, activitiesRes, statusesRes] = await Promise.all([
          getSettings(token),
          getTodaySession(token).catch(() => null),
          listSessionsHistory(token, {}).catch(() => ({ data: [] })),
          listActivities(token, {}).catch(() => ({ data: [] })),
          listShipmentStatuses(token).catch(() => ({ data: [] })),
        ])

        if (cancelled) return

        const s = settingsRes?.data ?? settingsRes
        const company = s.company || {}
        const system = s.system || {}
        const notifications = s.notifications || {}
        const sessions = s.sessions || {}

        setCompanyProfile((prev) => ({ ...prev, ...(company.profile || {}) }))
        setCompanyLocation(() => {
          const loc = company.location || {}
          return {
            lat: loc.lat != null ? String(loc.lat) : '',
            lng: loc.lng != null ? String(loc.lng) : '',
            radius_m: loc.radius_m != null ? String(loc.radius_m) : '',
          }
        })
        setSystemPrefs((prev) => ({ ...prev, ...(system.preferences || {}) }))
        setNotifPrefs((prev) => ({ ...prev, ...(notifications.preferences || {}) }))
        setSessionSettings({
          reset_hour: sessions.reset_hour ?? 0,
          idle_logout_minutes: sessions.idle_logout_minutes ?? 30,
        })

        const ap = s.attendance?.policy
        if (ap && typeof ap === 'object') {
          setAttendancePolicy((prev) => ({
            ...prev,
            grace_minutes: ap.grace_minutes ?? prev.grace_minutes,
            workday_start: ap.workday_start ?? prev.workday_start,
            workday_end: ap.workday_end ?? prev.workday_end,
            enforce_geofence: Boolean(ap.enforce_geofence),
            enforce_schedule: Boolean(ap.enforce_schedule),
            require_location: ap.require_location !== undefined ? Boolean(ap.require_location) : prev.require_location,
          }))
        }

        setTodaySession(todayRes?.data ?? todayRes ?? null)
        setSessionsHistory(Array.isArray(historyRes?.data) ? historyRes.data : [])
        setActivities(Array.isArray(activitiesRes?.data) ? activitiesRes.data : [])
        setShipmentStatuses(Array.isArray(statusesRes?.data) ? statusesRes.data : [])
      } catch (e) {
        if (!cancelled) setError(e.message || t('settings.errors.load'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, t])

  async function handleSaveCompanyProfile(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      await updateCompanyProfile(token, companyProfile)
      setAlert({ type: 'success', message: t('settings.company.saveProfile') })
    } catch (e) {
      setError(e.message || t('settings.errors.saveCompanyProfile'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCompanyLocation(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const lat = parseFloat(companyLocation.lat)
      const lng = parseFloat(companyLocation.lng)
      const radius = parseInt(companyLocation.radius_m, 10)

      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius) || radius <= 0) {
        throw new Error('Invalid company location values.')
      }

      await updateCompanyLocation(token, {
        lat,
        lng,
        radius_m: radius,
      })
      setAlert({ type: 'success', message: t('settings.company.saveLocation') })
    } catch (e) {
      setError(e.message || t('settings.errors.saveLocation'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSystemPrefs(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      await updateSystemPreferences(token, {
        ...systemPrefs,
        default_tax_pct: systemPrefs.default_tax_pct ? Number(systemPrefs.default_tax_pct) : null,
      })
      setAlert({ type: 'success', message: t('settings.system.saveSystem') })
    } catch (e) {
      setError(e.message || t('settings.errors.saveSystem'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveNotifPrefs(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      await updateNotificationPreferences(token, notifPrefs)
      setAlert({ type: 'success', message: t('settings.system.saveNotifications') })
    } catch (e) {
      setError(e.message || t('settings.errors.saveNotifications'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSessionSettings(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      await updateSessionSettings(token, {
        reset_hour: Number(sessionSettings.reset_hour),
        idle_logout_minutes: Number(sessionSettings.idle_logout_minutes),
      })
      setAlert({ type: 'success', message: t('settings.sessions.saveSessionSettings') })
    } catch (e) {
      setError(e.message || t('settings.errors.saveSessions'))
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAttendancePolicy(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const res = await updateAttendancePolicy(token, {
        grace_minutes: Number(attendancePolicy.grace_minutes),
        workday_start: attendancePolicy.workday_start,
        workday_end: attendancePolicy.workday_end,
        enforce_geofence: attendancePolicy.enforce_geofence,
        enforce_schedule: attendancePolicy.enforce_schedule,
        require_location: attendancePolicy.require_location,
      })
      const policy = res?.data?.policy ?? res?.policy
      if (policy && typeof policy === 'object') {
        setAttendancePolicy((prev) => ({ ...prev, ...policy }))
      }
      setAlert({ type: 'success', message: t('settings.attendancePolicy.saved') })
    } catch (e) {
      setError(e.message || t('settings.errors.saveAttendancePolicy'))
    } finally {
      setSaving(false)
    }
  }

  async function refreshSessions() {
    if (!token) return
    setSessionsLoading(true)
    setError('')
    try {
      const [todayRes, historyRes] = await Promise.all([
        getTodaySession(token).catch(() => null),
        listSessionsHistory(token, sessionsFilters).catch(() => ({ data: [] })),
      ])
      setTodaySession(todayRes?.data ?? todayRes ?? null)
      setSessionsHistory(Array.isArray(historyRes?.data) ? historyRes.data : [])
    } catch (e) {
      setError(e.message || t('settings.errors.refreshSessions'))
    } finally {
      setSessionsLoading(false)
    }
  }

  async function refreshActivities() {
    if (!token) return
    setActivityLoading(true)
    setError('')
    try {
      const res = await listActivities(token, activityFilters)
      setActivities(Array.isArray(res?.data) ? res.data : [])
    } catch (e) {
      setError(e.message || t('settings.errors.refreshActivity'))
    } finally {
      setActivityLoading(false)
    }
  }

  async function handleLogoutOthers() {
    if (!token) return
    setError('')
    try {
      await logoutOtherSessions(token)
      await refreshSessions()
      setAlert({ type: 'success', message: t('settings.sessions.logoutOthers') })
    } catch (e) {
      setError(e.message || t('settings.errors.logoutOthers'))
    }
  }

  function openNewShipmentStatus() {
    setEditingShipmentStatus(null)
    setShipmentStatusForm({
      name_ar: '',
      name_en: '',
      color: '#3B82F6',
      description: '',
      active: true,
      sort_order: 0,
    })
    setShowShipmentStatusModal(true)
  }

  function openEditShipmentStatus(status) {
    setEditingShipmentStatus(status)
    setShipmentStatusForm({
      name_ar: status.name_ar || '',
      name_en: status.name_en || '',
      color: status.color || '#3B82F6',
      description: status.description || '',
      active: !!status.active,
      sort_order: status.sort_order ?? 0,
    })
    setShowShipmentStatusModal(true)
  }

  async function handleSaveShipmentStatus(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const payload = { ...shipmentStatusForm, sort_order: Number(shipmentStatusForm.sort_order || 0) }
      if (editingShipmentStatus) {
        await updateShipmentStatus(token, editingShipmentStatus.id, payload)
      } else {
        await createShipmentStatus(token, payload)
      }
      const res = await listShipmentStatuses(token)
      setShipmentStatuses(Array.isArray(res?.data) ? res.data : [])
      setShowShipmentStatusModal(false)
      setEditingShipmentStatus(null)
      setAlert({ type: 'success', message: editingShipmentStatus ? t('settings.shipmentStatuses.update') : t('settings.shipmentStatuses.create') })
    } catch (e) {
      setError(e.message || t('settings.errors.saveShipmentStatus'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteShipmentStatusConfirm() {
    if (!token || !deleteShipmentStatusId) return
    setDeleteSubmitting(true)
    setError('')
    try {
      await deleteShipmentStatus(token, deleteShipmentStatusId)
      const res = await listShipmentStatuses(token)
      setShipmentStatuses(Array.isArray(res?.data) ? res.data : [])
      setDeleteShipmentStatusId(null)
      setAlert({ type: 'success', message: t('settings.shipmentStatuses.delete') })
    } catch (e) {
      setError(e.message || t('settings.errors.deleteShipmentStatus'))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const sessionsHistoryColumns = [
    { key: 'session_date', label: t('settings.sessions.table.date'), sortable: false },
    { key: 'first_seen_at', label: t('settings.sessions.table.firstSeen'), sortable: false, render: (val) => (val ? new Date(val).toLocaleTimeString() : '—') },
    { key: 'last_seen_at', label: t('settings.sessions.table.lastSeen'), sortable: false, render: (val) => (val ? new Date(val).toLocaleTimeString() : '—') },
    { key: 'total_active_minutes', label: t('settings.sessions.table.totalActivityMinutes'), sortable: false },
  ]

  const activityColumns = [
    { key: 'created_at', label: t('settings.activity.table.time'), sortable: false, render: (val) => (val ? new Date(val).toLocaleString() : '—') },
    { key: 'event', label: t('settings.activity.table.event'), sortable: false, render: (val, row) => val || row.log_name || '—' },
    { key: 'description', label: t('settings.activity.table.description'), sortable: false, render: (val) => val || '—' },
  ]

  const shipmentStatusColumns = [
    { key: 'name_ar', label: t('settings.shipmentStatuses.table.nameAr'), sortable: false },
    { key: 'name_en', label: t('settings.shipmentStatuses.table.nameEn'), sortable: false, render: (val) => val || '—' },
    { key: 'color', label: t('settings.shipmentStatuses.table.color'), sortable: false, render: (val, row) => (
      <span className="settings-status-badge" style={{ backgroundColor: val || '#3B82F6' }}>
        {row.name_ar || row.name_en || '—'}
      </span>
    ) },
    { key: 'active', label: t('settings.shipmentStatuses.table.active'), sortable: false, render: (val) => (val ? t('common.yes', 'Yes') : t('common.no', 'No')) },
    {
      key: 'actions',
      label: t('settings.shipmentStatuses.table.actions'),
      sortable: false,
      render: (_, row) => (
        <div className="cs-table-actions">
          <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" onClick={() => openEditShipmentStatus(row)}>
            {t('settings.shipmentStatuses.edit')}
          </button>
          <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" style={{ color: 'var(--danger, #dc3545)' }} onClick={() => setDeleteShipmentStatusId(row.id)}>
            {t('settings.shipmentStatuses.delete')}
          </button>
        </div>
      ),
    },
  ]

  if (!token) {
    return (
      <Container size="xl">
        <div className="settings-page">
          <p className="clients-empty">{t('login.required', 'You must be logged in to view settings.')}</p>
        </div>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <div className="settings-page settings-page-enter" data-active-tab={activeTab}>
        <div className="settings-tabs-wrap cs-tabs-wrap">
          <Tabs tabs={csTabs} activeTab={activeTab} onChange={setActiveTab} className="cs-tabs settings-tabs" />
        </div>

        {(error || alert) && (
          <div className="settings-alerts">
            {error && <Alert variant="error" message={error} onClose={() => setError('')} />}
            {alert && <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
          </div>
        )}

        {loading ? (
          <div className="cs-loading-wrap">
            <LoaderDots />
          </div>
        ) : (
          <>
            {/* Tab: Company */}
            <div role="tabpanel" className={`cs-tab-panel settings-tab-panel ${activeTab === 'company' ? 'cs-tab-panel--active' : ''}`}>
              {activeTab === 'company' && (
                <div className="settings-tab-content settings-tab-content--animate">
                  <div className="settings-cards-grid settings-cards-grid--two">
                    <SectionCard title={t('settings.company.profileTitle')} subtitle={t('settings.company.cardTitle')}>
                      <form className="settings-form settings-form--stacked" onSubmit={handleSaveCompanyProfile}>
                        <div className="settings-form-group">
                          <Input label={t('settings.company.nameAr')} value={companyProfile.name_ar} onChange={(e) => setCompanyProfile((p) => ({ ...p, name_ar: e.target.value }))} />
                          <Input label={t('settings.company.nameEn')} value={companyProfile.name_en} onChange={(e) => setCompanyProfile((p) => ({ ...p, name_en: e.target.value }))} />
                        </div>
                        <div className="settings-form-row">
                          <Input label={t('settings.company.phone')} value={companyProfile.phone} onChange={(e) => setCompanyProfile((p) => ({ ...p, phone: e.target.value }))} />
                          <Input label={t('settings.company.email')} type="email" value={companyProfile.email} onChange={(e) => setCompanyProfile((p) => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div className="settings-form-group">
                          <Input label={t('settings.company.address')} value={companyProfile.address} onChange={(e) => setCompanyProfile((p) => ({ ...p, address: e.target.value }))} />
                        </div>
                        <div className="settings-form-row">
                          <Input label={t('settings.company.commercialRegister')} value={companyProfile.commercial_register} onChange={(e) => setCompanyProfile((p) => ({ ...p, commercial_register: e.target.value }))} />
                          <Input label={t('settings.company.taxCard')} value={companyProfile.tax_card} onChange={(e) => setCompanyProfile((p) => ({ ...p, tax_card: e.target.value }))} />
                        </div>
                        <div className="settings-form-actions">
                          <button type="submit" disabled={saving} className="page-header__btn page-header__btn--primary">
                            {t('settings.company.saveProfile')}
                          </button>
                        </div>
                      </form>
                    </SectionCard>
                    <SectionCard title={t('settings.company.locationTitle')} subtitle={t('settings.company.locationHint')}>
                      <form className="settings-form settings-form--stacked" onSubmit={handleSaveCompanyLocation}>
                        <GoogleMapsCompanyLocationPicker
                          value={companyLocation}
                          onChange={(next) => setCompanyLocation(next)}
                          disabled={saving}
                        />
                        <div className="settings-form-actions">
                          <button type="submit" disabled={saving} className="page-header__btn page-header__btn--primary">
                            {t('settings.company.saveLocation')}
                          </button>
                        </div>
                      </form>
                    </SectionCard>
                    {isAdminLike && (
                      <SectionCard title={t('settings.attendancePolicy.title')} subtitle={t('settings.attendancePolicy.subtitle')} compact>
                        <form className="settings-form settings-form--stacked" onSubmit={handleSaveAttendancePolicy}>
                          <div className="settings-form-row">
                            <Input
                              label={t('settings.attendancePolicy.graceMinutes')}
                              type="number"
                              min="0"
                              max="240"
                              value={attendancePolicy.grace_minutes}
                              onChange={(e) => setAttendancePolicy((p) => ({ ...p, grace_minutes: e.target.value }))}
                            />
                            <Input
                              label={t('settings.attendancePolicy.workdayStart')}
                              type="time"
                              value={attendancePolicy.workday_start}
                              onChange={(e) => setAttendancePolicy((p) => ({ ...p, workday_start: e.target.value }))}
                            />
                            <Input
                              label={t('settings.attendancePolicy.workdayEnd')}
                              type="time"
                              value={attendancePolicy.workday_end}
                              onChange={(e) => setAttendancePolicy((p) => ({ ...p, workday_end: e.target.value }))}
                            />
                          </div>
                          <div className="settings-checkbox-group">
                            <CheckboxRow
                              label={t('settings.attendancePolicy.enforceGeofence')}
                              checked={attendancePolicy.enforce_geofence}
                              onChange={(v) => setAttendancePolicy((p) => ({ ...p, enforce_geofence: v }))}
                            />
                            <CheckboxRow
                              label={t('settings.attendancePolicy.enforceSchedule')}
                              checked={attendancePolicy.enforce_schedule}
                              onChange={(v) => setAttendancePolicy((p) => ({ ...p, enforce_schedule: v }))}
                            />
                            <CheckboxRow
                              label={t('settings.attendancePolicy.requireLocation')}
                              checked={attendancePolicy.require_location}
                              onChange={(v) => setAttendancePolicy((p) => ({ ...p, require_location: v }))}
                            />
                          </div>
                          <div className="settings-form-actions">
                            <button type="submit" disabled={saving} className="page-header__btn page-header__btn--primary">
                              {t('settings.attendancePolicy.save')}
                            </button>
                          </div>
                        </form>
                      </SectionCard>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Tab: System & Notifications */}
            <div role="tabpanel" className={`cs-tab-panel settings-tab-panel ${activeTab === 'system' ? 'cs-tab-panel--active' : ''}`}>
              {activeTab === 'system' && (
                <div className="settings-tab-content settings-tab-content--animate">
                  <div className="settings-cards-grid settings-cards-grid--two">
                    <SectionCard title={t('settings.system.systemTitle')} subtitle={t('settings.system.cardTitle')}>
                      <form className="settings-form settings-form--stacked" onSubmit={handleSaveSystemPrefs}>
                        <div className="settings-form-row">
                          <Input label={t('settings.system.timezone')} value={systemPrefs.timezone} onChange={(e) => setSystemPrefs((p) => ({ ...p, timezone: e.target.value }))} />
                          <Input label={t('settings.system.currency')} value={systemPrefs.currency} onChange={(e) => setSystemPrefs((p) => ({ ...p, currency: e.target.value }))} />
                        </div>
                        <div className="settings-form-row">
                          <Input label={t('settings.system.dateFormat')} value={systemPrefs.date_format} onChange={(e) => setSystemPrefs((p) => ({ ...p, date_format: e.target.value }))} />
                          <Input label={t('settings.system.defaultTax')} type="number" value={systemPrefs.default_tax_pct} onChange={(e) => setSystemPrefs((p) => ({ ...p, default_tax_pct: e.target.value }))} />
                        </div>
                        <div className="settings-form-actions">
                          <button type="submit" disabled={saving} className="page-header__btn page-header__btn--primary">
                            {t('settings.system.saveSystem')}
                          </button>
                        </div>
                      </form>
                    </SectionCard>
                    <SectionCard title={t('settings.system.notificationsTitle')} subtitle={t('settings.system.cardTitle')}>
                      <form className="settings-form settings-form--stacked" onSubmit={handleSaveNotifPrefs}>
                        <div className="settings-checkbox-group">
                          <CheckboxRow label={t('settings.system.shipments')} checked={notifPrefs.shipments} onChange={(v) => setNotifPrefs((p) => ({ ...p, shipments: v }))} />
                          <CheckboxRow label={t('settings.system.finance')} checked={notifPrefs.finance} onChange={(v) => setNotifPrefs((p) => ({ ...p, finance: v }))} />
                          <CheckboxRow label={t('settings.system.crm')} checked={notifPrefs.crm} onChange={(v) => setNotifPrefs((p) => ({ ...p, crm: v }))} />
                          <CheckboxRow label={t('settings.system.email')} checked={notifPrefs.email} onChange={(v) => setNotifPrefs((p) => ({ ...p, email: v }))} />
                          <CheckboxRow label={t('settings.system.docsExpiry')} checked={notifPrefs.docs_expiry} onChange={(v) => setNotifPrefs((p) => ({ ...p, docs_expiry: v }))} />
                        </div>
                        <div className="settings-form-actions">
                          <button type="submit" disabled={saving} className="page-header__btn page-header__btn--primary">
                            {t('settings.system.saveNotifications')}
                          </button>
                        </div>
                      </form>
                    </SectionCard>
                  </div>
                </div>
              )}
            </div>

            {/* Tab: Sessions */}
            <div role="tabpanel" className={`cs-tab-panel settings-tab-panel ${activeTab === 'sessions' ? 'cs-tab-panel--active' : ''}`}>
              {activeTab === 'sessions' && (
                <div className="settings-tab-content settings-tab-content--animate">
                  <SectionCard title={t('settings.sessions.cardTitle')} compact actions={
                    <button type="button" className="page-header__btn page-header__btn--primary" onClick={handleLogoutOthers}>
                      {t('settings.sessions.logoutOthers')}
                    </button>
                  }>
                    <form className="settings-inline-form" onSubmit={handleSaveSessionSettings}>
                      <Input label={t('settings.sessions.resetHour')} type="number" min="0" max="23" value={sessionSettings.reset_hour} onChange={(e) => setSessionSettings((p) => ({ ...p, reset_hour: e.target.value }))} />
                      <Input label={t('settings.sessions.idleLogoutMinutes')} type="number" min="1" value={sessionSettings.idle_logout_minutes} onChange={(e) => setSessionSettings((p) => ({ ...p, idle_logout_minutes: e.target.value }))} />
                      <button type="submit" disabled={saving} className="page-header__btn page-header__btn--primary">
                        {t('settings.sessions.saveSessionSettings')}
                      </button>
                    </form>
                  </SectionCard>

                  <SectionCard title={t('settings.sessions.todayTitle')}>
                    <div className="settings-table-card">
                      <div className="settings-today-table-wrap">
                        <table className="responsive-table__table w-full border-collapse text-sm">
                          <thead>
                            <tr>
                              <th className="responsive-table__th">{t('settings.sessions.table.user')}</th>
                              <th className="responsive-table__th">{t('settings.sessions.table.date')}</th>
                              <th className="responsive-table__th">{t('settings.sessions.table.firstSeen')}</th>
                              <th className="responsive-table__th">{t('settings.sessions.table.lastSeen')}</th>
                              <th className="responsive-table__th">{t('settings.sessions.table.totalActivityMinutes')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {todaySession ? (
                              <tr>
                                <td className="responsive-table__td">{todaySession.user_name || user?.name || todaySession.user_id || '—'}</td>
                                <td className="responsive-table__td">{todaySession.session_date}</td>
                                <td className="responsive-table__td">{todaySession.first_seen_at ? new Date(todaySession.first_seen_at).toLocaleTimeString() : '—'}</td>
                                <td className="responsive-table__td">{todaySession.last_seen_at ? new Date(todaySession.last_seen_at).toLocaleTimeString() : '—'}</td>
                                <td className="responsive-table__td">{todaySession.total_active_minutes ?? Math.floor((todaySession.total_active_seconds || 0) / 60)}</td>
                              </tr>
                            ) : (
                              <tr>
                                <td colSpan={5} className="responsive-table__td clients-empty">
                                  {t('settings.sessions.noToday')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title={t('settings.sessions.historyTitle')} actions={
                    <button type="button" className="page-header__btn page-header__btn--primary" onClick={refreshSessions} disabled={sessionsLoading}>
                      {sessionsLoading ? t('clients.loading', 'Loading…') : t('settings.sessions.refresh')}
                    </button>
                  }>
                    <div className="settings-filters-bar clients-filters-card">
                      <div className="clients-filters__row clients-filters__row--main">
                        <div className="clients-filters__search-wrap" dir={dir}>
                          <Search className="clients-filters__search-icon" aria-hidden />
                          <input
                            type="date"
                            value={sessionsFilters.from}
                            onChange={(e) => setSessionsFilters((f) => ({ ...f, from: e.target.value }))}
                            className="clients-input clients-filters__search"
                            aria-label={t('settings.sessions.from')}
                          />
                        </div>
                        <input type="date" value={sessionsFilters.to} onChange={(e) => setSessionsFilters((f) => ({ ...f, to: e.target.value }))} className="clients-input" aria-label={t('settings.sessions.to')} />
                        <button type="button" className="clients-filters__clear clients-filters__btn-icon" onClick={() => setSessionsFilters({ from: '', to: '' })} aria-label={t('customerServices.clearFilters')}>
                          <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
                        </button>
                        <div className="clients-filters__actions">
                          <button type="button" className="page-header__btn page-header__btn--primary" onClick={refreshSessions} disabled={sessionsLoading}>
                            {t('settings.sessions.apply')}
                          </button>
                        </div>
                      </div>
                    </div>
                    {sessionsLoading ? (
                      <div className="cs-loading-wrap">
                        <LoaderDots />
                      </div>
                    ) : (
                      <div className="settings-table-card">
                        <Table columns={sessionsHistoryColumns} data={sessionsHistory} getRowKey={(r) => r.id} emptyMessage={t('settings.sessions.noHistory')} />
                      </div>
                    )}
                  </SectionCard>
                </div>
              )}
            </div>

            {/* Tab: Activity */}
            <div role="tabpanel" className={`cs-tab-panel settings-tab-panel ${activeTab === 'activity' ? 'cs-tab-panel--active' : ''}`}>
              {activeTab === 'activity' && (
                <div className="settings-tab-content settings-tab-content--animate">
                  <SectionCard
                    title={t('settings.activity.cardTitle')}
                    actions={
                      <button type="button" className="page-header__btn page-header__btn--primary" onClick={refreshActivities} disabled={activityLoading}>
                        {activityLoading ? t('clients.loading', 'Loading…') : t('settings.activity.refresh')}
                      </button>
                    }
                  >
                    <div className="settings-filters-bar clients-filters-card">
                      <div className="clients-filters__row clients-filters__row--main">
                        <div className="clients-filters__search-wrap" dir={dir}>
                          <Search className="clients-filters__search-icon" aria-hidden />
                          <input
                            type="date"
                            value={activityFilters.from}
                            onChange={(e) => setActivityFilters((f) => ({ ...f, from: e.target.value }))}
                            className="clients-input clients-filters__search"
                            aria-label={t('settings.activity.from')}
                          />
                        </div>
                        <input type="date" value={activityFilters.to} onChange={(e) => setActivityFilters((f) => ({ ...f, to: e.target.value }))} className="clients-input" aria-label={t('settings.activity.to')} />
                        <input
                          type="text"
                          placeholder={t('settings.activity.table.event')}
                          value={activityFilters.event}
                          onChange={(e) => setActivityFilters((f) => ({ ...f, event: e.target.value }))}
                          className="clients-input"
                        />
                        <button type="button" className="clients-filters__clear clients-filters__btn-icon" onClick={() => setActivityFilters({ from: '', to: '', event: '' })} aria-label={t('customerServices.clearFilters')}>
                          <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
                        </button>
                        <div className="clients-filters__actions">
                          <button type="button" className="page-header__btn page-header__btn--primary" onClick={refreshActivities} disabled={activityLoading}>
                            {t('settings.activity.apply')}
                          </button>
                        </div>
                      </div>
                    </div>
                    {activityLoading ? (
                      <div className="cs-loading-wrap">
                        <LoaderDots />
                      </div>
                    ) : (
                      <div className="settings-table-card">
                        <Table columns={activityColumns} data={activities} getRowKey={(r) => r.id} emptyMessage={t('settings.activity.empty')} />
                      </div>
                    )}
                  </SectionCard>
                </div>
              )}
            </div>

            {/* Tab: Shipment Statuses */}
            {isAdminLike && (
              <div role="tabpanel" className={`cs-tab-panel settings-tab-panel ${activeTab === 'shipment-statuses' ? 'cs-tab-panel--active' : ''}`}>
                {activeTab === 'shipment-statuses' && (
                  <div className="settings-tab-content settings-tab-content--animate">
                    <SectionCard
                      title={t('settings.shipmentStatuses.cardTitle')}
                      actions={
                        <button type="button" className="page-header__btn page-header__btn--primary" onClick={openNewShipmentStatus}>
                          {t('settings.shipmentStatuses.addTitle')}
                        </button>
                      }
                    >
                      <div className="settings-table-card">
                        <Table columns={shipmentStatusColumns} data={shipmentStatuses} getRowKey={(r) => r.id} emptyMessage={t('settings.shipmentStatuses.noStatuses')} />
                      </div>
                    </SectionCard>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal: Create/Edit Shipment Status */}
        {showShipmentStatusModal && (
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="settings-shipment-status-modal-title">
            <div className="clients-modal-backdrop" onClick={() => { setShowShipmentStatusModal(false); setEditingShipmentStatus(null) }} />
            <div className="clients-modal-content">
              <h2 id="settings-shipment-status-modal-title">{editingShipmentStatus ? t('settings.shipmentStatuses.editTitle') : t('settings.shipmentStatuses.addTitle')}</h2>
              <form onSubmit={handleSaveShipmentStatus} className="settings-modal-form">
                <Input label={t('settings.shipmentStatuses.nameAr')} value={shipmentStatusForm.name_ar} onChange={(e) => setShipmentStatusForm((p) => ({ ...p, name_ar: e.target.value }))} />
                <Input label={t('settings.shipmentStatuses.nameEn')} value={shipmentStatusForm.name_en} onChange={(e) => setShipmentStatusForm((p) => ({ ...p, name_en: e.target.value }))} />
                <Input label={t('settings.shipmentStatuses.color')} value={shipmentStatusForm.color} onChange={(e) => setShipmentStatusForm((p) => ({ ...p, color: e.target.value }))} />
                <Input label={t('settings.shipmentStatuses.description')} value={shipmentStatusForm.description} onChange={(e) => setShipmentStatusForm((p) => ({ ...p, description: e.target.value }))} />
                <Input label={t('settings.shipmentStatuses.sortOrder')} type="number" value={shipmentStatusForm.sort_order} onChange={(e) => setShipmentStatusForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <label className="settings-checkbox-row">
                  <span className="settings-checkbox-label">{t('settings.shipmentStatuses.active')}</span>
                  <input type="checkbox" checked={shipmentStatusForm.active} onChange={(e) => setShipmentStatusForm((p) => ({ ...p, active: e.target.checked }))} className="settings-checkbox" />
                </label>
                <div className="clients-modal-actions">
                  <button type="button" className="clients-btn" onClick={() => { setShowShipmentStatusModal(false); setEditingShipmentStatus(null) }}>
                    {t('settings.shipmentStatuses.cancel')}
                  </button>
                  <button type="submit" disabled={saving} className="clients-btn clients-btn--primary">
                    {saving ? t('clients.saving', 'Saving…') : editingShipmentStatus ? t('settings.shipmentStatuses.update') : t('settings.shipmentStatuses.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Shipment Status */}
        {deleteShipmentStatusId != null && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => setDeleteShipmentStatusId(null)} />
            <div className="clients-modal-content">
              <h2>{t('settings.shipmentStatuses.deleteConfirmTitle', 'Delete Shipment Status')}</h2>
              <p>{t('settings.shipmentStatuses.deleteConfirm')}</p>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setDeleteShipmentStatusId(null)} disabled={deleteSubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteShipmentStatusConfirm} disabled={deleteSubmitting}>
                  {deleteSubmitting ? t('clients.deleting') : t('clients.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
