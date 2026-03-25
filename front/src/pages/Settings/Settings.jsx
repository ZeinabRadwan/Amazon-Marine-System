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
import {
  listClientStatuses,
  createClientStatus,
  updateClientStatus,
  deleteClientStatus,
} from '../../api/clientLookups'
import {
  listTicketStatuses,
  createTicketStatus,
  updateTicketStatus,
  deleteTicketStatus,
  listTicketTypes,
  createTicketType,
  updateTicketType,
  deleteTicketType,
  listTicketPriorities,
  createTicketPriority,
  updateTicketPriority,
  deleteTicketPriority,
  listCommunicationLogTypes,
  createCommunicationLogType,
  updateCommunicationLogType,
  deleteCommunicationLogType,
} from '../../api/customerServices'
import '../../components/PageHeader/PageHeader.css'
import '../../components/LoaderDots/LoaderDots.css'
import '../../components/Tabs/Tabs.css'
import '../Clients/Clients.css'
import '../CustomerServices/styles/CustomerServices.css'
import './Settings.css'
import LeafletCompanyLocationPicker from '../../components/LeafletCompanyLocationPicker/LeafletCompanyLocationPicker'
import { localizedStatusLabel } from '../../utils/localizedStatusLabel'

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
  { id: 'statuses', labelKey: 'settings.tabs.statuses' },
]

export default function Settings() {
  const { user, permissions = [] } = useOutletContext() || {}
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
  const [attendancePolicy, setAttendancePolicy] = useState({
    grace_minutes: 15,
    workday_start: '09:00',
    workday_end: '17:00',
    enforce_geofence: false,
    enforce_schedule: false,
    require_location: true,
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

  const [clientStatuses, setClientStatuses] = useState([])
  const [clientStatusModal, setClientStatusModal] = useState(null)
  const [clientStatusForm, setClientStatusForm] = useState({ name_ar: '', name_en: '', sort_order: 1 })
  const [clientStatusSubmitting, setClientStatusSubmitting] = useState(false)
  const [deleteClientStatusId, setDeleteClientStatusId] = useState(null)
  const [deleteClientStatusSubmitting, setDeleteClientStatusSubmitting] = useState(false)

  const [ticketStatuses, setTicketStatuses] = useState([])
  const [showTicketStatusModal, setShowTicketStatusModal] = useState(false)
  const [editingTicketStatus, setEditingTicketStatus] = useState(null)
  const [ticketStatusForm, setTicketStatusForm] = useState({
    key: '',
    label_ar: '',
    label_en: '',
    active: true,
    sort_order: 0,
  })
  const [deleteTicketStatusId, setDeleteTicketStatusId] = useState(null)
  const [deleteTicketStatusSubmitting, setDeleteTicketStatusSubmitting] = useState(false)

  const [ticketTypes, setTicketTypes] = useState([])
  const [showTicketTypeModal, setShowTicketTypeModal] = useState(false)
  const [editingTicketType, setEditingTicketType] = useState(null)
  const [ticketTypeForm, setTicketTypeForm] = useState({ name: '', label_ar: '', label_en: '' })
  const [deleteTicketTypeId, setDeleteTicketTypeId] = useState(null)
  const [ticketTypeSubmitting, setTicketTypeSubmitting] = useState(false)

  const [ticketPriorities, setTicketPriorities] = useState([])
  const [showTicketPriorityModal, setShowTicketPriorityModal] = useState(false)
  const [editingTicketPriority, setEditingTicketPriority] = useState(null)
  const [ticketPriorityForm, setTicketPriorityForm] = useState({ name: '', label_ar: '', label_en: '', sort_order: 0 })
  const [deleteTicketPriorityId, setDeleteTicketPriorityId] = useState(null)
  const [ticketPrioritySubmitting, setTicketPrioritySubmitting] = useState(false)

  const [communicationLogTypes, setCommunicationLogTypes] = useState([])
  const [showCommLogTypeModal, setShowCommLogTypeModal] = useState(false)
  const [editingCommLogType, setEditingCommLogType] = useState(null)
  const [commLogTypeForm, setCommLogTypeForm] = useState({ name: '', label_ar: '', label_en: '', sort_order: 0 })
  const [deleteCommLogTypeId, setDeleteCommLogTypeId] = useState(null)
  const [commLogTypeSubmitting, setCommLogTypeSubmitting] = useState(false)

  const [statusesTabLoading, setStatusesTabLoading] = useState(false)

  const isAdminLike = useMemo(() => {
    const primaryRole = user?.primary_role ?? user?.roles?.[0]
    const name = (primaryRole || '').toString().toLowerCase()
    return name === 'admin' || name === 'sales_manager'
  }, [user])

  const isAdminRole = useMemo(() => {
    const primary = (user?.primary_role ?? user?.roles?.[0] ?? '').toString().toLowerCase()
    return primary === 'admin'
  }, [user])

  const canSeeTicketStatuses = useMemo(
    () => permissions.includes('tickets.view') || permissions.includes('tickets.manage') || isAdminRole,
    [permissions, isAdminRole],
  )
  const canManageTicketStatuses = useMemo(
    () => permissions.includes('tickets.manage') || isAdminRole,
    [permissions, isAdminRole],
  )

  const canSeeTicketTypes = useMemo(
    () => permissions.includes('tickets.view') || permissions.includes('tickets.manage') || isAdminRole,
    [permissions, isAdminRole],
  )
  const canManageTicketTypes = useMemo(
    () => permissions.includes('tickets.manage') || isAdminRole,
    [permissions, isAdminRole],
  )

  const canSeeCommLogTypes = useMemo(
    () => permissions.includes('customer_service.view_comms') || permissions.includes('customer_service.manage_comms') || isAdminRole,
    [permissions, isAdminRole],
  )
  const canManageCommLogTypes = useMemo(
    () => permissions.includes('customer_service.manage_comms') || isAdminRole,
    [permissions, isAdminRole],
  )

  const csTabs = useMemo(() => {
    const tabs = SETTINGS_TABS.filter((tab) => tab.id !== 'statuses' || isAdminLike)
    return tabs.map((tab) => ({ id: tab.id, label: t(tab.labelKey) }))
  }, [isAdminLike, t])

  useEffect(() => {
    if (!token || activeTab !== 'statuses' || !isAdminLike) return
    let cancelled = false
    async function loadStatusesTab() {
      setStatusesTabLoading(true)
      setError('')
      try {
        const clientP = listClientStatuses(token)
          .then((data) => {
            const list = data.data ?? data.client_statuses ?? data
            return Array.isArray(list) ? list : []
          })
          .catch(() => [])
        const ticketStatusesP = canSeeTicketStatuses
          ? listTicketStatuses(token).then((res) => (Array.isArray(res?.data) ? res.data : [])).catch(() => [])
          : Promise.resolve([])
        const ticketTypesP = canSeeTicketTypes
          ? listTicketTypes(token).then((res) => (Array.isArray(res?.data) ? res.data : [])).catch(() => [])
          : Promise.resolve([])
        const ticketPrioritiesP = canSeeTicketStatuses
          ? listTicketPriorities(token).then((res) => (Array.isArray(res?.data) ? res.data : [])).catch(() => [])
          : Promise.resolve([])
        const commLogTypesP = canSeeCommLogTypes
          ? listCommunicationLogTypes(token).then((res) => (Array.isArray(res?.data) ? res.data : [])).catch(() => [])
          : Promise.resolve([])

        const [clients, tickets, types, priorities, commTypes] = await Promise.all([
          clientP,
          ticketStatusesP,
          ticketTypesP,
          ticketPrioritiesP,
          commLogTypesP,
        ])
        if (!cancelled) {
          setClientStatuses(clients)
          setTicketStatuses(tickets)
          setTicketTypes(types)
          setTicketPriorities(priorities)
          setCommunicationLogTypes(commTypes)
        }
      } catch (e) {
        if (!cancelled) setError(e.message || t('settings.errors.loadStatusesTab'))
      } finally {
        if (!cancelled) setStatusesTabLoading(false)
      }
    }
    loadStatusesTab()
    return () => { cancelled = true }
  }, [token, activeTab, isAdminLike, canSeeTicketStatuses, canSeeTicketTypes, canSeeCommLogTypes, t])

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

  function openNewClientStatus() {
    setClientStatusForm({ name_ar: '', name_en: '', sort_order: 1 })
    setClientStatusModal('create')
  }

  function openEditClientStatus(row) {
    setClientStatusForm({
      name_ar: row.name_ar ?? row.name ?? '',
      name_en: row.name_en ?? row.name ?? '',
      sort_order: row.sort_order ?? 1,
    })
    setClientStatusModal({ mode: 'edit', id: row.id })
  }

  async function handleSaveClientStatus(e) {
    e.preventDefault()
    if (!token) return
    setClientStatusSubmitting(true)
    setError('')
    try {
      const body = {
        name_ar: clientStatusForm.name_ar.trim(),
        name_en: clientStatusForm.name_en.trim(),
        sort_order: Number(clientStatusForm.sort_order) || 0,
      }
      if (clientStatusModal?.mode === 'edit' && clientStatusModal.id != null) {
        await updateClientStatus(token, clientStatusModal.id, body)
      } else {
        await createClientStatus(token, body)
      }
      const data = await listClientStatuses(token)
      const list = data.data ?? data.client_statuses ?? data
      setClientStatuses(Array.isArray(list) ? list : [])
      setClientStatusModal(null)
      setAlert({ type: 'success', message: t('settings.clientStatuses.saved') })
    } catch (err) {
      setError(err.message || t('settings.errors.saveClientStatus'))
    } finally {
      setClientStatusSubmitting(false)
    }
  }

  async function handleDeleteClientStatusConfirm() {
    if (!token || deleteClientStatusId == null) return
    setDeleteClientStatusSubmitting(true)
    setError('')
    try {
      await deleteClientStatus(token, deleteClientStatusId)
      const data = await listClientStatuses(token)
      const list = data.data ?? data.client_statuses ?? data
      setClientStatuses(Array.isArray(list) ? list : [])
      setDeleteClientStatusId(null)
      setAlert({ type: 'success', message: t('settings.clientStatuses.deleted') })
    } catch (err) {
      setError(err.message || t('settings.errors.deleteClientStatus'))
    } finally {
      setDeleteClientStatusSubmitting(false)
    }
  }

  function openNewTicketStatus() {
    setEditingTicketStatus(null)
    setTicketStatusForm({ key: '', label_ar: '', label_en: '', active: true, sort_order: 0 })
    setShowTicketStatusModal(true)
  }

  function openEditTicketStatus(row) {
    setEditingTicketStatus(row)
    setTicketStatusForm({
      key: row.key || '',
      label_ar: row.label_ar || '',
      label_en: row.label_en || '',
      active: row.active !== false,
      sort_order: row.sort_order ?? 0,
    })
    setShowTicketStatusModal(true)
  }

  async function handleSaveTicketStatus(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      const labelEn = ticketStatusForm.label_en?.trim() ?? ''
      const sortOrder = Number(ticketStatusForm.sort_order || 0)
      if (editingTicketStatus) {
        await updateTicketStatus(token, editingTicketStatus.id, {
          label_ar: ticketStatusForm.label_ar.trim(),
          label_en: labelEn,
          active: ticketStatusForm.active,
          sort_order: sortOrder,
        })
      } else {
        await createTicketStatus(token, {
          key: ticketStatusForm.key.trim(),
          label_ar: ticketStatusForm.label_ar.trim(),
          label_en: labelEn,
          active: ticketStatusForm.active,
          sort_order: sortOrder,
        })
      }
      const res = await listTicketStatuses(token)
      setTicketStatuses(Array.isArray(res?.data) ? res.data : [])
      setShowTicketStatusModal(false)
      setEditingTicketStatus(null)
      setAlert({ type: 'success', message: editingTicketStatus ? t('settings.ticketStatuses.updated') : t('settings.ticketStatuses.created') })
    } catch (err) {
      setError(err.message || t('settings.errors.saveTicketStatus'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTicketStatusConfirm() {
    if (!token || deleteTicketStatusId == null) return
    setDeleteTicketStatusSubmitting(true)
    setError('')
    try {
      await deleteTicketStatus(token, deleteTicketStatusId)
      const res = await listTicketStatuses(token)
      setTicketStatuses(Array.isArray(res?.data) ? res.data : [])
      setDeleteTicketStatusId(null)
      setAlert({ type: 'success', message: t('settings.ticketStatuses.deleted') })
    } catch (err) {
      setError(err.message || t('settings.errors.deleteTicketStatus'))
    } finally {
      setDeleteTicketStatusSubmitting(false)
    }
  }

  function openNewTicketType() {
    setEditingTicketType(null)
    setTicketTypeForm({ name: '', label_ar: '', label_en: '' })
    setShowTicketTypeModal(true)
  }

  function openEditTicketType(row) {
    setEditingTicketType(row)
    setTicketTypeForm({
      name: row.name || '',
      label_ar: row.label_ar || '',
      label_en: row.label_en || '',
    })
    setShowTicketTypeModal(true)
  }

  async function handleSaveTicketType(e) {
    e.preventDefault()
    if (!token) return
    setTicketTypeSubmitting(true)
    setError('')
    try {
      const body = {
        name: ticketTypeForm.name.trim(),
        label_ar: ticketTypeForm.label_ar.trim(),
        label_en: ticketTypeForm.label_en.trim(),
      }
      if (editingTicketType) {
        await updateTicketType(token, editingTicketType.id, body)
      } else {
        await createTicketType(token, body)
      }
      const res = await listTicketTypes(token)
      setTicketTypes(Array.isArray(res?.data) ? res.data : [])
      setShowTicketTypeModal(false)
      setEditingTicketType(null)
      setAlert({ type: 'success', message: editingTicketType ? t('settings.ticketTypes.updated') : t('settings.ticketTypes.created') })
    } catch (err) {
      setError(err.message || t('settings.errors.saveTicketType'))
    } finally {
      setTicketTypeSubmitting(false)
    }
  }

  async function handleDeleteTicketTypeConfirm() {
    if (!token || deleteTicketTypeId == null) return
    setTicketTypeSubmitting(true)
    setError('')
    try {
      await deleteTicketType(token, deleteTicketTypeId)
      const res = await listTicketTypes(token)
      setTicketTypes(Array.isArray(res?.data) ? res.data : [])
      setDeleteTicketTypeId(null)
      setAlert({ type: 'success', message: t('settings.ticketTypes.deleted') })
    } catch (err) {
      setError(err.message || t('settings.errors.deleteTicketType'))
    } finally {
      setTicketTypeSubmitting(false)
    }
  }

  function openNewTicketPriority() {
    setEditingTicketPriority(null)
    setTicketPriorityForm({ name: '', label_ar: '', label_en: '', sort_order: 0 })
    setShowTicketPriorityModal(true)
  }

  function openEditTicketPriority(row) {
    setEditingTicketPriority(row)
    setTicketPriorityForm({
      name: row.name || '',
      label_ar: row.label_ar || '',
      label_en: row.label_en || '',
      sort_order: row.sort_order ?? 0,
    })
    setShowTicketPriorityModal(true)
  }

  async function handleSaveTicketPriority(e) {
    e.preventDefault()
    if (!token) return
    setTicketPrioritySubmitting(true)
    setError('')
    try {
      const body = {
        name: ticketPriorityForm.name.trim(),
        label_ar: ticketPriorityForm.label_ar.trim(),
        label_en: ticketPriorityForm.label_en.trim(),
        sort_order: Number(ticketPriorityForm.sort_order || 0),
      }
      if (editingTicketPriority) {
        await updateTicketPriority(token, editingTicketPriority.id, body)
      } else {
        await createTicketPriority(token, body)
      }
      const res = await listTicketPriorities(token)
      setTicketPriorities(Array.isArray(res?.data) ? res.data : [])
      setShowTicketPriorityModal(false)
      setEditingTicketPriority(null)
      setAlert({ type: 'success', message: editingTicketPriority ? t('settings.ticketPriorities.updated') : t('settings.ticketPriorities.created') })
    } catch (err) {
      setError(err.message || t('settings.errors.saveTicketPriority'))
    } finally {
      setTicketPrioritySubmitting(false)
    }
  }

  async function handleDeleteTicketPriorityConfirm() {
    if (!token || deleteTicketPriorityId == null) return
    setTicketPrioritySubmitting(true)
    setError('')
    try {
      await deleteTicketPriority(token, deleteTicketPriorityId)
      const res = await listTicketPriorities(token)
      setTicketPriorities(Array.isArray(res?.data) ? res.data : [])
      setDeleteTicketPriorityId(null)
      setAlert({ type: 'success', message: t('settings.ticketPriorities.deleted') })
    } catch (err) {
      setError(err.message || t('settings.errors.deleteTicketPriority'))
    } finally {
      setTicketPrioritySubmitting(false)
    }
  }

  function openNewCommLogType() {
    setEditingCommLogType(null)
    setCommLogTypeForm({ name: '', label_ar: '', label_en: '', sort_order: 0 })
    setShowCommLogTypeModal(true)
  }

  function openEditCommLogType(row) {
    setEditingCommLogType(row)
    setCommLogTypeForm({
      name: row.name || '',
      label_ar: row.label_ar || '',
      label_en: row.label_en || '',
      sort_order: row.sort_order ?? 0,
    })
    setShowCommLogTypeModal(true)
  }

  async function handleSaveCommLogType(e) {
    e.preventDefault()
    if (!token) return
    setCommLogTypeSubmitting(true)
    setError('')
    try {
      const body = {
        name: commLogTypeForm.name.trim(),
        label_ar: commLogTypeForm.label_ar.trim(),
        label_en: commLogTypeForm.label_en.trim(),
        sort_order: Number(commLogTypeForm.sort_order || 0),
      }
      if (editingCommLogType) {
        await updateCommunicationLogType(token, editingCommLogType.id, body)
      } else {
        await createCommunicationLogType(token, body)
      }
      const res = await listCommunicationLogTypes(token)
      setCommunicationLogTypes(Array.isArray(res?.data) ? res.data : [])
      setShowCommLogTypeModal(false)
      setEditingCommLogType(null)
      setAlert({ type: 'success', message: editingCommLogType ? t('settings.communicationLogTypes.updated') : t('settings.communicationLogTypes.created') })
    } catch (err) {
      setError(err.message || t('settings.errors.saveCommunicationLogType'))
    } finally {
      setCommLogTypeSubmitting(false)
    }
  }

  async function handleDeleteCommLogTypeConfirm() {
    if (!token || deleteCommLogTypeId == null) return
    setCommLogTypeSubmitting(true)
    setError('')
    try {
      await deleteCommunicationLogType(token, deleteCommLogTypeId)
      const res = await listCommunicationLogTypes(token)
      setCommunicationLogTypes(Array.isArray(res?.data) ? res.data : [])
      setDeleteCommLogTypeId(null)
      setAlert({ type: 'success', message: t('settings.communicationLogTypes.deleted') })
    } catch (err) {
      setError(err.message || t('settings.errors.deleteCommunicationLogType'))
    } finally {
      setCommLogTypeSubmitting(false)
    }
  }

  const sessionsHistoryColumns = [
    { key: 'session_date', label: t('settings.sessions.table.date'), sortable: false },
    {
      key: 'device_type',
      label: t('attendance.device'),
      sortable: false,
      render: (_, r) => r.device_type ?? '—',
    },
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
    {
      key: 'display',
      label: t('settings.statuses.displayName'),
      sortable: false,
      render: (_, row) => localizedStatusLabel(row, i18n.language),
    },
    { key: 'color', label: t('settings.shipmentStatuses.table.color'), sortable: false, render: (val, row) => (
      <span className="settings-status-badge" style={{ backgroundColor: val || '#3B82F6' }}>
        {localizedStatusLabel(row, i18n.language) || '—'}
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

  const clientStatusColumns = [
    {
      key: 'display',
      label: t('settings.statuses.displayName'),
      sortable: false,
      render: (_, row) => localizedStatusLabel(row, i18n.language),
    },
    { key: 'sort_order', label: t('settings.clientStatuses.table.sortOrder'), sortable: false, render: (val) => val ?? '—' },
    {
      key: 'actions',
      label: t('settings.shipmentStatuses.table.actions'),
      sortable: false,
      render: (_, row) => (
        <div className="cs-table-actions">
          <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" onClick={() => openEditClientStatus(row)}>
            {t('settings.shipmentStatuses.edit')}
          </button>
          <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" style={{ color: 'var(--danger, #dc3545)' }} onClick={() => setDeleteClientStatusId(row.id)}>
            {t('settings.shipmentStatuses.delete')}
          </button>
        </div>
      ),
    },
  ]

  const ticketStatusColumns = [
    { key: 'key', label: t('settings.ticketStatuses.table.key'), sortable: false },
    {
      key: 'display',
      label: t('settings.statuses.displayName'),
      sortable: false,
      render: (_, row) => localizedStatusLabel(row, i18n.language),
    },
    { key: 'active', label: t('settings.shipmentStatuses.table.active'), sortable: false, render: (val) => (val ? t('common.yes', 'Yes') : t('common.no', 'No')) },
    { key: 'sort_order', label: t('settings.ticketStatuses.table.sortOrder'), sortable: false },
    ...(canManageTicketStatuses
      ? [{
        key: 'actions',
        label: t('settings.shipmentStatuses.table.actions'),
        sortable: false,
        render: (_, row) => (
          <div className="cs-table-actions">
            <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" onClick={() => openEditTicketStatus(row)}>
              {t('settings.shipmentStatuses.edit')}
            </button>
            <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" style={{ color: 'var(--danger, #dc3545)' }} onClick={() => setDeleteTicketStatusId(row.id)}>
              {t('settings.shipmentStatuses.delete')}
            </button>
          </div>
        ),
      }]
      : []),
  ]

  const ticketTypeColumns = [
    { key: 'name', label: t('settings.ticketTypes.table.name'), sortable: false },
    {
      key: 'display',
      label: t('settings.statuses.displayName'),
      sortable: false,
      render: (_, row) => localizedStatusLabel(row, i18n.language),
    },
    ...(canManageTicketTypes
      ? [{
        key: 'actions',
        label: t('settings.shipmentStatuses.table.actions'),
        sortable: false,
        render: (_, row) => (
          <div className="cs-table-actions">
            <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" onClick={() => openEditTicketType(row)}>
              {t('settings.shipmentStatuses.edit')}
            </button>
            <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" style={{ color: 'var(--danger, #dc3545)' }} onClick={() => setDeleteTicketTypeId(row.id)}>
              {t('settings.shipmentStatuses.delete')}
            </button>
          </div>
        ),
      }]
      : []),
  ]

  const ticketPriorityColumns = [
    { key: 'name', label: t('settings.ticketPriorities.table.name'), sortable: false },
    {
      key: 'display',
      label: t('settings.statuses.displayName'),
      sortable: false,
      render: (_, row) => localizedStatusLabel(row, i18n.language),
    },
    { key: 'sort_order', label: t('settings.ticketPriorities.table.sortOrder'), sortable: false },
    ...(canManageTicketStatuses
      ? [{
        key: 'actions',
        label: t('settings.shipmentStatuses.table.actions'),
        sortable: false,
        render: (_, row) => (
          <div className="cs-table-actions">
            <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" onClick={() => openEditTicketPriority(row)}>
              {t('settings.shipmentStatuses.edit')}
            </button>
            <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" style={{ color: 'var(--danger, #dc3545)' }} onClick={() => setDeleteTicketPriorityId(row.id)}>
              {t('settings.shipmentStatuses.delete')}
            </button>
          </div>
        ),
      }]
      : []),
  ]

  const commLogTypeColumns = [
    { key: 'name', label: t('settings.communicationLogTypes.table.name'), sortable: false },
    {
      key: 'display',
      label: t('settings.statuses.displayName'),
      sortable: false,
      render: (_, row) => localizedStatusLabel(row, i18n.language),
    },
    { key: 'sort_order', label: t('settings.communicationLogTypes.table.sortOrder'), sortable: false },
    ...(canManageCommLogTypes
      ? [{
        key: 'actions',
        label: t('settings.shipmentStatuses.table.actions'),
        sortable: false,
        render: (_, row) => (
          <div className="cs-table-actions">
            <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" onClick={() => openEditCommLogType(row)}>
              {t('settings.shipmentStatuses.edit')}
            </button>
            <button type="button" className="cs-btn cs-btn-sm cs-btn-outline" style={{ color: 'var(--danger, #dc3545)' }} onClick={() => setDeleteCommLogTypeId(row.id)}>
              {t('settings.shipmentStatuses.delete')}
            </button>
          </div>
        ),
      }]
      : []),
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
                        <LeafletCompanyLocationPicker
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
                              <th className="responsive-table__th">{t('attendance.device')}</th>
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
                                <td className="responsive-table__td">{todaySession.device_type ?? '—'}</td>
                                <td className="responsive-table__td">{todaySession.first_seen_at ? new Date(todaySession.first_seen_at).toLocaleTimeString() : '—'}</td>
                                <td className="responsive-table__td">{todaySession.last_seen_at ? new Date(todaySession.last_seen_at).toLocaleTimeString() : '—'}</td>
                                <td className="responsive-table__td">{todaySession.total_active_minutes ?? Math.floor((todaySession.total_active_seconds || 0) / 60)}</td>
                              </tr>
                            ) : (
                              <tr>
                                <td colSpan={6} className="responsive-table__td clients-empty">
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

            {/* Tab: Statuses (shipments, clients, tickets) */}
            {isAdminLike && (
              <div role="tabpanel" className={`cs-tab-panel settings-tab-panel ${activeTab === 'statuses' ? 'cs-tab-panel--active' : ''}`}>
                {activeTab === 'statuses' && (
                  <div className="settings-tab-content settings-statuses-tab">
                    <p className="settings-statuses-intro">{t('settings.statuses.intro')}</p>
                    {statusesTabLoading ? (
                      <div className="cs-loading-wrap">
                        <LoaderDots />
                      </div>
                    ) : (
                      <div className="settings-statuses-cards settings-tab-content--animate">
                        <SectionCard
                          title={t('settings.shipmentStatuses.cardTitle')}
                          subtitle={t('settings.statuses.shipmentsHint')}
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

                        <SectionCard
                          title={t('settings.clientStatuses.cardTitle')}
                          subtitle={t('settings.statuses.clientsHint')}
                          actions={
                            <button type="button" className="page-header__btn page-header__btn--primary" onClick={openNewClientStatus}>
                              {t('settings.clientStatuses.addTitle')}
                            </button>
                          }
                        >
                          <div className="settings-table-card">
                            <Table columns={clientStatusColumns} data={clientStatuses} getRowKey={(r) => r.id} emptyMessage={t('settings.clientStatuses.empty')} />
                          </div>
                        </SectionCard>

                        {canSeeTicketStatuses ? (
                          <SectionCard
                            title={t('settings.ticketStatuses.cardTitle')}
                            subtitle={t('settings.statuses.ticketsHint')}
                            actions={
                              canManageTicketStatuses ? (
                                <button type="button" className="page-header__btn page-header__btn--primary" onClick={openNewTicketStatus}>
                                  {t('settings.ticketStatuses.addTitle')}
                                </button>
                              ) : null
                            }
                          >
                            <div className="settings-table-card">
                              <Table columns={ticketStatusColumns} data={ticketStatuses} getRowKey={(r) => r.id} emptyMessage={t('settings.ticketStatuses.empty')} />
                            </div>
                          </SectionCard>
                        ) : null}

                        {canSeeTicketTypes ? (
                          <SectionCard
                            title={t('settings.ticketTypes.cardTitle')}
                            subtitle={t('settings.statuses.ticketTypesHint')}
                            actions={
                              canManageTicketTypes ? (
                                <button type="button" className="page-header__btn page-header__btn--primary" onClick={openNewTicketType}>
                                  {t('settings.ticketTypes.addTitle')}
                                </button>
                              ) : null
                            }
                          >
                            <div className="settings-table-card">
                              <Table columns={ticketTypeColumns} data={ticketTypes} getRowKey={(r) => r.id} emptyMessage={t('settings.ticketTypes.empty')} />
                            </div>
                          </SectionCard>
                        ) : null}

                        {canSeeTicketStatuses ? (
                          <SectionCard
                            title={t('settings.ticketPriorities.cardTitle')}
                            subtitle={t('settings.statuses.ticketPrioritiesHint')}
                            actions={
                              canManageTicketStatuses ? (
                                <button type="button" className="page-header__btn page-header__btn--primary" onClick={openNewTicketPriority}>
                                  {t('settings.ticketPriorities.addTitle')}
                                </button>
                              ) : null
                            }
                          >
                            <div className="settings-table-card">
                              <Table columns={ticketPriorityColumns} data={ticketPriorities} getRowKey={(r) => r.id} emptyMessage={t('settings.ticketPriorities.empty')} />
                            </div>
                          </SectionCard>
                        ) : null}

                        {canSeeCommLogTypes ? (
                          <SectionCard
                            title={t('settings.communicationLogTypes.cardTitle')}
                            subtitle={t('settings.statuses.communicationLogTypesHint')}
                            actions={
                              canManageCommLogTypes ? (
                                <button type="button" className="page-header__btn page-header__btn--primary" onClick={openNewCommLogType}>
                                  {t('settings.communicationLogTypes.addTitle')}
                                </button>
                              ) : null
                            }
                          >
                            <div className="settings-table-card">
                              <Table columns={commLogTypeColumns} data={communicationLogTypes} getRowKey={(r) => r.id} emptyMessage={t('settings.communicationLogTypes.empty')} />
                            </div>
                          </SectionCard>
                        ) : null}
                      </div>
                    )}
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

        {(clientStatusModal === 'create' || clientStatusModal?.mode === 'edit') && (
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="settings-client-status-modal-title">
            <div className="clients-modal-backdrop" onClick={() => !clientStatusSubmitting && setClientStatusModal(null)} />
            <div className="clients-modal-content">
              <h2 id="settings-client-status-modal-title">
                {clientStatusModal?.mode === 'edit' ? t('settings.clientStatuses.editTitle') : t('settings.clientStatuses.addTitle')}
              </h2>
              <form onSubmit={handleSaveClientStatus} className="settings-modal-form">
                <Input label={t('settings.clientStatuses.nameAr')} value={clientStatusForm.name_ar} onChange={(e) => setClientStatusForm((p) => ({ ...p, name_ar: e.target.value }))} required />
                <Input label={t('settings.clientStatuses.nameEn')} value={clientStatusForm.name_en} onChange={(e) => setClientStatusForm((p) => ({ ...p, name_en: e.target.value }))} required />
                <Input label={t('settings.clientStatuses.sortOrder')} type="number" min={0} value={clientStatusForm.sort_order} onChange={(e) => setClientStatusForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <div className="clients-modal-actions">
                  <button type="button" className="clients-btn" onClick={() => setClientStatusModal(null)} disabled={clientStatusSubmitting}>
                    {t('settings.shipmentStatuses.cancel')}
                  </button>
                  <button type="submit" disabled={clientStatusSubmitting} className="clients-btn clients-btn--primary">
                    {clientStatusSubmitting ? t('clients.saving', 'Saving…') : t('settings.clientStatuses.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteClientStatusId != null && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => !deleteClientStatusSubmitting && setDeleteClientStatusId(null)} />
            <div className="clients-modal-content">
              <h2>{t('settings.clientStatuses.deleteTitle')}</h2>
              <p>{t('settings.clientStatuses.deleteConfirm')}</p>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setDeleteClientStatusId(null)} disabled={deleteClientStatusSubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteClientStatusConfirm} disabled={deleteClientStatusSubmitting}>
                  {deleteClientStatusSubmitting ? t('clients.deleting') : t('clients.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showTicketStatusModal && (
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="settings-ticket-status-modal-title">
            <div className="clients-modal-backdrop" onClick={() => { setShowTicketStatusModal(false); setEditingTicketStatus(null) }} />
            <div className="clients-modal-content">
              <h2 id="settings-ticket-status-modal-title">{editingTicketStatus ? t('settings.ticketStatuses.editTitle') : t('settings.ticketStatuses.addTitle')}</h2>
              <form onSubmit={handleSaveTicketStatus} className="settings-modal-form">
                <Input
                  label={t('settings.ticketStatuses.key')}
                  value={ticketStatusForm.key}
                  onChange={(e) => setTicketStatusForm((p) => ({ ...p, key: e.target.value }))}
                  required
                  disabled={!!editingTicketStatus}
                />
                <Input label={t('settings.ticketStatuses.labelAr')} value={ticketStatusForm.label_ar} onChange={(e) => setTicketStatusForm((p) => ({ ...p, label_ar: e.target.value }))} required />
                <Input label={t('settings.ticketStatuses.labelEn')} value={ticketStatusForm.label_en} onChange={(e) => setTicketStatusForm((p) => ({ ...p, label_en: e.target.value }))} required />
                <Input label={t('settings.ticketStatuses.sortOrder')} type="number" min={0} value={ticketStatusForm.sort_order} onChange={(e) => setTicketStatusForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <label className="settings-checkbox-row">
                  <span className="settings-checkbox-label">{t('settings.shipmentStatuses.active')}</span>
                  <input type="checkbox" checked={ticketStatusForm.active} onChange={(e) => setTicketStatusForm((p) => ({ ...p, active: e.target.checked }))} className="settings-checkbox" />
                </label>
                <div className="clients-modal-actions">
                  <button type="button" className="clients-btn" onClick={() => { setShowTicketStatusModal(false); setEditingTicketStatus(null) }}>
                    {t('settings.shipmentStatuses.cancel')}
                  </button>
                  <button type="submit" disabled={saving} className="clients-btn clients-btn--primary">
                    {saving ? t('clients.saving', 'Saving…') : editingTicketStatus ? t('settings.ticketStatuses.save') : t('settings.ticketStatuses.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteTicketStatusId != null && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => !deleteTicketStatusSubmitting && setDeleteTicketStatusId(null)} />
            <div className="clients-modal-content">
              <h2>{t('settings.ticketStatuses.deleteTitle')}</h2>
              <p>{t('settings.ticketStatuses.deleteConfirm')}</p>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setDeleteTicketStatusId(null)} disabled={deleteTicketStatusSubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteTicketStatusConfirm} disabled={deleteTicketStatusSubmitting}>
                  {deleteTicketStatusSubmitting ? t('clients.deleting') : t('clients.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showTicketTypeModal && (
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="settings-ticket-type-modal-title">
            <div className="clients-modal-backdrop" onClick={() => { if (!ticketTypeSubmitting) { setShowTicketTypeModal(false); setEditingTicketType(null) } }} />
            <div className="clients-modal-content">
              <h2 id="settings-ticket-type-modal-title">{editingTicketType ? t('settings.ticketTypes.editTitle') : t('settings.ticketTypes.addTitle')}</h2>
              <form onSubmit={handleSaveTicketType} className="settings-modal-form">
                <Input
                  label={t('settings.ticketTypes.name')}
                  value={ticketTypeForm.name}
                  onChange={(e) => setTicketTypeForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <Input label={t('settings.ticketTypes.labelAr')} value={ticketTypeForm.label_ar} onChange={(e) => setTicketTypeForm((p) => ({ ...p, label_ar: e.target.value }))} required />
                <Input label={t('settings.ticketTypes.labelEn')} value={ticketTypeForm.label_en} onChange={(e) => setTicketTypeForm((p) => ({ ...p, label_en: e.target.value }))} required />
                <div className="clients-modal-actions">
                  <button type="button" className="clients-btn" onClick={() => { setShowTicketTypeModal(false); setEditingTicketType(null) }} disabled={ticketTypeSubmitting}>
                    {t('settings.shipmentStatuses.cancel')}
                  </button>
                  <button type="submit" disabled={ticketTypeSubmitting} className="clients-btn clients-btn--primary">
                    {ticketTypeSubmitting ? t('clients.saving', 'Saving…') : editingTicketType ? t('settings.ticketTypes.save') : t('settings.ticketTypes.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteTicketTypeId != null && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => !ticketTypeSubmitting && setDeleteTicketTypeId(null)} />
            <div className="clients-modal-content">
              <h2>{t('settings.ticketTypes.deleteTitle')}</h2>
              <p>{t('settings.ticketTypes.deleteConfirm')}</p>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setDeleteTicketTypeId(null)} disabled={ticketTypeSubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteTicketTypeConfirm} disabled={ticketTypeSubmitting}>
                  {ticketTypeSubmitting ? t('clients.deleting') : t('clients.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showTicketPriorityModal && (
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="settings-ticket-priority-modal-title">
            <div className="clients-modal-backdrop" onClick={() => { if (!ticketPrioritySubmitting) { setShowTicketPriorityModal(false); setEditingTicketPriority(null) } }} />
            <div className="clients-modal-content">
              <h2 id="settings-ticket-priority-modal-title">{editingTicketPriority ? t('settings.ticketPriorities.editTitle') : t('settings.ticketPriorities.addTitle')}</h2>
              <form onSubmit={handleSaveTicketPriority} className="settings-modal-form">
                <Input
                  label={t('settings.ticketPriorities.name')}
                  value={ticketPriorityForm.name}
                  onChange={(e) => setTicketPriorityForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <Input label={t('settings.ticketPriorities.labelAr')} value={ticketPriorityForm.label_ar} onChange={(e) => setTicketPriorityForm((p) => ({ ...p, label_ar: e.target.value }))} required />
                <Input label={t('settings.ticketPriorities.labelEn')} value={ticketPriorityForm.label_en} onChange={(e) => setTicketPriorityForm((p) => ({ ...p, label_en: e.target.value }))} required />
                <Input label={t('settings.ticketPriorities.sortOrder')} type="number" min={0} value={ticketPriorityForm.sort_order} onChange={(e) => setTicketPriorityForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <div className="clients-modal-actions">
                  <button type="button" className="clients-btn" onClick={() => { setShowTicketPriorityModal(false); setEditingTicketPriority(null) }} disabled={ticketPrioritySubmitting}>
                    {t('settings.shipmentStatuses.cancel')}
                  </button>
                  <button type="submit" disabled={ticketPrioritySubmitting} className="clients-btn clients-btn--primary">
                    {ticketPrioritySubmitting ? t('clients.saving', 'Saving…') : editingTicketPriority ? t('settings.ticketPriorities.save') : t('settings.ticketPriorities.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteTicketPriorityId != null && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => !ticketPrioritySubmitting && setDeleteTicketPriorityId(null)} />
            <div className="clients-modal-content">
              <h2>{t('settings.ticketPriorities.deleteTitle')}</h2>
              <p>{t('settings.ticketPriorities.deleteConfirm')}</p>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setDeleteTicketPriorityId(null)} disabled={ticketPrioritySubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteTicketPriorityConfirm} disabled={ticketPrioritySubmitting}>
                  {ticketPrioritySubmitting ? t('clients.deleting') : t('clients.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCommLogTypeModal && (
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="settings-comm-log-type-modal-title">
            <div className="clients-modal-backdrop" onClick={() => { if (!commLogTypeSubmitting) { setShowCommLogTypeModal(false); setEditingCommLogType(null) } }} />
            <div className="clients-modal-content">
              <h2 id="settings-comm-log-type-modal-title">{editingCommLogType ? t('settings.communicationLogTypes.editTitle') : t('settings.communicationLogTypes.addTitle')}</h2>
              <form onSubmit={handleSaveCommLogType} className="settings-modal-form">
                <Input
                  label={t('settings.communicationLogTypes.name')}
                  value={commLogTypeForm.name}
                  onChange={(e) => setCommLogTypeForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
                <Input label={t('settings.communicationLogTypes.labelAr')} value={commLogTypeForm.label_ar} onChange={(e) => setCommLogTypeForm((p) => ({ ...p, label_ar: e.target.value }))} required />
                <Input label={t('settings.communicationLogTypes.labelEn')} value={commLogTypeForm.label_en} onChange={(e) => setCommLogTypeForm((p) => ({ ...p, label_en: e.target.value }))} required />
                <Input label={t('settings.communicationLogTypes.sortOrder')} type="number" min={0} value={commLogTypeForm.sort_order} onChange={(e) => setCommLogTypeForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <div className="clients-modal-actions">
                  <button type="button" className="clients-btn" onClick={() => { setShowCommLogTypeModal(false); setEditingCommLogType(null) }} disabled={commLogTypeSubmitting}>
                    {t('settings.shipmentStatuses.cancel')}
                  </button>
                  <button type="submit" disabled={commLogTypeSubmitting} className="clients-btn clients-btn--primary">
                    {commLogTypeSubmitting ? t('clients.saving', 'Saving…') : editingCommLogType ? t('settings.communicationLogTypes.save') : t('settings.communicationLogTypes.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteCommLogTypeId != null && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => !commLogTypeSubmitting && setDeleteCommLogTypeId(null)} />
            <div className="clients-modal-content">
              <h2>{t('settings.communicationLogTypes.deleteTitle')}</h2>
              <p>{t('settings.communicationLogTypes.deleteConfirm')}</p>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setDeleteCommLogTypeId(null)} disabled={commLogTypeSubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteCommLogTypeConfirm} disabled={commLogTypeSubmitting}>
                  {commLogTypeSubmitting ? t('clients.deleting') : t('clients.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
