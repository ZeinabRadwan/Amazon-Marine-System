import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, RotateCcw, X, Pencil, Trash2 } from 'lucide-react'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import { Container } from '../../components/Container'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import Tabs from '../../components/Tabs'
import { Table, IconActionButton } from '../../components/Table'
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
  listVendorPartnerTypes,
  createVendorPartnerType,
  updateVendorPartnerType,
  deleteVendorPartnerType,
} from '../../api/clientLookups'
import { listPorts, createPort, updatePort, deletePort } from '../../api/ports'
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
import '../Clients/ClientDetailModal.css'
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

function SettingsModalField({ label, htmlFor, children, fullWidth }) {
  return (
    <div className={`client-detail-modal__form-field ${fullWidth ? 'client-detail-modal__form-field--full' : ''}`.trim()}>
      {label ? <label htmlFor={htmlFor}>{label}</label> : null}
      {children}
    </div>
  )
}

function SettingsFormModal({
  title,
  titleId,
  onClose,
  submitting,
  onSubmit,
  primaryLabel,
  cancelLabel,
  children,
}) {
  const { t } = useTranslation()
  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="client-detail-modal__backdrop" onClick={() => !submitting && onClose()} />
      <div className="client-detail-modal__box client-detail-modal__box--form">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <h2 id={titleId} className="client-detail-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="client-detail-modal__close"
            onClick={() => !submitting && onClose()}
            aria-label={t('clients.close')}
          >
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>
        <form onSubmit={onSubmit} className="client-detail-modal__form">
          <div className="client-detail-modal__body client-detail-modal__body--form">
            <div className="client-detail-modal__body-inner">
              <div className="clients-form-sections">
                <section className="client-detail-modal__section">
                  <div className="client-detail-modal__form-grid">{children}</div>
                </section>
              </div>
            </div>
          </div>
          <footer className="client-detail-modal__footer client-detail-modal__footer--form">
            <button
              type="button"
              className="client-detail-modal__btn client-detail-modal__btn--secondary"
              onClick={onClose}
              disabled={submitting}
            >
              {cancelLabel ?? t('clients.cancel')}
            </button>
            <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={submitting}>
              {submitting ? t('clients.saving', 'Saving…') : primaryLabel}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function SettingsConfirmModal({ title, message, onClose, onConfirm, submitting, confirmLabel, danger }) {
  const { t } = useTranslation()
  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true">
      <div className="client-detail-modal__backdrop" onClick={() => !submitting && onClose()} />
      <div className="client-detail-modal__box client-detail-modal__box--form">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <h2 className="client-detail-modal__title">{title}</h2>
          <button
            type="button"
            className="client-detail-modal__close"
            onClick={() => !submitting && onClose()}
            aria-label={t('clients.close')}
          >
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>
        <div className="client-detail-modal__body client-detail-modal__body--form">
          <div className="client-detail-modal__body-inner">
            <p className="settings-confirm-modal__message">{message}</p>
          </div>
        </div>
        <footer className="client-detail-modal__footer client-detail-modal__footer--form">
          <button
            type="button"
            className="client-detail-modal__btn client-detail-modal__btn--secondary"
            onClick={onClose}
            disabled={submitting}
          >
            {t('clients.cancel')}
          </button>
          <button
            type="button"
            className={`client-detail-modal__btn ${danger ? 'client-detail-modal__btn--danger' : 'client-detail-modal__btn--primary'}`}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? t('clients.deleting') : confirmLabel ?? t('clients.delete')}
          </button>
        </footer>
      </div>
    </div>
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
  const { user, hasPageAccess } = useAuthAccess()
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
  const [activityFilters, setActivityFilters] = useState({ from: '', to: '', event: '', query: '' })
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityPage, setActivityPage] = useState(1)
  const [activityTotalPages, setActivityTotalPages] = useState(1)

  const [shipmentStatuses, setShipmentStatuses] = useState([])
  const [showShipmentStatusModal, setShowShipmentStatusModal] = useState(false)
  const [editingShipmentStatus, setEditingShipmentStatus] = useState(null)
  const [deleteShipmentStatusId, setDeleteShipmentStatusId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [shipmentStatusForm, setShipmentStatusForm] = useState({
    name_ar: '',
    name_en: '',
    type: 'commercial',
    color: '#3B82F6',
    description: '',
    active: true,
    sort_order: 0,
  })

  const [clientStatuses, setClientStatuses] = useState([])
  const [clientStatusModal, setClientStatusModal] = useState(null)
  const [clientStatusForm, setClientStatusForm] = useState({ name_ar: '', name_en: '', sort_order: 1, applies_to: 'client' })
  const [clientStatusSubmitting, setClientStatusSubmitting] = useState(false)
  const [deleteClientStatusId, setDeleteClientStatusId] = useState(null)
  const [deleteClientStatusSubmitting, setDeleteClientStatusSubmitting] = useState(false)

  const [vendorPartnerTypes, setVendorPartnerTypes] = useState([])
  const [vendorPartnerTypeModal, setVendorPartnerTypeModal] = useState(null)
  const [vendorPartnerTypeForm, setVendorPartnerTypeForm] = useState({
    code: '',
    name_ar: '',
    name_en: '',
    sort_order: 1,
  })
  const [vendorPartnerTypeSubmitting, setVendorPartnerTypeSubmitting] = useState(false)
  const [deleteVendorPartnerTypeId, setDeleteVendorPartnerTypeId] = useState(null)
  const [deleteVendorPartnerTypeSubmitting, setDeleteVendorPartnerTypeSubmitting] = useState(false)

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

  const [settingsPorts, setSettingsPorts] = useState([])
  const [portModal, setPortModal] = useState(null)
  const [portForm, setPortForm] = useState({ name: '', code: '', country: '', active: true })
  const [portSubmitting, setPortSubmitting] = useState(false)
  const [deletePortId, setDeletePortId] = useState(null)
  const [deletePortSubmitting, setDeletePortSubmitting] = useState(false)

  const [statusesTabLoading, setStatusesTabLoading] = useState(false)
  const [contentMgmtSection, setContentMgmtSection] = useState('ports')
  const [companySection, setCompanySection] = useState('profile')

  const isAdminLike = useMemo(() => {
    const primaryRole = user?.primary_role ?? user?.roles?.[0]
    const name = (primaryRole || '').toString().toLowerCase()
    return name === 'admin' || name === 'sales_manager'
  }, [user])

  const canSeeTicketStatuses = useMemo(() => hasPageAccess('settings'), [hasPageAccess])
  const canManageTicketStatuses = useMemo(() => hasPageAccess('settings'), [hasPageAccess])

  const canSeeTicketTypes = useMemo(() => hasPageAccess('settings'), [hasPageAccess])
  const canManageTicketTypes = useMemo(() => hasPageAccess('settings'), [hasPageAccess])

  const canSeeCommLogTypes = useMemo(() => hasPageAccess('settings'), [hasPageAccess])
  const canManageCommLogTypes = useMemo(() => hasPageAccess('settings'), [hasPageAccess])

  const contentMgmtNavItems = useMemo(() => {
    const items = [
      { id: 'ports', label: t('settings.ports.cardTitle') },
      { id: 'shipmentStatuses', label: t('settings.shipmentStatuses.cardTitle') },
      { id: 'clientStatuses', label: t('settings.clientStatuses.cardTitle') },
      { id: 'vendorPartnerTypes', label: t('settings.vendorPartnerTypes.cardTitle') },
    ]
    if (canSeeTicketStatuses) {
      items.push({ id: 'ticketStatuses', label: t('settings.ticketStatuses.cardTitle') })
    }
    if (canSeeTicketTypes) {
      items.push({ id: 'ticketTypes', label: t('settings.ticketTypes.cardTitle') })
    }
    if (canSeeTicketStatuses) {
      items.push({ id: 'ticketPriorities', label: t('settings.ticketPriorities.cardTitle') })
    }
    if (canSeeCommLogTypes) {
      items.push({ id: 'communicationLogTypes', label: t('settings.communicationLogTypes.cardTitle') })
    }
    return items
  }, [t, canSeeTicketStatuses, canSeeTicketTypes, canSeeCommLogTypes])

  useEffect(() => {
    if (activeTab !== 'statuses' || !isAdminLike) return
    const ids = contentMgmtNavItems.map((i) => i.id)
    if (ids.length > 0 && !ids.includes(contentMgmtSection)) {
      setContentMgmtSection(ids[0])
    }
  }, [activeTab, isAdminLike, contentMgmtNavItems, contentMgmtSection])

  const companyNavItems = useMemo(() => {
    const items = [
      { id: 'profile', label: t('settings.company.profileTitle') },
      { id: 'location', label: t('settings.company.locationTitle') },
    ]
    if (isAdminLike) {
      items.push({ id: 'attendance', label: t('settings.attendancePolicy.title') })
    }
    return items
  }, [t, isAdminLike])

  useEffect(() => {
    if (activeTab !== 'company') return
    const ids = companyNavItems.map((i) => i.id)
    if (ids.length > 0 && !ids.includes(companySection)) {
      setCompanySection(ids[0])
    }
  }, [activeTab, companyNavItems, companySection])

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
        const vendorPartnerTypesP = listVendorPartnerTypes(token)
          .then((data) => {
            const list = data.data ?? data
            return Array.isArray(list) ? list : []
          })
          .catch(() => [])
        const portsP = listPorts(token)
          .then((res) => {
            const list = res?.data ?? res
            return Array.isArray(list) ? list : []
          })
          .catch(() => [])

        const [clients, tickets, types, priorities, commTypes, partnerTypesList, portsList] = await Promise.all([
          clientP,
          ticketStatusesP,
          ticketTypesP,
          ticketPrioritiesP,
          commLogTypesP,
          vendorPartnerTypesP,
          portsP,
        ])
        if (!cancelled) {
          setClientStatuses(clients)
          setTicketStatuses(tickets)
          setTicketTypes(types)
          setTicketPriorities(priorities)
          setCommunicationLogTypes(commTypes)
          setVendorPartnerTypes(partnerTypesList)
          setSettingsPorts(portsList)
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
          listActivities(token, { page: 1 }).catch(() => ({ data: [] })),
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
        if (activitiesRes?.meta) {
          setActivityPage(activitiesRes.meta.current_page || 1)
          setActivityTotalPages(activitiesRes.meta.last_page || 1)
        } else {
          setActivityPage(1)
          setActivityTotalPages(1)
        }
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
      const res = await listActivities(token, { ...activityFilters, page: activityPage })
      setActivities(Array.isArray(res?.data) ? res.data : [])
      if (res?.meta) {
        setActivityPage(res.meta.current_page || 1)
        setActivityTotalPages(res.meta.last_page || 1)
      } else {
        setActivityTotalPages(1)
      }
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
      type: 'commercial',
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
      type: status.type || 'commercial',
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
    setClientStatusForm({ name_ar: '', name_en: '', sort_order: 1, applies_to: 'lead' })
    setClientStatusModal('create')
  }

  function openEditClientStatus(row) {
    setClientStatusForm({
      name_ar: row.name_ar ?? row.name ?? '',
      name_en: row.name_en ?? row.name ?? '',
      sort_order: row.sort_order ?? 1,
      applies_to: row.applies_to === 'client' ? 'client' : 'lead',
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
        applies_to: clientStatusForm.applies_to === 'client' ? 'client' : 'lead',
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

  function openNewVendorPartnerType() {
    setVendorPartnerTypeForm({ code: '', name_ar: '', name_en: '', sort_order: 1 })
    setVendorPartnerTypeModal('create')
  }

  function openEditVendorPartnerType(row) {
    setVendorPartnerTypeForm({
      code: row.code ?? '',
      name_ar: row.name_ar ?? '',
      name_en: row.name_en ?? '',
      sort_order: row.sort_order ?? 1,
    })
    setVendorPartnerTypeModal({ mode: 'edit', id: row.id })
  }

  async function handleSaveVendorPartnerType(e) {
    e.preventDefault()
    if (!token) return
    setVendorPartnerTypeSubmitting(true)
    setError('')
    try {
      const body = {
        code: vendorPartnerTypeForm.code.trim().replace(/\s+/g, '_'),
        name_ar: vendorPartnerTypeForm.name_ar.trim(),
        name_en: vendorPartnerTypeForm.name_en.trim(),
        sort_order: Number(vendorPartnerTypeForm.sort_order) || 0,
      }
      if (vendorPartnerTypeModal?.mode === 'edit' && vendorPartnerTypeModal.id != null) {
        await updateVendorPartnerType(token, vendorPartnerTypeModal.id, body)
      } else {
        await createVendorPartnerType(token, body)
      }
      const data = await listVendorPartnerTypes(token)
      const list = data.data ?? data
      setVendorPartnerTypes(Array.isArray(list) ? list : [])
      setVendorPartnerTypeModal(null)
      setAlert({ type: 'success', message: t('settings.vendorPartnerTypes.saved') })
    } catch (err) {
      setError(err.message || t('settings.errors.saveVendorPartnerType'))
    } finally {
      setVendorPartnerTypeSubmitting(false)
    }
  }

  async function handleDeleteVendorPartnerTypeConfirm() {
    if (!token || deleteVendorPartnerTypeId == null) return
    setDeleteVendorPartnerTypeSubmitting(true)
    setError('')
    try {
      await deleteVendorPartnerType(token, deleteVendorPartnerTypeId)
      const data = await listVendorPartnerTypes(token)
      const list = data.data ?? data
      setVendorPartnerTypes(Array.isArray(list) ? list : [])
      setDeleteVendorPartnerTypeId(null)
      setAlert({ type: 'success', message: t('settings.vendorPartnerTypes.deleted') })
    } catch (err) {
      setError(err.message || t('settings.errors.deleteVendorPartnerType'))
    } finally {
      setDeleteVendorPartnerTypeSubmitting(false)
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

  async function refreshSettingsPorts() {
    if (!token) return
    try {
      const res = await listPorts(token)
      const list = res?.data ?? res
      setSettingsPorts(Array.isArray(list) ? list : [])
    } catch {
      setSettingsPorts([])
    }
  }

  function openNewPort() {
    setPortForm({ name: '', code: '', country: '', active: true })
    setPortModal('create')
  }

  function openEditPort(row) {
    setPortForm({
      name: row.name ?? '',
      code: row.code ?? '',
      country: row.country ?? '',
      active: Boolean(row.active),
    })
    setPortModal({ mode: 'edit', id: row.id })
  }

  async function handleSavePort(e) {
    e.preventDefault()
    if (!token || !String(portForm.name).trim()) return
    const isEdit = portModal?.mode === 'edit' && portModal.id != null
    setPortSubmitting(true)
    setError('')
    try {
      const body = {
        name: String(portForm.name).trim(),
        code: String(portForm.code || '').trim() || null,
        country: String(portForm.country || '').trim() || null,
        active: Boolean(portForm.active),
      }
      if (isEdit) {
        await updatePort(token, portModal.id, body)
      } else {
        await createPort(token, body)
      }
      await refreshSettingsPorts()
      setPortModal(null)
      setAlert({ type: 'success', message: isEdit ? t('settings.ports.updated') : t('settings.ports.created') })
    } catch (err) {
      setError(err.message || t('settings.errors.savePort'))
    } finally {
      setPortSubmitting(false)
    }
  }

  async function handleDeletePortConfirm() {
    if (!token || deletePortId == null) return
    setDeletePortSubmitting(true)
    setError('')
    try {
      await deletePort(token, deletePortId)
      await refreshSettingsPorts()
      setDeletePortId(null)
      setAlert({ type: 'success', message: t('settings.ports.deleted') })
    } catch (err) {
      setError(err.message || t('settings.errors.deletePort'))
    } finally {
      setDeletePortSubmitting(false)
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

  function _describeActivity(event, props) {
    const p = props || {}
    const v = (key) => {
      const parts = key.split('.')
      return parts.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined), p)
    }
    const yn = (val) => (val ? t('common.yes', 'Yes') : t('common.no', 'No'))

    switch (event) {
      // ── Settings ─────────────────────────────────────────────
      case 'settings.session_settings_updated':
        return [
          v('reset_hour') !== undefined && `Reset hour: ${v('reset_hour')}`,
          v('idle_logout_minutes') !== undefined && `Idle logout: ${v('idle_logout_minutes')} min`,
        ].filter(Boolean).join(' · ') || '—'

      case 'settings.attendance_policy_updated': {
        const pol = v('policy') || {}
        return [
          pol.workday_start && pol.workday_end && `${pol.workday_start}–${pol.workday_end}`,
          pol.grace_minutes !== undefined && `Grace: ${pol.grace_minutes} min`,
          pol.enforce_geofence !== undefined && `Geofence: ${yn(pol.enforce_geofence)}`,
        ].filter(Boolean).join(' · ') || '—'
      }

      case 'settings.company_profile_updated': {
        const prof = v('profile') || {}
        return prof.name_en || prof.name_ar || '—'
      }

      case 'settings.company_location_updated':
        return [
          v('lat') !== undefined && v('lng') !== undefined && `${v('lat')}, ${v('lng')}`,
          v('radius_m') !== undefined && `Radius: ${v('radius_m')} m`,
        ].filter(Boolean).join(' · ') || '—'

      case 'settings.system_preferences_updated': {
        const ch = v('changes') || {}
        return Object.entries(ch)
          .filter(([, vv]) => vv !== null && vv !== undefined)
          .map(([kk, vv]) => `${kk}: ${vv}`)
          .join(', ') || '—'
      }

      case 'settings.notification_preferences_updated': {
        const ch = v('changes') || {}
        const on = Object.entries(ch).filter(([, vv]) => vv === true).map(([kk]) => kk)
        const off = Object.entries(ch).filter(([, vv]) => vv === false).map(([kk]) => kk)
        return [
          on.length > 0 && `On: ${on.join(', ')}`,
          off.length > 0 && `Off: ${off.join(', ')}`,
        ].filter(Boolean).join(' · ') || '—'
      }

      // ── Shipment ──────────────────────────────────────────────
      case 'shipment.created':
        return [
          v('bl_number') && `BL: ${v('bl_number')}`,
          v('client_id') && `Client ID: ${v('client_id')}`,
        ].filter(Boolean).join(' · ') || '—'

      case 'shipment.status_changed':
        return v('from') && v('to') ? `${v('from')} → ${v('to')}` : '—'

      case 'shipment.operations_status_changed':
        return v('from') !== undefined && v('to') !== undefined ? `Stage ${v('from')} → ${v('to')}` : '—'

      case 'shipment.deleted':
        return v('bl_number') ? `BL: ${v('bl_number')}` : '—'

      case 'shipment.schedule_updated': {
        const parts = []
        if (v('etd')) parts.push(`ETD: ${v('etd')}`)
        if (v('eta')) parts.push(`ETA: ${v('eta')}`)
        return parts.join(' · ') || '—'
      }

      case 'shipment.reefer_updated':
        return [
          v('reefer_temp') && `Temp: ${v('reefer_temp')}`,
          v('reefer_vent') && `Vent: ${v('reefer_vent')}`,
          v('reefer_hum') && `Hum: ${v('reefer_hum')}`,
        ].filter(Boolean).join(' · ') || '—'

      case 'shipment.financial_expense_created':
      case 'shipment.financial_expense_updated':
        return [
          v('category') && `${v('category')}`,
          v('amount') !== undefined && `${v('currency') || ''}${v('amount')}`,
        ].filter(Boolean).join(' · ') || '—'

      case 'shipment.financial_expense_receipt_uploaded':
        return v('category') ? `Receipt for ${v('category')}` : '—'

      case 'shipment.notify_sales_financials':
        return v('bl_number') ? `BL: ${v('bl_number')}` : '—'

      // ── SD Form ───────────────────────────────────────────────
      case 'sd_form.created':
      case 'sd_form.updated':
      case 'sd_form.submitted':
      case 'sd_form.deleted':
        return v('sd_number') ? `SD #${v('sd_number')}` : '—'

      case 'sd_form.linked_shipment':
        return [
          v('sd_number') && `SD #${v('sd_number')}`,
          v('shipment_id') && `Shipment #${v('shipment_id')}`,
        ].filter(Boolean).join(' → ') || '—'

      case 'sd_form.sent_to_operations':
      case 'sd_form.email_to_operations':
        return v('sd_number') ? `SD #${v('sd_number')}` : '—'

      // ── Invoice ───────────────────────────────────────────────
      case 'invoice.created':
      case 'invoice.issued':
      case 'invoice.cancelled':
        return [
          v('invoice_number') || v('number'),
          v('amount') !== undefined && `${v('currency') || ''}${v('amount')}`,
        ].filter(Boolean).join(' · ') || '—'

      case 'invoice.payment_recorded':
      case 'shipment.invoice_payment_recorded':
        return v('amount') !== undefined ? `${v('currency') || ''}${v('amount')}` : '—'

      // ── Vendor bill ───────────────────────────────────────────
      case 'vendor_bill.created':
      case 'vendor_bill.updated':
      case 'vendor_bill.approved':
      case 'vendor_bill.cancelled':
        return v('amount') !== undefined ? `${v('currency') || ''}${v('amount')}` : '—'

      case 'vendor_bill.payment_recorded':
        return v('amount') !== undefined ? `Paid ${v('currency') || ''}${v('amount')}` : '—'

      // ── Payment ───────────────────────────────────────────────
      case 'payment.created':
        return v('amount') !== undefined ? `${v('currency') || ''}${v('amount')}` : '—'

      // ── User ──────────────────────────────────────────────────
      case 'user.created':
        return [v('email'), v('role') && `Role: ${v('role')}`].filter(Boolean).join(' · ') || '—'

      case 'user.deleted':
        return v('email') || '—'

      case 'user.password_changed':
        return t('settings.activity.events.user.password_changed', 'Password changed')

      case 'user.role_assigned':
        return v('role') ? `→ ${v('role')}` : '—'

      case 'user.permissions_updated': {
        const after = v('after')
        return Array.isArray(after) ? `${after.length} permissions` : '—'
      }

      default:
        return '—'
    }
  }

  const activityColumns = [
    { key: 'created_at', label: t('settings.activity.table.time'), sortable: false, render: (val) => (val ? new Date(val).toLocaleString() : '—') },
    {
      key: 'event',
      label: t('settings.activity.table.event'),
      sortable: false,
      render: (val, row) => {
        const key = val || row.log_name
        if (!key) return '—'
        const translated = t(`settings.activity.events.${key}`, { defaultValue: '' })
        return translated || key
      },
    },
    // description column hidden for now
    // { key: 'properties', label: t('settings.activity.table.description'), sortable: false, render: (props, row) => describeActivity(row.event || row.log_name, props) },
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
      key: 'type',
      label: t('settings.shipmentStatuses.table.type'),
      sortable: false,
      render: (val) => (val === 'operational' ? t('settings.shipmentStatuses.typeOperational') : t('settings.shipmentStatuses.typeCommercial')),
    },
    {
      key: 'actions',
      label: t('settings.shipmentStatuses.table.actions'),
      sortable: false,
      render: (_, row) => (
        <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('settings.shipmentStatuses.table.actions')}>
          <IconActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t('settings.shipmentStatuses.edit')}
            onClick={() => openEditShipmentStatus(row)}
          />
          <IconActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t('settings.shipmentStatuses.delete')}
            variant="danger"
            onClick={() => setDeleteShipmentStatusId(row.id)}
          />
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
    {
      key: 'applies_to',
      label: t('settings.clientStatuses.table.appliesTo'),
      sortable: false,
      render: (val) =>
        val === 'client' ? t('settings.clientStatuses.appliesToClient') : t('settings.clientStatuses.appliesToLead'),
    },
    { key: 'sort_order', label: t('settings.clientStatuses.table.sortOrder'), sortable: false, render: (val) => val ?? '—' },
    {
      key: 'actions',
      label: t('settings.shipmentStatuses.table.actions'),
      sortable: false,
      render: (_, row) => (
        <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('settings.shipmentStatuses.table.actions')}>
          <IconActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t('clients.edit')}
            onClick={() => openEditClientStatus(row)}
          />
          <IconActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t('clients.delete')}
            variant="danger"
            onClick={() => setDeleteClientStatusId(row.id)}
          />
        </div>
      ),
    },
  ]

  const vendorPartnerTypeColumns = [
    { key: 'code', label: t('settings.vendorPartnerTypes.table.code'), sortable: false },
    {
      key: 'display',
      label: t('settings.statuses.displayName'),
      sortable: false,
      render: (_, row) => localizedStatusLabel(row, i18n.language),
    },
    { key: 'sort_order', label: t('settings.vendorPartnerTypes.table.sortOrder'), sortable: false, render: (val) => val ?? '—' },
    {
      key: 'actions',
      label: t('settings.shipmentStatuses.table.actions'),
      sortable: false,
      render: (_, row) => (
        <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('settings.shipmentStatuses.table.actions')}>
          <IconActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t('clients.edit')}
            onClick={() => openEditVendorPartnerType(row)}
          />
          <IconActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t('clients.delete')}
            variant="danger"
            onClick={() => setDeleteVendorPartnerTypeId(row.id)}
          />
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
          <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('settings.shipmentStatuses.table.actions')}>
            <IconActionButton
              icon={<Pencil className="h-4 w-4" />}
              label={t('clients.edit')}
              onClick={() => openEditTicketStatus(row)}
            />
            <IconActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label={t('clients.delete')}
              variant="danger"
              onClick={() => setDeleteTicketStatusId(row.id)}
            />
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
          <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('settings.shipmentStatuses.table.actions')}>
            <IconActionButton
              icon={<Pencil className="h-4 w-4" />}
              label={t('clients.edit')}
              onClick={() => openEditTicketType(row)}
            />
            <IconActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label={t('clients.delete')}
              variant="danger"
              onClick={() => setDeleteTicketTypeId(row.id)}
            />
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
          <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('settings.shipmentStatuses.table.actions')}>
            <IconActionButton
              icon={<Pencil className="h-4 w-4" />}
              label={t('clients.edit')}
              onClick={() => openEditTicketPriority(row)}
            />
            <IconActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label={t('clients.delete')}
              variant="danger"
              onClick={() => setDeleteTicketPriorityId(row.id)}
            />
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
          <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('settings.shipmentStatuses.table.actions')}>
            <IconActionButton
              icon={<Pencil className="h-4 w-4" />}
              label={t('clients.edit')}
              onClick={() => openEditCommLogType(row)}
            />
            <IconActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label={t('clients.delete')}
              variant="danger"
              onClick={() => setDeleteCommLogTypeId(row.id)}
            />
          </div>
        ),
      }]
      : []),
  ]

  const portColumns = [
    { key: 'name', label: t('settings.ports.table.name'), sortable: false, render: (val) => val ?? '—' },
    { key: 'code', label: t('settings.ports.table.code'), sortable: false, render: (val) => val ?? '—' },
    { key: 'country', label: t('settings.ports.table.country'), sortable: false, render: (val) => val ?? '—' },
    {
      key: 'active',
      label: t('settings.ports.table.active'),
      sortable: false,
      render: (val) => (val ? t('common.yes', 'Yes') : t('common.no', 'No')),
    },
    {
      key: 'actions',
      label: t('settings.ports.table.actions'),
      sortable: false,
      render: (_, row) => (
        <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('settings.ports.table.actions')}>
          <IconActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t('settings.ports.edit')}
            onClick={() => openEditPort(row)}
          />
          <IconActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t('settings.ports.delete')}
            variant="danger"
            onClick={() => setDeletePortId(row.id)}
          />
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
                  <div className="settings-content-mgmt settings-content-mgmt--company" dir={dir}>
                    <aside className="settings-content-mgmt__sidebar" aria-label={t('settings.company.sidebarAria')}>
                      <p className="settings-content-mgmt__sidebar-title">{t('settings.company.sidebarTitle')}</p>
                      <nav className="settings-content-mgmt__nav" role="navigation">
                        {companyNavItems.map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            className={`settings-content-mgmt__nav-item ${companySection === id ? 'settings-content-mgmt__nav-item--active' : ''}`.trim()}
                            onClick={() => setCompanySection(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </nav>
                    </aside>
                    <div className="settings-content-mgmt__main settings-tab-content--animate">
                      {companySection === 'profile' ? (
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
                      ) : null}

                      {companySection === 'location' ? (
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
                      ) : null}

                      {companySection === 'attendance' && isAdminLike ? (
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
                      ) : null}
                    </div>
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
                        <input
                          type="text"
                          placeholder={t('settings.activity.searchPlaceholder')}
                          value={activityFilters.query}
                          onChange={(e) => setActivityFilters((f) => ({ ...f, query: e.target.value }))}
                          className="clients-input"
                        />

                        <button
                          type="button"
                          className="clients-filters__clear clients-filters__btn-icon"
                          onClick={() => {
                            setActivityFilters({ from: '', to: '', event: '', query: '' })
                            setActivityPage(1)
                          }}
                          aria-label={t('customerServices.clearFilters')}
                        >
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
                        {activityTotalPages > 1 && (
                          <div className="settings-pagination">
                            <button
                              type="button"
                              className="page-header__btn"
                              onClick={() => {
                                if (activityPage > 1) {
                                  setActivityPage((p) => p - 1)
                                  refreshActivities()
                                }
                              }}
                              disabled={activityPage <= 1 || activityLoading}
                            >
                              {t('pagination.prev')}
                            </button>
                            <span className="settings-pagination__info">
                              {t('pagination.pageOfTotal', { current: activityPage, total: activityTotalPages })}
                            </span>
                            <button
                              type="button"
                              className="page-header__btn"
                              onClick={() => {
                                if (activityPage < activityTotalPages) {
                                  setActivityPage((p) => p + 1)
                                  refreshActivities()
                                }
                              }}
                              disabled={activityPage >= activityTotalPages || activityLoading}
                            >
                              {t('pagination.next')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </SectionCard>
                </div>
              )}
            </div>

            {/* Tab: Content management (ports, statuses, lookups) */}
            {isAdminLike && (
              <div role="tabpanel" className={`cs-tab-panel settings-tab-panel ${activeTab === 'statuses' ? 'cs-tab-panel--active' : ''}`}>
                {activeTab === 'statuses' && (
                  <div className="settings-tab-content settings-statuses-tab">
                    {statusesTabLoading ? (
                      <div className="cs-loading-wrap">
                        <LoaderDots />
                      </div>
                    ) : (
                      <div className="settings-content-mgmt" dir={dir}>
                        <aside className="settings-content-mgmt__sidebar" aria-label={t('settings.contentMgmt.sidebarAria')}>
                          <p className="settings-content-mgmt__sidebar-title">{t('settings.contentMgmt.sidebarTitle')}</p>
                          <nav className="settings-content-mgmt__nav" role="navigation">
                            {contentMgmtNavItems.map(({ id, label }) => (
                              <button
                                key={id}
                                type="button"
                                className={`settings-content-mgmt__nav-item ${contentMgmtSection === id ? 'settings-content-mgmt__nav-item--active' : ''}`.trim()}
                                onClick={() => setContentMgmtSection(id)}
                              >
                                {label}
                              </button>
                            ))}
                          </nav>
                        </aside>
                        <div className="settings-content-mgmt__main settings-tab-content--animate">
                          {contentMgmtSection === 'ports' ? (
                            <SectionCard
                              title={t('settings.ports.cardTitle')}
                              subtitle={t('settings.statuses.portsHint')}
                              actions={
                                <button type="button" className="page-header__btn page-header__btn--primary" onClick={openNewPort}>
                                  {t('settings.ports.addTitle')}
                                </button>
                              }
                            >
                              <div className="settings-table-card">
                                <Table columns={portColumns} data={settingsPorts} getRowKey={(r) => r.id} emptyMessage={t('settings.ports.empty')} />
                              </div>
                            </SectionCard>
                          ) : null}

                          {contentMgmtSection === 'shipmentStatuses' ? (
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
                          ) : null}

                          {contentMgmtSection === 'clientStatuses' ? (
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
                          ) : null}

                          {contentMgmtSection === 'vendorPartnerTypes' ? (
                            <SectionCard
                              title={t('settings.vendorPartnerTypes.cardTitle')}
                              subtitle={t('settings.statuses.vendorPartnerTypesHint')}
                              actions={
                                <button type="button" className="page-header__btn page-header__btn--primary" onClick={openNewVendorPartnerType}>
                                  {t('settings.vendorPartnerTypes.addTitle')}
                                </button>
                              }
                            >
                              <div className="settings-table-card">
                                <Table columns={vendorPartnerTypeColumns} data={vendorPartnerTypes} getRowKey={(r) => r.id} emptyMessage={t('settings.vendorPartnerTypes.empty')} />
                              </div>
                            </SectionCard>
                          ) : null}

                          {contentMgmtSection === 'ticketStatuses' && canSeeTicketStatuses ? (
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

                          {contentMgmtSection === 'ticketTypes' && canSeeTicketTypes ? (
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

                          {contentMgmtSection === 'ticketPriorities' && canSeeTicketStatuses ? (
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

                          {contentMgmtSection === 'communicationLogTypes' && canSeeCommLogTypes ? (
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
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal: Create/Edit Shipment Status */}
        {showShipmentStatusModal ? (
          <SettingsFormModal
            title={editingShipmentStatus ? t('settings.shipmentStatuses.editTitle') : t('settings.shipmentStatuses.addTitle')}
            titleId="settings-shipment-status-modal-title"
            onClose={() => {
              setShowShipmentStatusModal(false)
              setEditingShipmentStatus(null)
            }}
            submitting={saving}
            onSubmit={handleSaveShipmentStatus}
            primaryLabel={editingShipmentStatus ? t('settings.shipmentStatuses.update') : t('settings.shipmentStatuses.create')}
            cancelLabel={t('settings.shipmentStatuses.cancel')}
          >
            <SettingsModalField label={t('settings.shipmentStatuses.nameAr')} htmlFor="settings-ss-name-ar">
              <input
                id="settings-ss-name-ar"
                className="clients-input"
                value={shipmentStatusForm.name_ar}
                onChange={(e) => setShipmentStatusForm((p) => ({ ...p, name_ar: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.shipmentStatuses.nameEn')} htmlFor="settings-ss-name-en">
              <input
                id="settings-ss-name-en"
                className="clients-input"
                value={shipmentStatusForm.name_en}
                onChange={(e) => setShipmentStatusForm((p) => ({ ...p, name_en: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.shipmentStatuses.type')} htmlFor="settings-ss-type">
              <select
                id="settings-ss-type"
                className="clients-input"
                value={shipmentStatusForm.type}
                onChange={(e) => setShipmentStatusForm((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="commercial">{t('settings.shipmentStatuses.typeCommercial')}</option>
                <option value="operational">{t('settings.shipmentStatuses.typeOperational')}</option>
              </select>
            </SettingsModalField>
            <SettingsModalField label={t('settings.shipmentStatuses.color')} htmlFor="settings-ss-color">
              <input
                id="settings-ss-color"
                className="clients-input"
                value={shipmentStatusForm.color}
                onChange={(e) => setShipmentStatusForm((p) => ({ ...p, color: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.shipmentStatuses.description')} htmlFor="settings-ss-desc" fullWidth>
              <input
                id="settings-ss-desc"
                className="clients-input"
                value={shipmentStatusForm.description}
                onChange={(e) => setShipmentStatusForm((p) => ({ ...p, description: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.shipmentStatuses.sortOrder')} htmlFor="settings-ss-sort">
              <input
                id="settings-ss-sort"
                type="number"
                className="clients-input"
                value={shipmentStatusForm.sort_order}
                onChange={(e) => setShipmentStatusForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
            </SettingsModalField>
            <div className="client-detail-modal__form-field client-detail-modal__form-field--full settings-modal-checkbox-field">
              <label htmlFor="settings-ss-active" className="settings-modal-checkbox-field__label">
                {t('settings.shipmentStatuses.active')}
              </label>
              <input
                id="settings-ss-active"
                type="checkbox"
                checked={shipmentStatusForm.active}
                onChange={(e) => setShipmentStatusForm((p) => ({ ...p, active: e.target.checked }))}
                className="settings-checkbox"
              />
            </div>
          </SettingsFormModal>
        ) : null}

        {/* Modal: Delete Shipment Status */}
        {deleteShipmentStatusId != null ? (
          <SettingsConfirmModal
            title={t('settings.shipmentStatuses.deleteConfirmTitle', 'Delete Shipment Status')}
            message={t('settings.shipmentStatuses.deleteConfirm')}
            onClose={() => setDeleteShipmentStatusId(null)}
            onConfirm={handleDeleteShipmentStatusConfirm}
            submitting={deleteSubmitting}
            danger
          />
        ) : null}

        {clientStatusModal === 'create' || clientStatusModal?.mode === 'edit' ? (
          <SettingsFormModal
            title={clientStatusModal?.mode === 'edit' ? t('settings.clientStatuses.editTitle') : t('settings.clientStatuses.addTitle')}
            titleId="settings-client-status-modal-title"
            onClose={() => setClientStatusModal(null)}
            submitting={clientStatusSubmitting}
            onSubmit={handleSaveClientStatus}
            primaryLabel={t('settings.clientStatuses.save')}
            cancelLabel={t('settings.shipmentStatuses.cancel')}
          >
            <SettingsModalField label={t('settings.clientStatuses.nameAr')} htmlFor="settings-cs-name-ar">
              <input
                id="settings-cs-name-ar"
                className="clients-input"
                required
                value={clientStatusForm.name_ar}
                onChange={(e) => setClientStatusForm((p) => ({ ...p, name_ar: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.clientStatuses.nameEn')} htmlFor="settings-cs-name-en">
              <input
                id="settings-cs-name-en"
                className="clients-input"
                required
                value={clientStatusForm.name_en}
                onChange={(e) => setClientStatusForm((p) => ({ ...p, name_en: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.clientStatuses.appliesTo')} htmlFor="settings-cs-applies">
              <select
                id="settings-cs-applies"
                className="clients-input"
                value={clientStatusForm.applies_to}
                onChange={(e) => setClientStatusForm((p) => ({ ...p, applies_to: e.target.value }))}
                required
              >
                <option value="lead">{t('settings.clientStatuses.appliesToLead')}</option>
                <option value="client">{t('settings.clientStatuses.appliesToClient')}</option>
              </select>
            </SettingsModalField>
            <SettingsModalField label={t('settings.clientStatuses.sortOrder')} htmlFor="settings-cs-sort">
              <input
                id="settings-cs-sort"
                type="number"
                min={0}
                className="clients-input"
                value={clientStatusForm.sort_order}
                onChange={(e) => setClientStatusForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
            </SettingsModalField>
          </SettingsFormModal>
        ) : null}

        {deleteClientStatusId != null ? (
          <SettingsConfirmModal
            title={t('settings.clientStatuses.deleteTitle')}
            message={t('settings.clientStatuses.deleteConfirm')}
            onClose={() => setDeleteClientStatusId(null)}
            onConfirm={handleDeleteClientStatusConfirm}
            submitting={deleteClientStatusSubmitting}
            danger
          />
        ) : null}

        {vendorPartnerTypeModal === 'create' || vendorPartnerTypeModal?.mode === 'edit' ? (
          <SettingsFormModal
            title={vendorPartnerTypeModal?.mode === 'edit' ? t('settings.vendorPartnerTypes.editTitle') : t('settings.vendorPartnerTypes.addTitle')}
            titleId="settings-vendor-partner-type-modal-title"
            onClose={() => setVendorPartnerTypeModal(null)}
            submitting={vendorPartnerTypeSubmitting}
            onSubmit={handleSaveVendorPartnerType}
            primaryLabel={t('settings.vendorPartnerTypes.save')}
            cancelLabel={t('settings.shipmentStatuses.cancel')}
          >
            <SettingsModalField label={t('settings.vendorPartnerTypes.code')} htmlFor="settings-vpt-code">
              <input
                id="settings-vpt-code"
                className="clients-input"
                value={vendorPartnerTypeForm.code}
                onChange={(e) => setVendorPartnerTypeForm((p) => ({ ...p, code: e.target.value }))}
                required
                disabled={vendorPartnerTypeModal?.mode === 'edit'}
                maxLength={40}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.vendorPartnerTypes.nameAr')} htmlFor="settings-vpt-ar">
              <input
                id="settings-vpt-ar"
                className="clients-input"
                required
                value={vendorPartnerTypeForm.name_ar}
                onChange={(e) => setVendorPartnerTypeForm((p) => ({ ...p, name_ar: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.vendorPartnerTypes.nameEn')} htmlFor="settings-vpt-en">
              <input
                id="settings-vpt-en"
                className="clients-input"
                required
                value={vendorPartnerTypeForm.name_en}
                onChange={(e) => setVendorPartnerTypeForm((p) => ({ ...p, name_en: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.vendorPartnerTypes.sortOrder')} htmlFor="settings-vpt-sort">
              <input
                id="settings-vpt-sort"
                type="number"
                min={0}
                className="clients-input"
                value={vendorPartnerTypeForm.sort_order}
                onChange={(e) => setVendorPartnerTypeForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
            </SettingsModalField>
          </SettingsFormModal>
        ) : null}

        {deleteVendorPartnerTypeId != null ? (
          <SettingsConfirmModal
            title={t('settings.vendorPartnerTypes.deleteTitle')}
            message={t('settings.vendorPartnerTypes.deleteConfirm')}
            onClose={() => setDeleteVendorPartnerTypeId(null)}
            onConfirm={handleDeleteVendorPartnerTypeConfirm}
            submitting={deleteVendorPartnerTypeSubmitting}
            danger
          />
        ) : null}

        {showTicketStatusModal ? (
          <SettingsFormModal
            title={editingTicketStatus ? t('settings.ticketStatuses.editTitle') : t('settings.ticketStatuses.addTitle')}
            titleId="settings-ticket-status-modal-title"
            onClose={() => {
              setShowTicketStatusModal(false)
              setEditingTicketStatus(null)
            }}
            submitting={saving}
            onSubmit={handleSaveTicketStatus}
            primaryLabel={editingTicketStatus ? t('settings.ticketStatuses.save') : t('settings.ticketStatuses.create')}
            cancelLabel={t('settings.shipmentStatuses.cancel')}
          >
            <SettingsModalField label={t('settings.ticketStatuses.key')} htmlFor="settings-ts-key">
              <input
                id="settings-ts-key"
                className="clients-input"
                value={ticketStatusForm.key}
                onChange={(e) => setTicketStatusForm((p) => ({ ...p, key: e.target.value }))}
                required
                disabled={!!editingTicketStatus}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.ticketStatuses.labelAr')} htmlFor="settings-ts-ar">
              <input
                id="settings-ts-ar"
                className="clients-input"
                required
                value={ticketStatusForm.label_ar}
                onChange={(e) => setTicketStatusForm((p) => ({ ...p, label_ar: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.ticketStatuses.labelEn')} htmlFor="settings-ts-en">
              <input
                id="settings-ts-en"
                className="clients-input"
                required
                value={ticketStatusForm.label_en}
                onChange={(e) => setTicketStatusForm((p) => ({ ...p, label_en: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.ticketStatuses.sortOrder')} htmlFor="settings-ts-sort">
              <input
                id="settings-ts-sort"
                type="number"
                min={0}
                className="clients-input"
                value={ticketStatusForm.sort_order}
                onChange={(e) => setTicketStatusForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
            </SettingsModalField>
            <div className="client-detail-modal__form-field client-detail-modal__form-field--full settings-modal-checkbox-field">
              <label htmlFor="settings-ts-active" className="settings-modal-checkbox-field__label">
                {t('settings.shipmentStatuses.active')}
              </label>
              <input
                id="settings-ts-active"
                type="checkbox"
                checked={ticketStatusForm.active}
                onChange={(e) => setTicketStatusForm((p) => ({ ...p, active: e.target.checked }))}
                className="settings-checkbox"
              />
            </div>
          </SettingsFormModal>
        ) : null}

        {deleteTicketStatusId != null ? (
          <SettingsConfirmModal
            title={t('settings.ticketStatuses.deleteTitle')}
            message={t('settings.ticketStatuses.deleteConfirm')}
            onClose={() => setDeleteTicketStatusId(null)}
            onConfirm={handleDeleteTicketStatusConfirm}
            submitting={deleteTicketStatusSubmitting}
            danger
          />
        ) : null}

        {showTicketTypeModal ? (
          <SettingsFormModal
            title={editingTicketType ? t('settings.ticketTypes.editTitle') : t('settings.ticketTypes.addTitle')}
            titleId="settings-ticket-type-modal-title"
            onClose={() => {
              setShowTicketTypeModal(false)
              setEditingTicketType(null)
            }}
            submitting={ticketTypeSubmitting}
            onSubmit={handleSaveTicketType}
            primaryLabel={editingTicketType ? t('settings.ticketTypes.save') : t('settings.ticketTypes.create')}
            cancelLabel={t('settings.shipmentStatuses.cancel')}
          >
            <SettingsModalField label={t('settings.ticketTypes.name')} htmlFor="settings-tt-name">
              <input
                id="settings-tt-name"
                className="clients-input"
                required
                value={ticketTypeForm.name}
                onChange={(e) => setTicketTypeForm((p) => ({ ...p, name: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.ticketTypes.labelAr')} htmlFor="settings-tt-ar">
              <input
                id="settings-tt-ar"
                className="clients-input"
                required
                value={ticketTypeForm.label_ar}
                onChange={(e) => setTicketTypeForm((p) => ({ ...p, label_ar: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.ticketTypes.labelEn')} htmlFor="settings-tt-en">
              <input
                id="settings-tt-en"
                className="clients-input"
                required
                value={ticketTypeForm.label_en}
                onChange={(e) => setTicketTypeForm((p) => ({ ...p, label_en: e.target.value }))}
              />
            </SettingsModalField>
          </SettingsFormModal>
        ) : null}

        {deleteTicketTypeId != null ? (
          <SettingsConfirmModal
            title={t('settings.ticketTypes.deleteTitle')}
            message={t('settings.ticketTypes.deleteConfirm')}
            onClose={() => setDeleteTicketTypeId(null)}
            onConfirm={handleDeleteTicketTypeConfirm}
            submitting={ticketTypeSubmitting}
            danger
          />
        ) : null}

        {showTicketPriorityModal ? (
          <SettingsFormModal
            title={editingTicketPriority ? t('settings.ticketPriorities.editTitle') : t('settings.ticketPriorities.addTitle')}
            titleId="settings-ticket-priority-modal-title"
            onClose={() => {
              setShowTicketPriorityModal(false)
              setEditingTicketPriority(null)
            }}
            submitting={ticketPrioritySubmitting}
            onSubmit={handleSaveTicketPriority}
            primaryLabel={editingTicketPriority ? t('settings.ticketPriorities.save') : t('settings.ticketPriorities.create')}
            cancelLabel={t('settings.shipmentStatuses.cancel')}
          >
            <SettingsModalField label={t('settings.ticketPriorities.name')} htmlFor="settings-tp-name">
              <input
                id="settings-tp-name"
                className="clients-input"
                required
                value={ticketPriorityForm.name}
                onChange={(e) => setTicketPriorityForm((p) => ({ ...p, name: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.ticketPriorities.labelAr')} htmlFor="settings-tp-ar">
              <input
                id="settings-tp-ar"
                className="clients-input"
                required
                value={ticketPriorityForm.label_ar}
                onChange={(e) => setTicketPriorityForm((p) => ({ ...p, label_ar: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.ticketPriorities.labelEn')} htmlFor="settings-tp-en">
              <input
                id="settings-tp-en"
                className="clients-input"
                required
                value={ticketPriorityForm.label_en}
                onChange={(e) => setTicketPriorityForm((p) => ({ ...p, label_en: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.ticketPriorities.sortOrder')} htmlFor="settings-tp-sort">
              <input
                id="settings-tp-sort"
                type="number"
                min={0}
                className="clients-input"
                value={ticketPriorityForm.sort_order}
                onChange={(e) => setTicketPriorityForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
            </SettingsModalField>
          </SettingsFormModal>
        ) : null}

        {deleteTicketPriorityId != null ? (
          <SettingsConfirmModal
            title={t('settings.ticketPriorities.deleteTitle')}
            message={t('settings.ticketPriorities.deleteConfirm')}
            onClose={() => setDeleteTicketPriorityId(null)}
            onConfirm={handleDeleteTicketPriorityConfirm}
            submitting={ticketPrioritySubmitting}
            danger
          />
        ) : null}

        {showCommLogTypeModal ? (
          <SettingsFormModal
            title={editingCommLogType ? t('settings.communicationLogTypes.editTitle') : t('settings.communicationLogTypes.addTitle')}
            titleId="settings-comm-log-type-modal-title"
            onClose={() => {
              setShowCommLogTypeModal(false)
              setEditingCommLogType(null)
            }}
            submitting={commLogTypeSubmitting}
            onSubmit={handleSaveCommLogType}
            primaryLabel={editingCommLogType ? t('settings.communicationLogTypes.save') : t('settings.communicationLogTypes.create')}
            cancelLabel={t('settings.shipmentStatuses.cancel')}
          >
            <SettingsModalField label={t('settings.communicationLogTypes.name')} htmlFor="settings-clt-name">
              <input
                id="settings-clt-name"
                className="clients-input"
                required
                value={commLogTypeForm.name}
                onChange={(e) => setCommLogTypeForm((p) => ({ ...p, name: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.communicationLogTypes.labelAr')} htmlFor="settings-clt-ar">
              <input
                id="settings-clt-ar"
                className="clients-input"
                required
                value={commLogTypeForm.label_ar}
                onChange={(e) => setCommLogTypeForm((p) => ({ ...p, label_ar: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.communicationLogTypes.labelEn')} htmlFor="settings-clt-en">
              <input
                id="settings-clt-en"
                className="clients-input"
                required
                value={commLogTypeForm.label_en}
                onChange={(e) => setCommLogTypeForm((p) => ({ ...p, label_en: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.communicationLogTypes.sortOrder')} htmlFor="settings-clt-sort">
              <input
                id="settings-clt-sort"
                type="number"
                min={0}
                className="clients-input"
                value={commLogTypeForm.sort_order}
                onChange={(e) => setCommLogTypeForm((p) => ({ ...p, sort_order: e.target.value }))}
              />
            </SettingsModalField>
          </SettingsFormModal>
        ) : null}

        {deleteCommLogTypeId != null ? (
          <SettingsConfirmModal
            title={t('settings.communicationLogTypes.deleteTitle')}
            message={t('settings.communicationLogTypes.deleteConfirm')}
            onClose={() => setDeleteCommLogTypeId(null)}
            onConfirm={handleDeleteCommLogTypeConfirm}
            submitting={commLogTypeSubmitting}
            danger
          />
        ) : null}

        {portModal === 'create' || portModal?.mode === 'edit' ? (
          <SettingsFormModal
            title={portModal?.mode === 'edit' ? t('settings.ports.editTitle') : t('settings.ports.addTitle')}
            titleId="settings-port-modal-title"
            onClose={() => setPortModal(null)}
            submitting={portSubmitting}
            onSubmit={handleSavePort}
            primaryLabel={t('settings.ports.save')}
            cancelLabel={t('settings.ports.cancel')}
          >
            <SettingsModalField label={t('settings.ports.name')} htmlFor="settings-port-name">
              <input
                id="settings-port-name"
                className="clients-input"
                required
                value={portForm.name}
                onChange={(e) => setPortForm((p) => ({ ...p, name: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.ports.code')} htmlFor="settings-port-code">
              <input
                id="settings-port-code"
                className="clients-input"
                value={portForm.code}
                onChange={(e) => setPortForm((p) => ({ ...p, code: e.target.value }))}
              />
            </SettingsModalField>
            <SettingsModalField label={t('settings.ports.country')} htmlFor="settings-port-country">
              <input
                id="settings-port-country"
                className="clients-input"
                value={portForm.country}
                onChange={(e) => setPortForm((p) => ({ ...p, country: e.target.value }))}
              />
            </SettingsModalField>
            <div className="client-detail-modal__form-field client-detail-modal__form-field--full settings-modal-checkbox-field">
              <label htmlFor="settings-port-active" className="settings-modal-checkbox-field__label">
                {t('settings.ports.active')}
              </label>
              <input
                id="settings-port-active"
                type="checkbox"
                className="settings-checkbox"
                checked={portForm.active}
                onChange={(e) => setPortForm((p) => ({ ...p, active: e.target.checked }))}
              />
            </div>
          </SettingsFormModal>
        ) : null}

        {deletePortId != null ? (
          <SettingsConfirmModal
            title={t('settings.ports.deleteConfirmTitle')}
            message={t('settings.ports.deleteConfirm')}
            onClose={() => setDeletePortId(null)}
            onConfirm={handleDeletePortConfirm}
            submitting={deletePortSubmitting}
            danger
          />
        ) : null}
      </div>
    </Container>
  )
}
