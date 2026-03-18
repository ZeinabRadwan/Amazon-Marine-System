import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Container from '../../components/Container/Container'
import '../../components/PageHeader/PageHeader.css'
import {
  getSettings,
  updateCompanyProfile,
  updateCompanyLocation,
  updateSystemPreferences,
  updateNotificationPreferences,
  updateSessionSettings,
  getTodaySession,
  listSessionsHistory,
  logoutOtherSessions,
  listActivities,
  listShipmentStatuses,
  createShipmentStatus,
  updateShipmentStatus,
  deleteShipmentStatus,
} from '../../api/settings'

function SectionCard({ title, children, actions }) {
  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

function Input({ label, ...props }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-200">
      <span>{label}</span>
      <input
        {...props}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      />
    </label>
  )
}

function CheckboxRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
      <div className="text-sm text-gray-800 dark:text-gray-100">{label}</div>
      <input type="checkbox" className="h-4 w-4" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  )
}

export default function Settings() {
  const { token, user } = useOutletContext() || {}
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [activeTab, setActiveTab] = useState('company') // company | system | sessions | activity | shipment-statuses

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

  const [activities, setActivities] = useState([])
  const [activityFilters, setActivityFilters] = useState({ from: '', to: '' })

  const [shipmentStatuses, setShipmentStatuses] = useState([])
  const [editingShipmentStatus, setEditingShipmentStatus] = useState(null)
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

        const s = settingsRes?.data || {}
        const company = s.company || {}
        const system = s.system || {}
        const notifications = s.notifications || {}
        const sessions = s.sessions || {}

        setCompanyProfile(prev => ({
          ...prev,
          ...(company.profile || {}),
        }))
        setCompanyLocation(() => {
          const loc = company.location || {}
          return {
            lat: loc.lat != null ? String(loc.lat) : '',
            lng: loc.lng != null ? String(loc.lng) : '',
            radius_m: loc.radius_m != null ? String(loc.radius_m) : '',
          }
        })
        setSystemPrefs(prev => ({
          ...prev,
          ...(system.preferences || {}),
        }))
        setNotifPrefs(prev => ({
          ...prev,
          ...(notifications.preferences || {}),
        }))
        setSessionSettings({
          reset_hour: sessions.reset_hour ?? 0,
          idle_logout_minutes: sessions.idle_logout_minutes ?? 30,
        })

        setTodaySession(todayRes?.data || null)
        setSessionsHistory(historyRes?.data || [])
        setActivities(activitiesRes?.data || [])
        setShipmentStatuses(statusesRes?.data || [])
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSaveCompanyProfile(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const body = { ...companyProfile }
      await updateCompanyProfile(token, body)
    } catch (e) {
      setError(e.message || 'Failed to save company profile')
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
      const body = {
        lat: parseFloat(companyLocation.lat),
        lng: parseFloat(companyLocation.lng),
        radius_m: companyLocation.radius_m ? parseInt(companyLocation.radius_m, 10) : null,
      }
      await updateCompanyLocation(token, body)
    } catch (e) {
      setError(e.message || 'Failed to save company location')
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
    } catch (e) {
      setError(e.message || 'Failed to save system settings')
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
    } catch (e) {
      setError(e.message || 'Failed to save notification settings')
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
    } catch (e) {
      setError(e.message || 'Failed to save session settings')
    } finally {
      setSaving(false)
    }
  }

  async function refreshSessions() {
    if (!token) return
    setError('')
    try {
      const [todayRes, historyRes] = await Promise.all([
        getTodaySession(token).catch(() => null),
        listSessionsHistory(token, sessionsFilters).catch(() => ({ data: [] })),
      ])
      setTodaySession(todayRes?.data || null)
      setSessionsHistory(historyRes?.data || [])
    } catch (e) {
      setError(e.message || 'Failed to refresh sessions')
    }
  }

  async function refreshActivities() {
    if (!token) return
    setError('')
    try {
      const res = await listActivities(token, activityFilters)
      setActivities(res?.data || [])
    } catch (e) {
      setError(e.message || 'Failed to refresh activity history')
    }
  }

  async function handleLogoutOthers() {
    if (!token) return
    setError('')
    try {
      await logoutOtherSessions(token)
      await refreshSessions()
    } catch (e) {
      setError(e.message || 'Failed to logout other sessions')
    }
  }

  function startNewShipmentStatus() {
    setEditingShipmentStatus(null)
    setShipmentStatusForm({
      name_ar: '',
      name_en: '',
      color: '#3B82F6',
      description: '',
      active: true,
      sort_order: 0,
    })
  }

  function startEditShipmentStatus(status) {
    setEditingShipmentStatus(status)
    setShipmentStatusForm({
      name_ar: status.name_ar || '',
      name_en: status.name_en || '',
      color: status.color || '#3B82F6',
      description: status.description || '',
      active: !!status.active,
      sort_order: status.sort_order ?? 0,
    })
  }

  async function handleSaveShipmentStatus(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...shipmentStatusForm,
        sort_order: Number(shipmentStatusForm.sort_order || 0),
      }
      if (editingShipmentStatus) {
        await updateShipmentStatus(token, editingShipmentStatus.id, payload)
      } else {
        await createShipmentStatus(token, payload)
      }
      const res = await listShipmentStatuses(token)
      setShipmentStatuses(res?.data || [])
      startNewShipmentStatus()
    } catch (e) {
      setError(e.message || 'Failed to save shipment status')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteShipmentStatus(status) {
    if (!token) return
    if (!window.confirm(`Delete shipment status "${status.name_ar || status.name_en || status.id}"?`)) return
    setError('')
    try {
      await deleteShipmentStatus(token, status.id)
      const res = await listShipmentStatuses(token)
      setShipmentStatuses(res?.data || [])
    } catch (e) {
      setError(e.message || 'Failed to delete shipment status')
    }
  }

  if (!token) {
    return (
      <Container size="xl">
        <div className="page-content">
          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
            {t('login.required', 'You must be logged in to view settings.')}
          </div>
        </div>
      </Container>
    )
  }

  if (loading) {
    return (
      <Container size="xl">
        <div className="page-content">
          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">
            {t('settings.loading', 'Loading settings…')}
          </div>
        </div>
      </Container>
    )
  }

  return (
    <Container size="xl">
      <div className="page-content">
        <div className="flex gap-6">
          {/* Sidebar nav – similar spirit to UI/settings.html, full-height card inside page content */}
          <nav className="w-64 shrink-0 space-y-1 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-900">
            <button
              type="button"
              onClick={() => setActiveTab('company')}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left ${
                activeTab === 'company'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{t('settings.tabs.company', 'Company')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left ${
                activeTab === 'system'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{t('settings.tabs.system', 'System & Notifications')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left ${
                activeTab === 'sessions'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{t('settings.tabs.sessions', 'Session Management')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left ${
                activeTab === 'activity'
                  ? 'bg-sky-600 text-white'
                  : 'text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{t('settings.tabs.activity', 'Activity History')}</span>
            </button>
            {isAdminLike && (
              <button
                type="button"
                onClick={() => setActiveTab('shipment-statuses')}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left ${
                  activeTab === 'shipment-statuses'
                    ? 'bg-sky-600 text-white'
                    : 'text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>{t('settings.tabs.shipmentStatuses', 'Shipment Statuses')}</span>
              </button>
            )}
          </nav>

          {/* Content panel */}
          <div className="flex-1 space-y-6">
            <header className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t('settings.title', 'System Settings')}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t(
                  'settings.subtitle',
                  'Manage company information, notifications, and session behaviour.'
                )}
              </p>
            </header>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/40 dark:text-red-100">
                {error}
              </div>
            )}

            {activeTab === 'company' && (
              <SectionCard title={t('settings.company.cardTitle', 'Company')}>
        <div className="grid gap-4 md:grid-cols-2">
          <form className="space-y-3" onSubmit={handleSaveCompanyProfile}>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {t('settings.company.profileTitle', 'Company Profile')}
            </h3>
            <Input
              label={t('settings.company.nameAr', 'اسم الشركة (عربي)')}
              value={companyProfile.name_ar}
              onChange={e => setCompanyProfile(p => ({ ...p, name_ar: e.target.value }))}
            />
            <Input
              label={t('settings.company.nameEn', 'Company Name (English)')}
              value={companyProfile.name_en}
              onChange={e => setCompanyProfile(p => ({ ...p, name_en: e.target.value }))}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label={t('settings.company.phone', 'Phone')}
                value={companyProfile.phone}
                onChange={e => setCompanyProfile(p => ({ ...p, phone: e.target.value }))}
              />
              <Input
                label={t('settings.company.email', 'Email')}
                type="email"
                value={companyProfile.email}
                onChange={e => setCompanyProfile(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <Input
              label={t('settings.company.address', 'Address')}
              value={companyProfile.address}
              onChange={e => setCompanyProfile(p => ({ ...p, address: e.target.value }))}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label={t('settings.company.commercialRegister', 'Commercial Register')}
                value={companyProfile.commercial_register}
                onChange={e => setCompanyProfile(p => ({ ...p, commercial_register: e.target.value }))}
              />
              <Input
                label={t('settings.company.taxCard', 'Tax Card')}
                value={companyProfile.tax_card}
                onChange={e => setCompanyProfile(p => ({ ...p, tax_card: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
            >
              {t('settings.company.saveProfile', 'Save Company Profile')}
            </button>
          </form>

          <form className="space-y-3" onSubmit={handleSaveCompanyLocation}>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {t('settings.company.locationTitle', 'Company Location (Attendance)')}
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label={t('settings.company.lat', 'Latitude')}
                value={companyLocation.lat}
                onChange={e => setCompanyLocation(p => ({ ...p, lat: e.target.value }))}
              />
              <Input
                label={t('settings.company.lng', 'Longitude')}
                value={companyLocation.lng}
                onChange={e => setCompanyLocation(p => ({ ...p, lng: e.target.value }))}
              />
              <Input
                label={t('settings.company.radius', 'Radius (m)')}
                value={companyLocation.radius_m}
                onChange={e => setCompanyLocation(p => ({ ...p, radius_m: e.target.value }))}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t(
                'settings.company.locationHint',
                'This location will be used when evaluating employee attendance.'
              )}
            </p>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
            >
              {t('settings.company.saveLocation', 'Save Location')}
            </button>
          </form>
        </div>
              </SectionCard>
            )}

            {activeTab === 'system' && (
              <SectionCard title={t('settings.system.cardTitle', 'System & Notifications')}>
        <div className="grid gap-4 md:grid-cols-2">
          <form className="space-y-3" onSubmit={handleSaveSystemPrefs}>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {t('settings.system.systemTitle', 'System')}
            </h3>
            <Input
              label={t('settings.system.timezone', 'Timezone')}
              value={systemPrefs.timezone}
              onChange={e => setSystemPrefs(p => ({ ...p, timezone: e.target.value }))}
            />
            <Input
              label={t('settings.system.currency', 'Currency')}
              value={systemPrefs.currency}
              onChange={e => setSystemPrefs(p => ({ ...p, currency: e.target.value }))}
            />
            <Input
              label={t('settings.system.dateFormat', 'Date Format')}
              value={systemPrefs.date_format}
              onChange={e => setSystemPrefs(p => ({ ...p, date_format: e.target.value }))}
            />
            <Input
              label={t('settings.system.defaultTax', 'Default Tax (%)')}
              type="number"
              value={systemPrefs.default_tax_pct}
              onChange={e => setSystemPrefs(p => ({ ...p, default_tax_pct: e.target.value }))}
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
            >
              {t('settings.system.saveSystem', 'Save System Settings')}
            </button>
          </form>

          <form className="space-y-3" onSubmit={handleSaveNotifPrefs}>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {t('settings.system.notificationsTitle', 'Notifications')}
            </h3>
            <CheckboxRow
              label={t('settings.system.shipments', 'Shipments notifications')}
              checked={notifPrefs.shipments}
              onChange={v => setNotifPrefs(p => ({ ...p, shipments: v }))}
            />
            <CheckboxRow
              label={t('settings.system.finance', 'Finance notifications')}
              checked={notifPrefs.finance}
              onChange={v => setNotifPrefs(p => ({ ...p, finance: v }))}
            />
            <CheckboxRow
              label={t('settings.system.crm', 'CRM notifications')}
              checked={notifPrefs.crm}
              onChange={v => setNotifPrefs(p => ({ ...p, crm: v }))}
            />
            <CheckboxRow
              label={t('settings.system.email', 'Send via email')}
              checked={notifPrefs.email}
              onChange={v => setNotifPrefs(p => ({ ...p, email: v }))}
            />
            <CheckboxRow
              label={t('settings.system.docsExpiry', 'Document expiry reminders')}
              checked={notifPrefs.docs_expiry}
              onChange={v => setNotifPrefs(p => ({ ...p, docs_expiry: v }))}
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
            >
              {t('settings.system.saveNotifications', 'Save Notification Settings')}
            </button>
          </form>
        </div>
              </SectionCard>
            )}

            {activeTab === 'sessions' && (
              <SectionCard
        title={t('settings.sessions.cardTitle', 'Session Management')}
        actions={
          <button
            type="button"
            onClick={handleLogoutOthers}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Logout Other Sessions
          </button>
        }
      >
        <form className="mb-4 grid gap-3 md:grid-cols-3" onSubmit={handleSaveSessionSettings}>
          <Input
            label="Reset hour (0–23)"
            type="number"
            min="0"
            max="23"
            value={sessionSettings.reset_hour}
            onChange={e => setSessionSettings(p => ({ ...p, reset_hour: e.target.value }))}
          />
          <Input
            label="Idle logout (minutes)"
            type="number"
            min="1"
            value={sessionSettings.idle_logout_minutes}
            onChange={e => setSessionSettings(p => ({ ...p, idle_logout_minutes: e.target.value }))}
          />
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
            >
              Save Session Settings
            </button>
          </div>
        </form>

        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Today Sessions</h3>
          <button
            type="button"
            onClick={refreshSessions}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Session Date</th>
                <th className="px-3 py-2">First Seen</th>
                <th className="px-3 py-2">Last Seen</th>
                <th className="px-3 py-2">Total Activity (min)</th>
              </tr>
            </thead>
            <tbody>
              {todaySession ? (
                <tr className="border-b border-gray-100 text-gray-800 dark:border-gray-800 dark:text-gray-100">
                  <td className="px-3 py-2">{todaySession.user_name || user?.name || todaySession.user_id}</td>
                  <td className="px-3 py-2">{todaySession.session_date}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                    {todaySession.first_seen_at ? new Date(todaySession.first_seen_at).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                    {todaySession.last_seen_at ? new Date(todaySession.last_seen_at).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-3 py-2 font-semibold">
                    {todaySession.total_active_minutes ?? Math.floor((todaySession.total_active_seconds || 0) / 60)}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400" colSpan={5}>
                    No activity recorded yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Sessions History</h3>
            <div className="flex flex-wrap items-end gap-2">
              <Input
                label="From"
                type="date"
                value={sessionsFilters.from}
                onChange={e => setSessionsFilters(p => ({ ...p, from: e.target.value }))}
              />
              <Input
                label="To"
                type="date"
                value={sessionsFilters.to}
                onChange={e => setSessionsFilters(p => ({ ...p, to: e.target.value }))}
              />
              <button
                type="button"
                onClick={refreshSessions}
                className="mb-1 inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
              >
                Apply
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">First Seen</th>
                  <th className="px-3 py-2">Last Seen</th>
                  <th className="px-3 py-2">Total Activity (min)</th>
                </tr>
              </thead>
              <tbody>
                {sessionsHistory.length === 0 ? (
                  <tr>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400" colSpan={4}>
                      No history.
                    </td>
                  </tr>
                ) : (
                  sessionsHistory.map(row => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 text-gray-800 last:border-0 dark:border-gray-800 dark:text-gray-100"
                    >
                      <td className="px-3 py-2">{row.session_date}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {row.first_seen_at ? new Date(row.first_seen_at).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                        {row.last_seen_at ? new Date(row.last_seen_at).toLocaleTimeString() : '—'}
                      </td>
                      <td className="px-3 py-2 font-semibold">{row.total_active_minutes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
              </SectionCard>
            )}

            {activeTab === 'activity' && (
              <SectionCard
        title="Activity History"
        actions={
          <button
            type="button"
            onClick={refreshActivities}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Refresh
          </button>
        }
      >
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Input
            label="From"
            type="date"
            value={activityFilters.from}
            onChange={e => setActivityFilters(p => ({ ...p, from: e.target.value }))}
          />
          <Input
            label="To"
            type="date"
            value={activityFilters.to}
            onChange={e => setActivityFilters(p => ({ ...p, to: e.target.value }))}
          />
          <button
            type="button"
            onClick={refreshActivities}
            className="mb-1 inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Apply
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {activities.length === 0 ? (
                <tr>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400" colSpan={3}>
                    No activity recorded.
                  </td>
                </tr>
              ) : (
                activities.map(a => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 text-gray-800 last:border-0 dark:border-gray-800 dark:text-gray-100"
                  >
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 font-medium">{a.event || a.log_name}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{a.description || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
              </SectionCard>
            )}

            {isAdminLike && activeTab === 'shipment-statuses' && (
              <SectionCard title="Shipment Statuses">
          <div className="grid gap-4 md:grid-cols-2">
            <form className="space-y-3" onSubmit={handleSaveShipmentStatus}>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {editingShipmentStatus ? 'Edit status' : 'Add status'}
              </h3>
              <Input
                label="Name (Arabic)"
                value={shipmentStatusForm.name_ar}
                onChange={e => setShipmentStatusForm(p => ({ ...p, name_ar: e.target.value }))}
              />
              <Input
                label="Name (English)"
                value={shipmentStatusForm.name_en}
                onChange={e => setShipmentStatusForm(p => ({ ...p, name_en: e.target.value }))}
              />
              <Input
                label="Color (hex)"
                value={shipmentStatusForm.color}
                onChange={e => setShipmentStatusForm(p => ({ ...p, color: e.target.value }))}
              />
              <Input
                label="Description"
                value={shipmentStatusForm.description}
                onChange={e => setShipmentStatusForm(p => ({ ...p, description: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <input
                  id="shipment-status-active"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={shipmentStatusForm.active}
                  onChange={e => setShipmentStatusForm(p => ({ ...p, active: e.target.checked }))}
                />
                <label htmlFor="shipment-status-active" className="text-sm text-gray-700 dark:text-gray-200">
                  Active
                </label>
              </div>
              <Input
                label="Sort order"
                type="number"
                value={shipmentStatusForm.sort_order}
                onChange={e => setShipmentStatusForm(p => ({ ...p, sort_order: e.target.value }))}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
                >
                  {editingShipmentStatus ? 'Update Status' : 'Create Status'}
                </button>
                {editingShipmentStatus && (
                  <button
                    type="button"
                    onClick={startNewShipmentStatus}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                    <th className="px-3 py-2">Name (Ar)</th>
                    <th className="px-3 py-2">Name (En)</th>
                    <th className="px-3 py-2">Color</th>
                    <th className="px-3 py-2">Active</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {shipmentStatuses.length === 0 ? (
                    <tr>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400" colSpan={5}>
                        No statuses defined yet.
                      </td>
                    </tr>
                  ) : (
                    shipmentStatuses.map(s => (
                      <tr
                        key={s.id}
                        className="border-b border-gray-100 text-gray-800 last:border-0 dark:border-gray-800 dark:text-gray-100"
                      >
                        <td className="px-3 py-2">{s.name_ar}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{s.name_en || '—'}</td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex h-5 min-w-[3rem] items-center justify-center rounded-full px-2 text-[0.7rem] font-medium text-white"
                            style={{ backgroundColor: s.color || '#3B82F6' }}
                          >
                            {s.name_ar || s.name_en || 'Status'}
                          </span>
                        </td>
                        <td className="px-3 py-2">{s.active ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEditShipmentStatus(s)}
                              className="rounded border border-gray-300 px-2 py-0.5 text-[0.7rem] text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteShipmentStatus(s)}
                              className="rounded border border-red-300 px-2 py-0.5 text-[0.7rem] text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-900/40"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}

