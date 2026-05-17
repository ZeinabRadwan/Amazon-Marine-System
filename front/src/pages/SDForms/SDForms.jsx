import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate } from '../../utils/dateUtils'
import { getStoredToken } from '../Login'
import {
  listSDForms,
  getSDFormStats,
  getSDFormCharts,
  exportSDForms,
  getSDForm,
  createSDForm,
  updateSDForm,
  deleteSDForm,
  submitSDForm,
  sendSDFormToOperations,
  linkSDFormShipment,
  emailSDFormToOperations,
  getSDFormPdf,
  listSDFormBookingConfirmations,
  downloadSDFormBookingConfirmation,
  confirmSDFormBooking,
  cancelSDFormBooking,
  startSDFormBooking,
  requestSDFormInformation,
  completeSDFormInformation,
  convertSDFormToShipment,
  reopenConvertedSDForm,
} from '../../api/sdForms'
import {
  listShipmentDirections,
  listContainerTypes,
  listContainerSizes,
} from '../../api/sdFormLookups'
import { listPorts, createPort } from '../../api/ports'
import { listShippingLines, createShippingLine } from '../../api/shippingLines'
import { listClients } from '../../api/clients'
import { listUsers } from '../../api/users'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table, IconActionButton } from '../../components/Table'
import Pagination from '../../components/Pagination'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import AsyncSelect from '../../components/AsyncSelect'
import DatePicker from '../../components/DatePicker'
import { SDFormsStatsSection, SDFormsChartsSection } from './components'
import {
  FileSpreadsheet,
  Search,
  RotateCcw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  Pencil,
  Trash2,
  FileDown,
  Send,
  Mail,
  Link2,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Upload,
  PackageCheck,
  Hourglass,
  MessageSquareWarning,
} from 'lucide-react'
import '../../components/Charts/Charts.css'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'
import './SDForms.css'

const SD_FORM_STATUSES = [
  { value: '', labelKey: 'sdForms.statusAll' },
  { value: 'draft', labelKey: 'sdForms.statusDraft' },
  { value: 'submitted', labelKey: 'sdForms.statusSubmitted' },
  { value: 'sent_to_operations', labelKey: 'sdForms.statusSentToOperations' },
  { value: 'booking_in_progress', labelKey: 'sdForms.statusBookingInProgress' },
  { value: 'booking_confirmed', labelKey: 'sdForms.statusBookingConfirmed' },
  { value: 'booking_cancelled', labelKey: 'sdForms.statusBookingCancelled' },
  { value: 'information_requested', labelKey: 'sdForms.statusInformationRequested' },
  { value: 'in_progress', labelKey: 'sdForms.statusInProgress' },
  { value: 'converted_to_shipment', labelKey: 'sdForms.statusConvertedToShipment' },
  { value: 'completed', labelKey: 'sdForms.statusCompleted' },
  { value: 'cancelled', labelKey: 'sdForms.statusCancelled' },
]



function getStatusBadgeClass(status) {
  if (!status) return 'sd-forms-badge--default'
  const s = String(status).toLowerCase()
  if (s === 'draft') return 'sd-forms-badge--draft'
  if (s === 'submitted') return 'sd-forms-badge--submitted'
  if (s === 'sent_to_operations') return 'sd-forms-badge--sent'
  if (s === 'booking_in_progress') return 'sd-forms-badge--booking-in-progress'
  if (s === 'in_progress') return 'sd-forms-badge--progress'
  if (s === 'booking_confirmed') return 'sd-forms-badge--booking-confirmed'
  if (s === 'booking_cancelled') return 'sd-forms-badge--booking-cancelled'
  if (s === 'information_requested') return 'sd-forms-badge--info-requested'
  if (s === 'converted_to_shipment') return 'sd-forms-badge--converted'
  if (s === 'completed') return 'sd-forms-badge--submitted'
  if (s === 'cancelled') return 'sd-forms-badge--cancelled'
  return 'sd-forms-badge--default'
}

function emptySdForm() {
  return {
    client_id: '',
    sales_rep_id: '',
    status: 'draft',
    pol_id: '',
    pod_id: '',
    shipping_line: '',
    shipping_line_id: '',
    pol_text: '',
    pod_text: '',
    final_destination: '',
    shipment_direction: 'Export',
    shipper_info: '',
    consignee_info: '',
    notify_party_mode: '',
    notify_party_details: '',
    freight_term: '',
    container_type: '',
    container_size: '',
    num_containers: '',
    requested_vessel_date: '',
    acid_number: '',
    cargo_description: '',
    hs_code: '',
    reefer_temp: '',
    reefer_vent: '',
    reefer_hum: '',
    total_gross_weight: '',
    total_net_weight: '',
    notes: '',
  }
}

function initialCreateForm() {
  return {
    ...emptySdForm(),
    shipment_direction: 'Export',
    num_containers: '1',
  }
}

function modelToForm(m) {
  if (!m) return emptySdForm()
  return {
    client_id: m.client_id ?? '',
    sales_rep_id: m.sales_rep_id ?? '',
    status: m.status ?? 'draft',
    pol_id: String(m.pol_id || ''),
    pod_id: String(m.pod_id || ''),
    shipping_line: m.shipping_line ?? '',
    shipping_line_id: String(m.shipping_line_id || ''),
    pol_text: m.pol_text ?? '',
    pod_text: m.pod_text ?? '',
    final_destination: m.final_destination ?? '',
    shipment_direction: m.shipment_direction ?? 'Export',
    shipper_info: m.shipper_info ?? '',
    consignee_info: m.consignee_info ?? '',
    notify_party_mode: m.notify_party_mode ?? '',
    notify_party_details: m.notify_party_details ?? '',
    freight_term: m.freight_term ?? '',
    container_type: m.container_type ?? '',
    container_size: m.container_size ?? '',
    num_containers: m.num_containers != null ? String(m.num_containers) : '',
    requested_vessel_date: m.requested_vessel_date ? String(m.requested_vessel_date).slice(0, 10) : '',
    acid_number: m.acid_number ?? '',
    cargo_description: m.cargo_description ?? '',
    hs_code: m.hs_code ?? '',
    reefer_temp: m.reefer_temp ?? '',
    reefer_vent: m.reefer_vent ?? '',
    reefer_hum: m.reefer_hum ?? '',
    total_gross_weight: m.total_gross_weight != null ? String(m.total_gross_weight) : '',
    total_net_weight: m.total_net_weight != null ? String(m.total_net_weight) : '',
    notes: m.notes ?? '',
  }
}

function buildPayload(form) {
  const out = {}
  if (form.client_id !== '' && form.client_id != null) out.client_id = Number(form.client_id)
  if (form.sales_rep_id !== '' && form.sales_rep_id != null) out.sales_rep_id = Number(form.sales_rep_id)
  if (form.status) out.status = form.status
  if (form.pol_id !== '' && form.pol_id != null) out.pol_id = Number(form.pol_id)
  if (form.pod_id !== '' && form.pod_id != null) out.pod_id = Number(form.pod_id)
  out.shipping_line = String(form.shipping_line || '').trim()
  if (form.shipping_line_id !== '' && form.shipping_line_id != null) out.shipping_line_id = Number(form.shipping_line_id)
  if (form.pol_text) out.pol_text = form.pol_text
  if (form.pod_text) out.pod_text = form.pod_text
  if (form.final_destination) out.final_destination = form.final_destination
  out.shipment_direction = form.shipment_direction || 'Export'
  if (form.shipper_info) out.shipper_info = form.shipper_info
  if (form.consignee_info) out.consignee_info = form.consignee_info
  if (form.notify_party_mode) out.notify_party_mode = form.notify_party_mode
  if (form.notify_party_details) out.notify_party_details = form.notify_party_details
  if (form.freight_term) out.freight_term = form.freight_term
  if (form.container_type) out.container_type = form.container_type
  if (form.container_size) out.container_size = form.container_size
  if (form.num_containers !== '' && form.num_containers != null) out.num_containers = Number(form.num_containers)
  if (form.requested_vessel_date) out.requested_vessel_date = form.requested_vessel_date
  if (form.acid_number) out.acid_number = form.acid_number
  if (form.cargo_description) out.cargo_description = form.cargo_description
  if (form.hs_code) out.hs_code = form.hs_code
  if (form.reefer_temp) out.reefer_temp = form.reefer_temp
  if (form.reefer_vent) out.reefer_vent = form.reefer_vent
  if (form.reefer_hum) out.reefer_hum = form.reefer_hum
  if (form.total_gross_weight !== '' && form.total_gross_weight != null) out.total_gross_weight = Number(form.total_gross_weight)
  if (form.total_net_weight !== '' && form.total_net_weight != null) out.total_net_weight = Number(form.total_net_weight)
  if (form.notes) out.notes = form.notes
  return out
}

function normalizeListResponse(data) {
  const raw = data?.data ?? data
  return Array.isArray(raw) ? raw : []
}

const CREATE_DRAFT_LS_KEY = 'sd-forms.create-draft.v1'

function isMeaningfulDraft(form) {
  if (!form || typeof form !== 'object') return false
  for (const [key, value] of Object.entries(form)) {
    if (key === 'status') continue
    if (key === 'shipment_direction' && value === 'Export') continue
    if (key === 'num_containers' && (value === '1' || value === 1)) continue
    if (value !== '' && value != null) return true
  }
  return false
}

function loadLocalCreateDraft() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CREATE_DRAFT_LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function saveLocalCreateDraft(form) {
  if (typeof window === 'undefined') return
  try {
    if (!isMeaningfulDraft(form)) {
      window.localStorage.removeItem(CREATE_DRAFT_LS_KEY)
      return
    }
    window.localStorage.setItem(CREATE_DRAFT_LS_KEY, JSON.stringify(form))
  } catch {
    /* ignore quota/serialization errors */
  }
}

function clearLocalCreateDraft() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CREATE_DRAFT_LS_KEY)
  } catch {
    /* ignore */
  }
}

export default function SDForms() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const { isOperations, isAdminRole, isAccountant, roleId, user: authUser } = useAuthAccess()
  const isSales = roleId === 3 // SALES
  const isSalesManager = roleId === 2 // SALES_MANAGER
  const isAnySales = isSales || isSalesManager

  const canManageSdForms = isAdminRole || isAnySales   // create / edit / delete SD forms
  const canSubmit        = isAdminRole || isAnySales   // "Submit" draft button
  const canSendOps       = isAdminRole || isAnySales   // "Send to Ops" + "Email Ops"
  const canLinkShipment  = isAdminRole || isOperations || isAnySales
  const canEdit          = isAdminRole || isAnySales || isOperations
  const canDelete        = isAdminRole || isAnySales
  const canCreate        = isAdminRole || isAnySales

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    // Show every SD form the user is allowed to see by default. Operations users
    // already have a permanent backend gate (sent_to_operations_at IS NOT NULL),
    // so the form stays visible through booking confirmation, cancellation, etc.
    status: '',
    client_id: '',
    sales_rep_id: '',
    shipping_line_id: '',
    sort: 'date',
    direction: 'desc',
    page: 1,
    per_page: 15,
  })
  const [pagination, setPagination] = useState({ total: 0, last_page: 1, current_page: 1 })
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [charts, setCharts] = useState(null)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [showSort, setShowSort] = useState(false)

  const [refsLoading, setRefsLoading] = useState(true)
  const [shipmentDirections, setShipmentDirections] = useState([])
  const [containerTypesList, setContainerTypesList] = useState([])
  const [containerSizesList, setContainerSizesList] = useState([])
  const [portsList, setPortsList] = useState([])
  const [shippingLinesList, setShippingLinesList] = useState([])
  const [clientsList, setClientsList] = useState([])
  const [usersList, setUsersList] = useState([])

  const [selectedIds, setSelectedIds] = useState({})

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(() => initialCreateForm())
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(initialCreateForm)
  const [editRecord, setEditRecord] = useState(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [detailId, setDetailId] = useState(null)
  const [detailRecord, setDetailRecord] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailBookingFiles, setDetailBookingFiles] = useState([])
  const [detailBookingLoading, setDetailBookingLoading] = useState(false)

  const [deleteId, setDeleteId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)


  const [linkOpen, setLinkOpen] = useState(false)
  const [linkFormId, setLinkFormId] = useState(null)
  const [linkShipmentId, setLinkShipmentId] = useState('')
  const [linkSubmitting, setLinkSubmitting] = useState(false)

  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitFormId, setSubmitFormId] = useState(null)
  const [submitAcid, setSubmitAcid] = useState('')
  const [submitDirection, setSubmitDirection] = useState('Export')
  const [submitSubmitting, setSubmitSubmitting] = useState(false)
  const [emailOpsSendingId, setEmailOpsSendingId] = useState(null)

  // Booking action (operations: Start / Confirm / Cancel / Request information).
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingRecord, setBookingRecord] = useState(null)
  const [bookingAction, setBookingAction] = useState(null) // null | 'start' | 'confirm' | 'cancel' | 'requestInfo'
  const [bookingFile, setBookingFile] = useState(null)
  const [bookingReason, setBookingReason] = useState('')
  const [bookingInfoNote, setBookingInfoNote] = useState('')
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState(null)

  const canBookingDecide = isAdminRole || isOperations
  const canCompleteInformation = isAnySales

  // Sales: mark data completion and return SD to operations (booking required).
  const [infoCompleteOpen, setInfoCompleteOpen] = useState(false)
  const [infoCompleteRecord, setInfoCompleteRecord] = useState(null)
  const [infoCompleteSubmitting, setInfoCompleteSubmitting] = useState(false)
  const [infoCompleteError, setInfoCompleteError] = useState(null)

  // Convert to Shipment (admin / sales rep) + Reopen (admin only).
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertRecord, setConvertRecord] = useState(null)
  const [convertMode, setConvertMode] = useState('convert') // 'convert' | 'reopen'
  const [convertSubmitting, setConvertSubmitting] = useState(false)
  const [convertError, setConvertError] = useState(null)

  const canConvertToShipment = isAdminRole || isAnySales
  const canReopenConverted = isAdminRole

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listSDForms(token, {
      search: filters.search || undefined,
      status: filters.status || undefined,
      client_id: filters.client_id || undefined,
      sales_rep_id: filters.sales_rep_id || undefined,
      shipping_line_id: filters.shipping_line_id || undefined,
      sort: filters.sort,
      direction: filters.direction,
      page: filters.page,
      per_page: filters.per_page,
    })
      .then((data) => {
        const arr = data.data ?? []
        setList(Array.isArray(arr) ? arr : [])
        const meta = data.meta ?? {}
        setPagination({
          total: meta.total ?? 0,
          last_page: meta.last_page ?? 1,
          current_page: meta.current_page ?? 1,
        })
      })
      .catch(() => setAlert({ type: 'error', message: t('sdForms.errorLoad') }))
      .finally(() => setLoading(false))
  }, [token, filters.search, filters.status, filters.client_id, filters.sales_rep_id, filters.sort, filters.direction, filters.page, filters.per_page, t])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    setSelectedIds({})
  }, [filters.page])

  useEffect(() => {
    if (!showCreate) return
    const handle = setTimeout(() => saveLocalCreateDraft(createForm), 400)
    return () => clearTimeout(handle)
  }, [createForm, showCreate])

  useEffect(() => {
    if (!token) return
    setStatsLoading(true)
    getSDFormStats(token)
      .then((data) => setStats(data.data ?? data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    setChartsLoading(true)
    getSDFormCharts(token, { months: 6 })
      .then((data) => setCharts(data.data ?? data))
      .catch(() => setCharts(null))
      .finally(() => setChartsLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    setRefsLoading(true)
    Promise.all([
      listShipmentDirections(token).catch(() => ({ data: [] })),
      listContainerTypes(token).catch(() => ({ data: [] })),
      listContainerSizes(token).catch(() => ({ data: [] })),
      listPorts(token).catch(() => ({ data: [] })),
      listShippingLines(token, { service_scope: 'ocean' }).catch(() => ({ data: [] })),
      listClients(token, { per_page: 100, page: 1 }).catch(() => ({ data: [] })),
      listUsers(token, { per_page: 200 }).catch(() => ({ data: [] })),
    ])
      .then(([dirs, ct, cs, ports, shippingLines, clients, users]) => {
        setShipmentDirections(normalizeListResponse(dirs))
        setContainerTypesList(normalizeListResponse(ct))
        setContainerSizesList(normalizeListResponse(cs))
        setPortsList(normalizeListResponse(ports))
        setShippingLinesList(normalizeListResponse(shippingLines))
        setClientsList(normalizeListResponse(clients))
        setUsersList(normalizeListResponse(users))
      })
      .finally(() => setRefsLoading(false))
  }, [token])

  const handleExport = useCallback(() => {
    if (!token) return
    setAlert(null)
    setExportLoading(true)
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id])
    const params = ids.length > 0 ? { ids: ids.join(',') } : {}
    exportSDForms(token, params)
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const day = new Date().toISOString().slice(0, 10)
        a.download = ids.length > 0 ? `sd-forms-selected-${day}.csv` : `sd-forms-export-${day}.csv`
        a.click()
        URL.revokeObjectURL(url)
        setAlert({
          type: 'success',
          message: ids.length > 0 ? t('sdForms.exportSelectedSuccess') : t('sdForms.exportSuccess'),
        })
      })
      .catch((err) => setAlert({ type: 'error', message: err.message || t('sdForms.exportError') }))
      .finally(() => setExportLoading(false))
  }, [token, selectedIds, t])

  const pageRowIds = useMemo(() => list.map((r) => String(r.id)), [list])
  const allPageSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selectedIds[id])

  const toggleSelectAllPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = { ...prev }
      if (allPageSelected) {
        pageRowIds.forEach((id) => {
          delete next[id]
        })
      } else {
        pageRowIds.forEach((id) => {
          next[id] = true
        })
      }
      return next
    })
  }, [allPageSelected, pageRowIds])

  const toggleSelectRow = useCallback((id) => {
    const sid = String(id)
    setSelectedIds((prev) => {
      const next = { ...prev }
      if (next[sid]) delete next[sid]
      else next[sid] = true
      return next
    })
  }, [])

  const loadShippingLineOptions = async (q) => {
    if (!token) return []
    try {
      const res = await listShippingLines(token, { q, active: true, service_scope: 'ocean' })
      const data = normalizeListResponse(res)
      return data.map((l) => ({
        value: l.id,
        label: l.name || `#${l.id}`,
      }))
    } catch (error) {
      console.error('loadShippingLineOptions error:', error)
      return []
    }
  }

  const handleCreateShippingLine = async (name) => {
    if (!token) return null
    try {
      const res = await createShippingLine(token, { name, active: true, service_scope: 'ocean' })
      const newLine = res.data ?? res
      const updatedLines = await listShippingLines(token, { service_scope: 'ocean' })
      setShippingLinesList(normalizeListResponse(updatedLines))
      return {
        value: newLine.id,
        label: newLine.name || `#${newLine.id}`,
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to create shipping line' })
      return null
    }
  }

  const getShippingLineOption = (id, nameFallback) => {
    if (!id) {
      if (nameFallback) return { value: '', label: nameFallback }
      return null
    }
    const l = shippingLinesList.find((x) => String(x.id) === String(id))
    if (!l) {
      if (nameFallback) return { value: id, label: nameFallback }
      return { value: id, label: `#${id}` }
    }
    return { value: l.id, label: l.name || `#${l.id}` }
  }

  const loadPortOptions = async (q) => {
    if (!token) return []
    try {
      const res = await listPorts(token, { q, active: true })
      const data = normalizeListResponse(res)
      return data.map((p) => ({
        value: p.id,
        label: p.name || p.code || `#${p.id}`,
      }))
    } catch (error) {
      console.error('loadPortOptions error:', error)
      return []
    }
  }

  const handleCreatePort = async (name) => {
    if (!token) return null
    try {
      const res = await createPort(token, { name, active: true })
      const newPort = res.data ?? res
      const updatedPorts = await listPorts(token)
      setPortsList(normalizeListResponse(updatedPorts))
      return {
        value: newPort.id,
        label: newPort.name || newPort.code || `#${newPort.id}`,
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to create port' })
      return null
    }
  }

  const getPortOption = (id) => {
    if (!id) return null
    const p = portsList.find((x) => String(x.id) === String(id))
    if (!p) return { value: id, label: `#${id}` }
    return { value: p.id, label: p.name || p.code || `#${p.id}` }
  }

  const selectedCount = useMemo(
    () => Object.keys(selectedIds).filter((k) => selectedIds[k]).length,
    [selectedIds],
  )

  const openDetail = useCallback((id) => {
    setDetailId(id)
    setDetailRecord(null)
    setDetailLoading(true)
    setAlert(null)
    getSDForm(token, id)
      .then((d) => setDetailRecord(d.data ?? d))
      .catch((err) => setAlert({ type: 'error', message: err.message || t('sdForms.errorDetail') }))
      .finally(() => setDetailLoading(false))
  }, [token, t])

  const openEdit = useCallback((id) => {
    setDetailId(null)
    setEditId(id)
    setEditRecord(null)
    setEditForm(initialCreateForm())
    setEditLoading(true)
    setAlert(null)
    getSDForm(token, id)
      .then((d) => {
        const m = d.data ?? d
        setEditRecord(m)
        setEditForm(modelToForm(m))
      })
      .catch((err) => setAlert({ type: 'error', message: err.message || t('sdForms.errorDetail') }))
      .finally(() => setEditLoading(false))
  }, [token, t])

  const closeEdit = useCallback(() => {
    setEditId(null)
    setEditRecord(null)
    setEditForm(initialCreateForm())
  }, [])

  const downloadPdf = useCallback(async (id) => {
    if (!token) return
    setAlert(null)
    try {
      const blob = await getSDFormPdf(token, id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sd-form-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      setAlert({ type: 'success', message: t('sdForms.pdfSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('sdForms.pdfError') })
    }
  }, [token, t])

  const openCreate = useCallback(() => {
    const stored = loadLocalCreateDraft()
    const salesRepId = authUser?.id != null ? String(authUser.id) : ''
    if (stored) {
      setCreateForm({ ...initialCreateForm(), ...stored, sales_rep_id: salesRepId })
      setDraftRestored(true)
    } else {
      setCreateForm({ ...initialCreateForm(), sales_rep_id: salesRepId })
      setDraftRestored(false)
    }
    setShowCreate(true)
  }, [authUser?.id])

  const closeCreate = useCallback(() => {
    setShowCreate(false)
  }, [])

  const discardLocalDraft = useCallback(() => {
    clearLocalCreateDraft()
    setCreateForm(initialCreateForm())
    setDraftRestored(false)
  }, [])

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    await createDraftAndMaybeDownload(false)
  }

  const finalizeCreateSuccess = (successMessage) => {
    clearLocalCreateDraft()
    setDraftRestored(false)
    setShowCreate(false)
    setCreateForm(initialCreateForm())
    loadList()
    setAlert({ type: 'success', message: successMessage })
  }

  const createDraftAndMaybeDownload = async (downloadAfterCreate = false) => {
    if (!token) return null
    if (!String(createForm.shipment_direction || '').trim()) {
      setAlert({ type: 'error', message: 'Shipment direction is required.' })
      return null
    }
    if (!String(createForm.shipping_line_id || '').trim() && !String(createForm.shipping_line || '').trim()) {
      setAlert({ type: 'error', message: t('sdForms.errorShippingLineRequired') })
      return null
    }
    const payload = buildPayload(createForm)
    if (payload.shipment_direction === 'Import' && !payload.acid_number) {
      setAlert({ type: 'error', message: 'ACID number is required for import shipments.' })
      return null
    }
    setCreateSubmitting(true)
    setAlert(null)
    try {
      const created = await createSDForm(token, payload)
      const createdId = created?.id ?? created?.data?.id ?? null
      if (downloadAfterCreate && createdId) {
        await downloadPdf(createdId)
      }
      finalizeCreateSuccess(t('sdForms.createSuccess'))
      return createdId
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('sdForms.errorCreate') })
      return null
    } finally {
      setCreateSubmitting(false)
    }
  }

  const saveDraft = async () => {
    if (!token) return null
    if (!String(createForm.shipment_direction || '').trim()) {
      setAlert({ type: 'error', message: 'Shipment direction is required.' })
      return null
    }
    const payload = buildPayload(createForm)
    payload.status = 'draft'
    if (payload.shipment_direction === 'Import' && !payload.acid_number) {
      setAlert({ type: 'error', message: 'ACID number is required for import shipments.' })
      return null
    }
    setCreateSubmitting(true)
    setAlert(null)
    try {
      const created = await createSDForm(token, payload)
      const createdId = created?.id ?? created?.data?.id ?? null
      finalizeCreateSuccess(t('sdForms.draftSavedSuccess', 'Draft saved.'))
      return createdId
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('sdForms.errorCreate') })
      return null
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!token || !editId) return
    if (!String(editForm.shipment_direction || '').trim()) {
      setAlert({ type: 'error', message: 'Shipment direction is required.' })
      return
    }
    if (!String(editForm.shipping_line_id || '').trim() && !String(editForm.shipping_line || '').trim()) {
      setAlert({ type: 'error', message: t('sdForms.errorShippingLineRequired') })
      return
    }
    const payload = buildPayload(editForm)
    if (payload.shipment_direction === 'Import' && !payload.acid_number) {
      setAlert({ type: 'error', message: 'ACID number is required for import shipments.' })
      return
    }
    const savedEditId = editId
    setEditSubmitting(true)
    setAlert(null)
    try {
      await updateSDForm(token, savedEditId, payload)
      closeEdit()
      loadList()
      if (detailId === savedEditId) openDetail(savedEditId)
      setAlert({ type: 'success', message: t('sdForms.updateSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('sdForms.errorUpdate') })
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!token || !deleteId) return
    setDeleteSubmitting(true)
    setAlert(null)
    try {
      await deleteSDForm(token, deleteId)
      setDeleteId(null)
      setDetailId(null)
      setDetailRecord(null)
      loadList()
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(deleteId)
        return next
      })
      setAlert({ type: 'success', message: t('sdForms.deleteSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('sdForms.errorDelete') })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const openSubmitModal = (id, record) => {
    setSubmitFormId(id)
    setSubmitDirection(record?.shipment_direction || 'Export')
    setSubmitAcid(record?.acid_number || '')
    setSubmitOpen(true)
  }

  const handleSubmitSd = async (e) => {
    e.preventDefault()
    if (!token || !submitFormId) return
    if (submitDirection === 'Import' && !submitAcid.trim()) {
      setAlert({ type: 'error', message: t('sdForms.errorAcidRequired') })
      return
    }
    setSubmitSubmitting(true)
    setAlert(null)
    try {
      await submitSDForm(token, submitFormId, {
        shipment_direction: submitDirection,
        acid_number: submitAcid.trim() || undefined,
      })
      setSubmitOpen(false)
      loadList()
      if (detailId === submitFormId) openDetail(submitFormId)
      setAlert({ type: 'success', message: t('sdForms.submitSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('sdForms.errorSubmit') })
    } finally {
      setSubmitSubmitting(false)
    }
  }

  const runSendOps = async (id) => {
    if (!token) return
    setAlert(null)
    try {
      await sendSDFormToOperations(token, id)
      loadList()
      if (detailId === id) openDetail(id)
      setAlert({ type: 'success', message: t('sdForms.sendOpsSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('sdForms.errorSendOps') })
    }
  }

  const openBookingModal = (record) => {
    setBookingRecord(record)
    setBookingAction(null)
    setBookingFile(null)
    setBookingReason('')
    setBookingInfoNote('')
    setBookingError(null)
    setBookingOpen(true)
  }

  const closeBookingModal = () => {
    if (bookingSubmitting) return
    setBookingOpen(false)
    setBookingRecord(null)
    setBookingAction(null)
    setBookingFile(null)
    setBookingReason('')
    setBookingInfoNote('')
    setBookingError(null)
  }

  const resetBookingActionState = () => {
    setBookingFile(null)
    setBookingReason('')
    setBookingInfoNote('')
    setBookingError(null)
  }

  const finalizeBookingSuccess = (successMessage) => {
    if (bookingRecord && detailId === bookingRecord.id) openDetail(bookingRecord.id)
    loadList()
    setAlert({ type: 'success', message: successMessage })
    setBookingOpen(false)
    setBookingRecord(null)
    setBookingAction(null)
    setBookingFile(null)
    setBookingReason('')
    setBookingInfoNote('')
  }

  const openInfoCompleteModal = (record) => {
    setInfoCompleteRecord(record)
    setInfoCompleteError(null)
    setInfoCompleteOpen(true)
  }

  const closeInfoCompleteModal = () => {
    if (infoCompleteSubmitting) return
    setInfoCompleteOpen(false)
    setInfoCompleteRecord(null)
    setInfoCompleteError(null)
  }

  const runCompleteInformation = async () => {
    if (!token || !infoCompleteRecord) return
    setInfoCompleteSubmitting(true)
    setInfoCompleteError(null)
    try {
      await completeSDFormInformation(token, infoCompleteRecord.id)
      if (detailId === infoCompleteRecord.id) openDetail(infoCompleteRecord.id)
      loadList()
      setAlert({ type: 'success', message: t('sdForms.infoRequest.completeSuccess') })
      setInfoCompleteOpen(false)
      setInfoCompleteRecord(null)
      setInfoCompleteError(null)
    } catch (err) {
      setInfoCompleteError(err.message || t('sdForms.infoRequest.errorComplete'))
    } finally {
      setInfoCompleteSubmitting(false)
    }
  }

  const runStartBooking = async () => {
    if (!token || !bookingRecord) return
    setBookingSubmitting(true)
    setBookingError(null)
    try {
      await startSDFormBooking(token, bookingRecord.id)
      finalizeBookingSuccess(t('sdForms.booking.startSuccess', 'Marked as Booking in progress.'))
    } catch (err) {
      setBookingError(err.message || t('sdForms.booking.errorStart', 'Failed to update SD form.'))
    } finally {
      setBookingSubmitting(false)
    }
  }

  const runRequestInformation = async () => {
    if (!token || !bookingRecord) return
    const note = String(bookingInfoNote || '').trim()
    if (note.length < 3) {
      setBookingError(t('sdForms.booking.errorNoteRequired', 'Please describe what information is missing (at least 3 characters).'))
      return
    }
    setBookingSubmitting(true)
    setBookingError(null)
    try {
      await requestSDFormInformation(token, bookingRecord.id, note)
      finalizeBookingSuccess(t('sdForms.booking.requestInfoSuccess', 'Information request sent.'))
    } catch (err) {
      setBookingError(err.message || t('sdForms.booking.errorRequestInfo', 'Failed to send information request.'))
    } finally {
      setBookingSubmitting(false)
    }
  }

  const runConfirmBooking = async () => {
    if (!token || !bookingRecord) return
    if (!bookingFile) {
      setBookingError(t('sdForms.booking.errorFileRequired', 'Please select a confirmation document.'))
      return
    }
    setBookingSubmitting(true)
    setBookingError(null)
    try {
      await confirmSDFormBooking(token, bookingRecord.id, bookingFile)
      finalizeBookingSuccess(t('sdForms.booking.confirmSuccess', 'Booking confirmed.'))
    } catch (err) {
      setBookingError(err.message || t('sdForms.booking.errorConfirm', 'Failed to confirm booking.'))
    } finally {
      setBookingSubmitting(false)
    }
  }

  const runCancelBooking = async () => {
    if (!token || !bookingRecord) return
    const reason = String(bookingReason || '').trim()
    if (reason.length < 3) {
      setBookingError(t('sdForms.booking.errorReasonRequired', 'Please provide a cancellation reason (at least 3 characters).'))
      return
    }
    setBookingSubmitting(true)
    setBookingError(null)
    try {
      await cancelSDFormBooking(token, bookingRecord.id, reason)
      finalizeBookingSuccess(t('sdForms.booking.cancelSuccess', 'Booking cancelled.'))
    } catch (err) {
      setBookingError(err.message || t('sdForms.booking.errorCancel', 'Failed to cancel booking.'))
    } finally {
      setBookingSubmitting(false)
    }
  }

  const openConvertModal = (record, mode = 'convert') => {
    setConvertRecord(record)
    setConvertMode(mode)
    setConvertError(null)
    setConvertOpen(true)
  }

  const closeConvertModal = () => {
    if (convertSubmitting) return
    setConvertOpen(false)
    setConvertRecord(null)
    setConvertError(null)
  }

  const runConvertToShipment = async () => {
    if (!token || !convertRecord) return
    setConvertSubmitting(true)
    setConvertError(null)
    try {
      await convertSDFormToShipment(token, convertRecord.id)
      loadList()
      if (detailId === convertRecord.id) openDetail(convertRecord.id)
      setAlert({ type: 'success', message: t('sdForms.convert.successConvert', 'SD form converted to shipment.') })
      setConvertOpen(false)
      setConvertRecord(null)
    } catch (err) {
      setConvertError(err.message || t('sdForms.convert.errorConvert', 'Failed to convert SD form.'))
    } finally {
      setConvertSubmitting(false)
    }
  }

  const runReopenConverted = async () => {
    if (!token || !convertRecord) return
    setConvertSubmitting(true)
    setConvertError(null)
    try {
      await reopenConvertedSDForm(token, convertRecord.id)
      loadList()
      if (detailId === convertRecord.id) openDetail(convertRecord.id)
      setAlert({ type: 'success', message: t('sdForms.convert.successReopen', 'SD form reopened.') })
      setConvertOpen(false)
      setConvertRecord(null)
    } catch (err) {
      setConvertError(err.message || t('sdForms.convert.errorReopen', 'Failed to reopen SD form.'))
    } finally {
      setConvertSubmitting(false)
    }
  }

  const runEmailOps = async (id) => {
    if (!token) return
    setAlert(null)
    setEmailOpsSendingId(id)
    try {
      await emailSDFormToOperations(token, id)
      loadList()
      if (detailId === id) openDetail(id)
      setAlert({ type: 'success', message: t('sdForms.emailOpsSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('sdForms.errorEmailOps') })
    } finally {
      setEmailOpsSendingId(null)
    }
  }

  const openLinkModal = (id) => {
    setLinkFormId(id)
    setLinkShipmentId('')
    setLinkOpen(true)
  }

  const handleLinkSubmit = async (e) => {
    e.preventDefault()
    if (!token || !linkFormId || !linkShipmentId.trim()) return
    setLinkSubmitting(true)
    setAlert(null)
    try {
      await linkSDFormShipment(token, linkFormId, { shipment_id: Number(linkShipmentId) })
      setLinkOpen(false)
      loadList()
      if (detailId === linkFormId) openDetail(linkFormId)
      setAlert({ type: 'success', message: t('sdForms.linkSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('sdForms.errorLink') })
    } finally {
      setLinkSubmitting(false)
    }
  }

  const shipmentDirOptions = useMemo(
    () => shipmentDirections.map((d) => ({ value: d.name, label: d.name })),
    [shipmentDirections],
  )

  const resolveSalesRepDisplayName = useCallback(
    (salesRepId) => {
      const id =
        salesRepId != null && String(salesRepId).trim() !== ''
          ? Number(salesRepId)
          : authUser?.id != null
            ? Number(authUser.id)
            : null
      if (id == null || Number.isNaN(id)) return '—'
      const fromList = usersList.find((u) => Number(u.id) === id)
      if (fromList) return fromList.name ?? fromList.email ?? `User #${fromList.id}`
      if (authUser && Number(authUser.id) === id) {
        return authUser.name ?? authUser.email ?? '—'
      }
      return '—'
    },
    [authUser, usersList]
  )

  const renderSdFormFields = (form, setForm, options = {}) => {
    const { disabled = false, sdNumber = null } = options
    const showAcid = form.shipment_direction === 'Import'
    const showNotifyDetails = form.notify_party_mode === 'different'
    const showReefer = /reefer/i.test(String(form.container_type || '').trim())
    const salesRepDisplay = resolveSalesRepDisplayName(form.sales_rep_id)
    const sdNumberDisplay = sdNumber || '—'
    const notesHelpText =
      'استخدم هذا الحقل لكتابة أي ملاحظات خاصة بالحجز يجب أن يكون فريق الحجز على علم بها، مثل الشحنات الترانزيت أو أي استثناءات أو تعليمات خاصة بالشحنة'

    return (
      <div className="clients-form-sections sd-create-form" lang="en">
        <section className="client-detail-modal__section sd-form-section-client-sales">
          <h3 className="client-detail-modal__section-title">
            {t('sdForms.declaration.sections.clientSalesRep', {
              lng: 'en',
              defaultValue: 'Client & Sales Representative',
            })}
          </h3>
          <div className="sd-form-client-sales-row">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-client">
                {t('sdForms.form.clientName', { lng: 'en', defaultValue: 'Client Name' })}
              </label>
              <select
                id="sd-c-client"
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                disabled={disabled}
              >
                <option value="">{t('sdForms.form.selectClient', { lng: 'en', defaultValue: 'Select client…' })}</option>
                {clientsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? c.client_name ?? `#${c.id}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-rep-display">
                {t('sdForms.form.salesRep', { lng: 'en', defaultValue: 'Sales Representative' })}
              </label>
              <input
                id="sd-c-rep-display"
                type="text"
                className="sd-form-readonly-input"
                value={salesRepDisplay}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-sd-number">
                {t('sdForms.form.sdNumber', { lng: 'en', defaultValue: 'SD Number' })}
              </label>
              <input
                id="sd-c-sd-number"
                type="text"
                className="sd-form-readonly-input"
                value={sdNumberDisplay}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
              />
              {!sdNumber ? (
                <p className="sd-form-modal-preview__hint">
                  {t('sdForms.form.sdNumberAuto', { lng: 'en', defaultValue: 'Auto-generated on save' })}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="client-detail-modal__section sd-form-section-basic">
          <h3 className="client-detail-modal__section-title">
            {t('sdForms.declaration.sections.basic', { lng: 'en', defaultValue: 'Shipment Basic Information' })}
          </h3>
          <div className="sd-form-basic-row sd-form-basic-row--4">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-pol">
                {t('sdForms.form.pol', { lng: 'en', defaultValue: 'Port of Loading (POL)' })}
              </label>
              <AsyncSelect
                id="sd-c-pol"
                value={getPortOption(form.pol_id)}
                onChange={(opt) => setForm((f) => ({ ...f, pol_id: opt?.value || '' }))}
                loadOptions={loadPortOptions}
                onCreate={handleCreatePort}
                placeholder="Select or create port"
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-pod">
                {t('sdForms.form.pod', { lng: 'en', defaultValue: 'Port of Discharge (POD)' })}
              </label>
              <AsyncSelect
                id="sd-c-pod"
                value={getPortOption(form.pod_id)}
                onChange={(opt) => setForm((f) => ({ ...f, pod_id: opt?.value || '' }))}
                loadOptions={loadPortOptions}
                onCreate={handleCreatePort}
                placeholder="Select or create port"
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-fdest">
                {t('sdForms.form.finalDestination', { lng: 'en', defaultValue: 'Final Destination' })}
              </label>
              <input
                id="sd-c-fdest"
                type="text"
                placeholder={t('sdForms.declaration.finalDestinationPlaceholder', {
                  lng: 'en',
                  defaultValue: 'Final destination if different from POD',
                })}
                value={form.final_destination}
                onChange={(e) => setForm((f) => ({ ...f, final_destination: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-dir">
                {t('sdForms.form.shipmentDirection', { lng: 'en', defaultValue: 'Shipment Direction' })}
              </label>
              <select
                id="sd-c-dir"
                required
                value={form.shipment_direction}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    shipment_direction: e.target.value,
                    ...(e.target.value !== 'Import' ? { acid_number: '' } : {}),
                  }))
                }
                disabled={disabled}
              >
                <option value="Export">{t('sdForms.declaration.exportDirection', { lng: 'en', defaultValue: 'Export' })}</option>
                <option value="Import">{t('sdForms.declaration.importDirection', { lng: 'en', defaultValue: 'Import' })}</option>
              </select>
            </div>
          </div>
          <div className="sd-form-basic-row sd-form-basic-row--3">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-sline">
                {t('sdForms.form.shippingLine', { lng: 'en', defaultValue: 'Shipping Line' })}
                {' '}
                <span className="sd-form-required-mark" aria-hidden="true">*</span>
              </label>
              <AsyncSelect
                id="sd-c-sline"
                value={getShippingLineOption(form.shipping_line_id, form.shipping_line)}
                onChange={(opt) =>
                  setForm((f) => ({
                    ...f,
                    shipping_line_id: opt?.value || '',
                    shipping_line: opt?.label || '',
                  }))
                }
                loadOptions={loadShippingLineOptions}
                onCreate={handleCreateShippingLine}
                placeholder={t('sdForms.declaration.selectOrAddShippingLine', {
                  lng: 'en',
                  defaultValue: 'Select or create shipping line',
                })}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-rvd">
                {t('sdForms.form.requestedVesselDate', { lng: 'en', defaultValue: 'Requested Vessel Date' })}
              </label>
              <DatePicker
                id="sd-c-rvd"
                locale={i18n.language}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                value={form.requested_vessel_date}
                onChange={(value) => setForm((f) => ({ ...f, requested_vessel_date: value }))}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-ft">
                {t('sdForms.form.freightTerm', { lng: 'en', defaultValue: 'Freight Term' })}
              </label>
              <select
                id="sd-c-ft"
                value={form.freight_term}
                onChange={(e) => setForm((f) => ({ ...f, freight_term: e.target.value }))}
                disabled={disabled}
              >
                <option value="">{t('sdForms.form.freightUnset', { lng: 'en', defaultValue: 'Select' })}</option>
                <option value="Prepaid">{t('sdForms.declaration.prepaid', { lng: 'en', defaultValue: 'Prepaid' })}</option>
                <option value="Collect">{t('sdForms.declaration.collect', { lng: 'en', defaultValue: 'Collect' })}</option>
              </select>
            </div>
          </div>
        </section>

        <section className="client-detail-modal__section sd-form-section-parties">
          <h3 className="client-detail-modal__section-title">
            {t('sdForms.declaration.sections.parties', { lng: 'en', defaultValue: 'Party Information' })}
          </h3>
          <div className="sd-form-parties-row">
            <div className="client-detail-modal__form-field sd-form-parties-col sd-form-parties-col--shipper">
              <label htmlFor="sd-c-shipper">
                {t('sdForms.form.shipper', { lng: 'en', defaultValue: 'Shipper Information' })}
              </label>
              <textarea
                id="sd-c-shipper"
                placeholder={t('sdForms.declaration.shipperPlaceholder', {
                  lng: 'en',
                  defaultValue: 'Name, address, contact…',
                })}
                value={form.shipper_info}
                onChange={(e) => setForm((f) => ({ ...f, shipper_info: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field sd-form-parties-col sd-form-parties-col--consignee">
              <label htmlFor="sd-c-consignee">
                {t('sdForms.form.consignee', { lng: 'en', defaultValue: 'Consignee Information' })}
              </label>
              <textarea
                id="sd-c-consignee"
                placeholder={t('sdForms.declaration.consigneePlaceholder', {
                  lng: 'en',
                  defaultValue: 'Name, address, contact…',
                })}
                value={form.consignee_info}
                onChange={(e) => setForm((f) => ({ ...f, consignee_info: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field sd-form-parties-col sd-form-parties-col--notify">
              <label htmlFor="sd-c-npm">
                {t('sdForms.form.notifyPartyMode', { lng: 'en', defaultValue: 'Notify Party' })}
              </label>
              <select
                id="sd-c-npm"
                value={form.notify_party_mode}
                onChange={(e) => setForm((f) => ({ ...f, notify_party_mode: e.target.value }))}
                disabled={disabled}
              >
                <option value="">{t('sdForms.declaration.directionPlaceholder', { lng: 'en', defaultValue: 'Select' })}</option>
                <option value="same">
                  {t('sdForms.declaration.notifySameAsConsignee', { lng: 'en', defaultValue: 'Same as Consignee' })}
                </option>
                <option value="different">{t('sdForms.form.notifyDifferent', { lng: 'en', defaultValue: 'Different' })}</option>
              </select>
            </div>
          </div>
          {showNotifyDetails ? (
            <div className="sd-form-parties-notify-details">
              <div className="client-detail-modal__form-field">
                <label htmlFor="sd-c-npd">
                  {t('sdForms.form.notifyPartyDetails', { lng: 'en', defaultValue: 'Notify party details' })}
                </label>
                <textarea
                  id="sd-c-npd"
                  placeholder={t('sdForms.declaration.notifyDetailsPlaceholder', {
                    lng: 'en',
                    defaultValue: 'Notify party name and details',
                  })}
                  value={form.notify_party_details}
                  onChange={(e) => setForm((f) => ({ ...f, notify_party_details: e.target.value }))}
                  disabled={disabled}
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="client-detail-modal__section sd-form-section-container">
          <h3 className="client-detail-modal__section-title">
            {t('sdForms.declaration.sections.container', { lng: 'en', defaultValue: 'Container Details' })}
          </h3>
          <div className="sd-form-container-row">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-ctype">
                {t('sdForms.form.containerType', { lng: 'en', defaultValue: 'Container Type' })}
              </label>
              <select
                id="sd-c-ctype"
                value={form.container_type}
                onChange={(e) => {
                  const nextType = e.target.value
                  setForm((f) => ({
                    ...f,
                    container_type: nextType,
                    ...(!/reefer/i.test(String(nextType || '').trim())
                      ? { reefer_temp: '', reefer_vent: '', reefer_hum: '' }
                      : {}),
                  }))
                }}
                disabled={disabled}
              >
                <option value="">Select</option>
                {containerTypesList.map((ct) => (
                  <option key={ct.id} value={ct.name}>
                    {ct.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-csize">
                {t('sdForms.form.containerSize', { lng: 'en', defaultValue: 'Container Size' })}
              </label>
              <select
                id="sd-c-csize"
                value={form.container_size}
                onChange={(e) => setForm((f) => ({ ...f, container_size: e.target.value }))}
                disabled={disabled}
              >
                <option value="">Select</option>
                {containerSizesList.map((cs) => (
                  <option key={cs.id} value={cs.name}>
                    {cs.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-numc">
                {t('sdForms.form.numContainers', { lng: 'en', defaultValue: 'Number of Containers' })}
              </label>
              <input
                id="sd-c-numc"
                type="number"
                min={1}
                placeholder="1"
                value={form.num_containers}
                onChange={(e) => setForm((f) => ({ ...f, num_containers: e.target.value }))}
                disabled={disabled}
              />
            </div>
          </div>
        </section>

        <section className="client-detail-modal__section sd-form-section-cargo">
          <h3 className="client-detail-modal__section-title">
            {t('sdForms.declaration.sections.cargo', { lng: 'en', defaultValue: 'Cargo Information' })}
          </h3>
          <div className="sd-form-cargo-row">
            <div className="client-detail-modal__form-field sd-form-cargo-col sd-form-cargo-col--description">
              <label htmlFor="sd-c-cargo">
                {t('sdForms.form.cargo', { lng: 'en', defaultValue: 'Cargo Description' })}
              </label>
              <textarea
                id="sd-c-cargo"
                placeholder={t('sdForms.declaration.cargoPlaceholder', {
                  lng: 'en',
                  defaultValue: 'Describe the cargo',
                })}
                value={form.cargo_description}
                onChange={(e) => setForm((f) => ({ ...f, cargo_description: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field sd-form-cargo-col sd-form-cargo-col--hs">
              <label htmlFor="sd-c-hs">
                {t('sdForms.form.hsCode', { lng: 'en', defaultValue: 'HS Code' })}
              </label>
              <input
                id="sd-c-hs"
                type="text"
                placeholder={t('sdForms.declaration.hsPlaceholder', { lng: 'en', defaultValue: 'e.g. 5208.11' })}
                value={form.hs_code}
                onChange={(e) => setForm((f) => ({ ...f, hs_code: e.target.value }))}
                disabled={disabled}
              />
            </div>
          </div>
        </section>

        <section className="client-detail-modal__section sd-form-section-weight">
          <h3 className="client-detail-modal__section-title">
            {t('sdForms.declaration.sections.weight', { lng: 'en', defaultValue: 'Weight Details' })}
          </h3>
          <div className="client-detail-modal__form-grid">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-gw">
                {t('sdForms.declaration.grossWeightKg', { lng: 'en', defaultValue: 'Total Gross Weight (KG)' })}
              </label>
              <input
                id="sd-c-gw"
                type="number"
                min={0}
                step="0.01"
                placeholder="KG"
                value={form.total_gross_weight}
                onChange={(e) => setForm((f) => ({ ...f, total_gross_weight: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-nw">
                {t('sdForms.declaration.netWeightKg', { lng: 'en', defaultValue: 'Total Net Weight (KG)' })}
              </label>
              <input
                id="sd-c-nw"
                type="number"
                min={0}
                step="0.01"
                placeholder="KG"
                value={form.total_net_weight}
                onChange={(e) => setForm((f) => ({ ...f, total_net_weight: e.target.value }))}
                disabled={disabled}
              />
            </div>
          </div>
        </section>

        {showReefer ? (
          <section className="client-detail-modal__section sd-form-section-reefer">
            <h3 className="client-detail-modal__section-title">
              {t('sdForms.declaration.sections.reefer', { lng: 'en', defaultValue: 'Reefer Details' })}
            </h3>
            <div className="sd-form-reefer-row">
              <div className="client-detail-modal__form-field">
                <label htmlFor="sd-c-rt">
                  {t('sdForms.form.reeferTempLabel', { lng: 'en', defaultValue: 'Temperature (Temp)' })}
                </label>
                <div className="sd-form-input-with-unit">
                  <input
                    id="sd-c-rt"
                    type="text"
                    placeholder={t('sdForms.declaration.reeferTempPlaceholder', {
                      lng: 'en',
                      defaultValue: 'e.g. -18',
                    })}
                    value={form.reefer_temp}
                    onChange={(e) => setForm((f) => ({ ...f, reefer_temp: e.target.value }))}
                    disabled={disabled}
                  />
                  <span className="sd-form-input-unit" aria-hidden="true">
                    {t('sdForms.form.reeferTempUnit', { lng: 'en', defaultValue: '°C' })}
                  </span>
                </div>
              </div>
              <div className="client-detail-modal__form-field">
                <label htmlFor="sd-c-rv">
                  {t('sdForms.form.reeferVentLabel', { lng: 'en', defaultValue: 'Ventilation (Vent)' })}
                </label>
                <div className="sd-form-input-with-unit">
                  <input
                    id="sd-c-rv"
                    type="text"
                    placeholder={t('sdForms.declaration.reeferVentPlaceholder', {
                      lng: 'en',
                      defaultValue: 'e.g. 25',
                    })}
                    value={form.reefer_vent}
                    onChange={(e) => setForm((f) => ({ ...f, reefer_vent: e.target.value }))}
                    disabled={disabled}
                  />
                  <span className="sd-form-input-unit" aria-hidden="true">
                    {t('sdForms.form.reeferVentUnit', { lng: 'en', defaultValue: 'CBM/H' })}
                  </span>
                </div>
              </div>
              <div className="client-detail-modal__form-field">
                <label htmlFor="sd-c-rh">
                  {t('sdForms.form.reeferHumLabel', { lng: 'en', defaultValue: 'Humidity (Hum)' })}
                </label>
                <div className="sd-form-input-with-unit">
                  <input
                    id="sd-c-rh"
                    type="text"
                    placeholder={t('sdForms.declaration.reeferHumPlaceholder', {
                      lng: 'en',
                      defaultValue: 'e.g. 85',
                    })}
                    value={form.reefer_hum}
                    onChange={(e) => setForm((f) => ({ ...f, reefer_hum: e.target.value }))}
                    disabled={disabled}
                  />
                  <span className="sd-form-input-unit" aria-hidden="true">
                    {t('sdForms.form.reeferHumUnit', { lng: 'en', defaultValue: '%' })}
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="client-detail-modal__section sd-form-section-additional-details">
            <h3 className="client-detail-modal__section-title">
              {t('sdForms.declaration.sections.additionalDetails', {
                lng: 'en',
                defaultValue: 'Additional Details',
              })}
            </h3>
          </section>
        )}

        {showAcid ? (
          <section className="client-detail-modal__section sd-form-section-import-customs">
            <h3 className="client-detail-modal__section-title">
              {t('sdForms.declaration.sections.importCustoms', {
                lng: 'en',
                defaultValue: 'Import Customs',
              })}
            </h3>
            <div className="sd-form-import-customs-row">
              <div className="client-detail-modal__form-field">
                <label htmlFor="sd-c-acid">
                  {t('sdForms.form.acidNumber', { lng: 'en', defaultValue: 'ACID Number' })}
                </label>
                <input
                  id="sd-c-acid"
                  type="text"
                  placeholder={t('sdForms.declaration.acidPlaceholder', {
                    lng: 'en',
                    defaultValue: 'ACID for import',
                  })}
                  value={form.acid_number}
                  onChange={(e) => setForm((f) => ({ ...f, acid_number: e.target.value }))}
                  disabled={disabled}
                />
              </div>
            </div>
          </section>
        ) : null}

        <section className="client-detail-modal__section sd-form-section-notes">
          <h3 className="client-detail-modal__section-title flex items-center gap-2">
            {t('sdForms.declaration.sections.notes', { lng: 'en', defaultValue: 'Additional Notes' })}
            <span className="help-icon-wrapper">
              <HelpCircle className="h-4 w-4 text-gray-400" />
              <div className="help-icon-tooltip">
                {notesHelpText}
              </div>
            </span>
          </h3>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <textarea
              id="sd-c-notes"
              className="w-full"
              rows={4}
              placeholder="Enter additional notes..."
              value={form.notes || ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={disabled}
            />
          </div>
        </section>
      </div>
    )
  }

  const pageLoading =
    loading ||
    statsLoading ||
    chartsLoading ||
    exportLoading ||
    refsLoading ||
    createSubmitting ||
    editSubmitting ||
    deleteSubmitting

  const monthFormat = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', { month: 'short', year: 'numeric' })

  const columns = useMemo(
    () => [
      {
        key: 'select',
        label: (
          <input
            type="checkbox"
            checked={allPageSelected}
            onChange={toggleSelectAllPage}
            aria-label={t('sdForms.selectAllPage')}
          />
        ),
        sortable: false,
        render: (_, r) => (
          <input
            type="checkbox"
            checked={!!selectedIds[String(r.id)]}
            onChange={() => toggleSelectRow(r.id)}
            aria-label={t('sdForms.selectRow')}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      { key: 'sd_number', label: t('sdForms.sdNumber'), sortKey: 'sd', render: (_, r) => r.sd_number ?? '—' },
      { key: 'client_name', label: t('sdForms.client'), sortKey: 'client', render: (_, r) => r.client_name ?? '—' },
      { key: 'pol', label: t('sdForms.pol'), render: (_, r) => r.pol ?? '—' },
      { key: 'pod', label: t('sdForms.pod'), render: (_, r) => r.pod ?? '—' },
      { key: 'shipping_line', label: t('sdForms.form.shippingLine'), sortKey: 'shipping_line', render: (_, r) => r.shipping_line ?? '—' },
      {
        key: 'status',
        label: t('sdForms.statusLabel'),
        render: (_, r) => {
          const bookingTitle =
            r.status === 'booking_cancelled' && r.booking_cancellation_reason
              ? `${t('sdForms.booking.reasonLabel', 'Cancellation reason')}: ${r.booking_cancellation_reason}`
              : r.status === 'booking_confirmed' && r.booking_confirmed_at
                ? `${t('sdForms.booking.confirmedAt', 'Confirmed at')}: ${formatDate(r.booking_confirmed_at)}`
                : r.status === 'information_requested' && r.information_request_note
                  ? `${t('sdForms.infoRequest.noteLabel', 'Data completion note')}: ${r.information_request_note}`
                  : undefined
          return (
            <span
              className={`sd-forms-badge ${getStatusBadgeClass(r.status)}`}
              title={bookingTitle}
            >
              {t(`sdForms.status.${r.status}`, r.status)}
            </span>
          )
        },
      },
      { key: 'created_at', label: t('sdForms.createdAt'), sortKey: 'date', render: (_, r) => formatDate(r.created_at) },
      {
        key: 'actions',
        label: t('sdForms.actions'),
        sortable: false,
        render: (_, r) => (
          <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('sdForms.actions')}>
            <IconActionButton icon={<Eye className="h-4 w-4" />} label={t('sdForms.view')} onClick={() => openDetail(r.id)} />
            <IconActionButton
              icon={<FileDown className="h-4 w-4" />}
              label={t('sdForms.pdf', 'Download PDF')}
              onClick={() => downloadPdf(r.id)}
            />
            {canEdit && (r.status !== 'converted_to_shipment' || isAdminRole) && (
              <IconActionButton icon={<Pencil className="h-4 w-4" />} label={t('sdForms.edit')} onClick={() => openEdit(r.id)} />
            )}
            {canCompleteInformation && r.status === 'information_requested' && (
              <>
                <IconActionButton
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label={t('sdForms.infoRequest.completeAction')}
                  onClick={() => openInfoCompleteModal(r)}
                />
                <IconActionButton
                  icon={<Send className="h-4 w-4" />}
                  label={t('sdForms.infoRequest.returnToBookingAction')}
                  onClick={() => openInfoCompleteModal(r)}
                />
              </>
            )}
            {canBookingDecide && ['sent_to_operations', 'booking_in_progress', 'information_requested', 'in_progress'].includes(r.status) && (
              <IconActionButton
                icon={<ClipboardCheck className="h-4 w-4" />}
                label={t('sdForms.booking.action', 'Booking Confirmation')}
                onClick={() => openBookingModal(r)}
              />
            )}
            {canConvertToShipment && ['booking_confirmed', 'in_progress', 'completed'].includes(r.status) && (
              <IconActionButton
                icon={<PackageCheck className="h-4 w-4" />}
                label={t('sdForms.convert.action', 'Complete & Convert to Shipment')}
                onClick={() => openConvertModal(r, 'convert')}
              />
            )}
            {canReopenConverted && r.status === 'converted_to_shipment' && (
              <IconActionButton
                icon={<RotateCcw className="h-4 w-4" />}
                label={t('sdForms.convert.reopenAction', 'Reopen SD form')}
                onClick={() => openConvertModal(r, 'reopen')}
              />
            )}
            {canDelete && r.status !== 'converted_to_shipment' && (
              <IconActionButton
                icon={<Trash2 className="h-4 w-4" />}
                label={t('sdForms.delete')}
                variant="danger"
                onClick={() => setDeleteId(r.id)}
              />
            )}
          </div>
        ),
      },
    ],
    [t, selectedIds, allPageSelected, toggleSelectAllPage, toggleSelectRow, openDetail, openEdit, downloadPdf, canBookingDecide, canCompleteInformation, openInfoCompleteModal, canEdit, canDelete, canConvertToShipment, canReopenConverted, isAdminRole]
  )

  useEffect(() => {
    if (!detailId) {
      setDetailBookingFiles([])
      setDetailBookingLoading(false)
      return
    }
    if (!token || detailLoading || !detailRecord?.id) return

    let cancelled = false
    setDetailBookingLoading(true)
    listSDFormBookingConfirmations(token, detailRecord.id)
      .then((res) => {
        if (!cancelled) setDetailBookingFiles(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        if (!cancelled) setDetailBookingFiles([])
      })
      .finally(() => {
        if (!cancelled) setDetailBookingLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [detailId, token, detailLoading, detailRecord?.id])

  const detail = detailRecord

  const downloadBookingBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'download'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleDetailBookingPreview = async (file) => {
    if (!token || !detail?.id || !file?.id) return
    try {
      const { blob } = await downloadSDFormBookingConfirmation(token, detail.id, file.id)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
    } catch {
      /* ignore */
    }
  }

  const handleDetailBookingDownload = async (file) => {
    if (!token || !detail?.id || !file?.id) return
    try {
      const { blob, filename } = await downloadSDFormBookingConfirmation(token, detail.id, file.id)
      downloadBookingBlob(blob, filename || file.name || 'file')
    } catch {
      /* ignore */
    }
  }

  return (
    <Container size="xl">
      <div className="clients-page sd-forms-page">
        {pageLoading && (
          <div className="clients-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        <SDFormsStatsSection stats={stats} />

        <SDFormsChartsSection charts={charts} monthFormat={monthFormat} />

        <div className="clients-filters-card">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__search-wrap" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
              <Search className="clients-filters__search-icon" aria-hidden />
              <input
                type="search"
                placeholder={t('sdForms.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                className="clients-input clients-filters__search"
                aria-label={t('sdForms.search')}
              />
            </div>
            <div className="clients-filters__fields">
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('sdForms.statusLabel')}
              >
                {SD_FORM_STATUSES.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
              <select
                value={filters.client_id}
                onChange={(e) => setFilters((f) => ({ ...f, client_id: e.target.value, page: 1 }))}
                className="clients-input min-w-[140px]"
                aria-label={t('sdForms.filterClient')}
              >
                <option value="">{t('sdForms.allClients')}</option>
                {clientsList.map((c) => (
                  <option key={`flt-c-${c.id}`} value={c.id}>
                    {c.name ?? c.client_name ?? `#${c.id}`}
                  </option>
                ))}
              </select>
              <select
                value={filters.sales_rep_id}
                onChange={(e) => setFilters((f) => ({ ...f, sales_rep_id: e.target.value, page: 1 }))}
                className="clients-input min-w-[140px]"
                aria-label={t('sdForms.filterSalesRep')}
              >
                <option value="">{t('sdForms.allSalesReps')}</option>
                {usersList.map((u) => (
                  <option key={`flt-u-${u.id}`} value={u.id}>
                    {u.name ?? u.email ?? `#${u.id}`}
                  </option>
                ))}
              </select>
              <div className="min-w-[180px]">
                <AsyncSelect
                  id="flt-shipping-line"
                  value={getShippingLineOption(filters.shipping_line_id)}
                  onChange={(opt) => setFilters((f) => ({ ...f, shipping_line_id: opt?.value || '', page: 1 }))}
                  loadOptions={loadShippingLineOptions}
                  onCreate={handleCreateShippingLine}
                  placeholder={t('sdForms.filterShippingLine') || "Line..."}
                />
              </div>
            </div>
            <div className="clients-filters__actions">
              <button
                type="button"
                className="clients-filters__clear clients-filters__btn-icon"
                onClick={() => {
                  setSelectedIds({})
                  setFilters((f) => ({
                    ...f,
                    search: '',
                    status: '',
                    client_id: '',
                    sales_rep_id: '',
                    shipping_line_id: '',
                    sort: 'date',
                    direction: 'desc',
                    page: 1,
                  }))
                }}
                aria-label={t('sdForms.clearFilters')}
                title={t('sdForms.clearFilters')}
              >
                <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
              </button>
              <button
                type="button"
                className="clients-filters__sort-toggle clients-filters__btn-icon"
                onClick={() => setShowSort((v) => !v)}
                aria-expanded={showSort}
                aria-controls="sd-forms-sort-panel"
                id="sd-forms-sort-toggle"
                title={t('sdForms.sortBy')}
              >
                <ArrowUpDown className="clients-filters__btn-icon-svg" aria-hidden />
                {showSort ? <ChevronUp className="clients-filters__sort-toggle-chevron" aria-hidden /> : <ChevronDown className="clients-filters__sort-toggle-chevron" aria-hidden />}
              </button>
              <button
                type="button"
                className="clients-filters__btn-icon clients-filters__btn-icon--export"
                onClick={handleExport}
                disabled={exportLoading}
                aria-label={selectedCount > 0 ? t('sdForms.exportSelected') : t('pageHeader.export', 'Export')}
                title={selectedCount > 0 ? t('sdForms.exportSelected') : t('sdForms.exportAll')}
              >
                {exportLoading ? <span className="clients-filters__export-spinner" aria-hidden /> : <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />}
              </button>
              {canCreate ? (
                <button
                  type="button"
                  className="page-header__btn page-header__btn--primary"
                  onClick={openCreate}
                >
                  {t('sdForms.newForm')}
                </button>
              ) : null}
            </div>
          </div>
          <div
            id="sd-forms-sort-panel"
            className="clients-filters__row clients-filters__row--sort"
            role="region"
            aria-labelledby="sd-forms-sort-toggle"
            hidden={!showSort}
          >
            <div className="clients-filters__sort-group">
              <label className="clients-filters__sort-label" htmlFor="sd-forms-sort-by">
                {t('sdForms.sortBy')}
              </label>
              <select
                id="sd-forms-sort-by"
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
                className="clients-select"
                aria-label={t('sdForms.sortBy')}
              >
                <option value="date">{t('sdForms.sortDate')}</option>
                <option value="sd">{t('sdForms.sortSd')}</option>
                <option value="client">{t('sdForms.sortClient')}</option>
              </select>
              <select
                value={filters.direction}
                onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
                className="clients-select clients-filters__direction"
                aria-label={t('sdForms.sortOrder')}
              >
                <option value="asc">{t('sdForms.directionAsc')}</option>
                <option value="desc">{t('sdForms.directionDesc')}</option>
              </select>
            </div>
          </div>
        </div>

        {alert && <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        {!loading && list.length === 0 ? (
          <p className="clients-empty">{t('sdForms.noForms')}</p>
        ) : (
          <Table
            columns={columns}
            data={list}
            getRowKey={(row) => row.id}
            emptyMessage={t('sdForms.noForms')}
            sortKey={filters.sort}
            sortDirection={filters.direction}
            onSort={(key, direction) => setFilters((f) => ({ ...f, sort: key, direction }))}
          />
        )}

        {list.length > 0 && pagination.last_page > 0 && (
          <div className="clients-pagination">
            <div className="clients-pagination__left">
              <span className="clients-pagination__total">
                {t('sdForms.total')}: {pagination.total}
              </span>
              <label className="clients-pagination__per-page">
                <span className="clients-pagination__per-page-label">{t('sdForms.perPage')}</span>
                <select
                  value={filters.per_page}
                  onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
                  className="clients-select clients-pagination__select"
                  aria-label={t('sdForms.perPage')}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>
            <Pagination
              currentPage={pagination.current_page}
              totalPages={Math.max(1, pagination.last_page)}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </div>
        )}

        {showCreate && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="sd-create-title">
            <div className="client-detail-modal__backdrop" onClick={() => !createSubmitting && closeCreate()} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="sd-create-title" className="client-detail-modal__title">
                  {t('sdForms.createTitle')}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={closeCreate}
                  disabled={createSubmitting}
                  aria-label="Close"
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form onSubmit={handleCreateSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">
                    {draftRestored ? (
                      <div
                        className="sd-form-draft-banner"
                        role="status"
                        style={{
                          background: '#fef9c3',
                          border: '1px solid #facc15',
                          color: '#713f12',
                          padding: '8px 12px',
                          borderRadius: 6,
                          marginBottom: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          fontSize: 13,
                        }}
                      >
                        <span>
                          {t(
                            'sdForms.draftRestored',
                            'Unsaved draft restored from your last session.',
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={discardLocalDraft}
                          disabled={createSubmitting}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#854d0e',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {t('sdForms.discardDraft', 'Discard draft')}
                        </button>
                      </div>
                    ) : null}
                    {renderSdFormFields(createForm, setCreateForm, { disabled: createSubmitting })}
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={closeCreate} disabled={createSubmitting}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={saveDraft}
                    disabled={createSubmitting}
                    title={t('sdForms.saveAsDraftHint', 'Save your progress as a draft without final validation')}
                  >
                    {createSubmitting ? 'Saving…' : t('sdForms.saveAsDraft', 'Save as Draft')}
                  </button>
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => createDraftAndMaybeDownload(true)}
                    disabled={createSubmitting}
                  >
                    {createSubmitting ? 'Saving…' : 'Save & Download PDF'}
                  </button>
                  <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={createSubmitting}>
                    {createSubmitting ? 'Saving…' : 'Save'}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {editId && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="sd-edit-title">
            <div className="client-detail-modal__backdrop" onClick={() => !editSubmitting && closeEdit()} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="sd-edit-title" className="client-detail-modal__title">
                  {t('sdForms.editTitle')}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={closeEdit}
                  disabled={editSubmitting}
                  aria-label={t('sdForms.close')}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              {editLoading ? (
                <div className="p-8 text-center">
                  <LoaderDots />
                </div>
              ) : (
                <form onSubmit={handleEditSubmit} className="client-detail-modal__form">
                  <div className="client-detail-modal__body client-detail-modal__body--form">
                    <div className="client-detail-modal__body-inner">
                      {renderSdFormFields(editForm, setEditForm, {
                        disabled: editSubmitting,
                        sdNumber: editRecord?.sd_number ?? null,
                      })}
                    </div>
                  </div>
                  <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                    <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={closeEdit} disabled={editSubmitting}>
                      {t('sdForms.cancel')}
                    </button>
                    <button
                      type="button"
                      className="client-detail-modal__btn client-detail-modal__btn--secondary"
                      onClick={() => editId && downloadPdf(editId)}
                      disabled={editSubmitting || !editId}
                    >
                      {t('sdForms.pdf', 'Download PDF')}
                    </button>
                    <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={editSubmitting}>
                      {editSubmitting ? t('sdForms.saving') : t('sdForms.save')}
                    </button>
                  </footer>
                </form>
              )}
            </div>
          </div>
        )}

        {detailId && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="sd-detail-title">
            <div className="client-detail-modal__backdrop" onClick={() => setDetailId(null)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="sd-detail-title" className="client-detail-modal__title">
                  {detailLoading ? t('sdForms.detailTitle') : detail?.sd_number ?? t('sdForms.detailTitle')}
                </h2>
                <button type="button" className="client-detail-modal__close" onClick={() => setDetailId(null)} aria-label={t('sdForms.close')}>
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <div className="client-detail-modal__body client-detail-modal__body--form">
                {detailLoading || !detail ? (
                  <div className="p-8 text-center">
                    <LoaderDots />
                  </div>
                ) : (
                  <div className="client-detail-modal__body-inner">
                    <div className="clients-form-sections">
                      <section className="client-detail-modal__section">
                        <div className="sd-detail-modal__toolbar">
                          <button type="button" className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs" onClick={() => downloadPdf(detail.id)}>
                            <FileDown className="h-4 w-4" aria-hidden />
                            {t('sdForms.pdf')}
                          </button>
                          {['draft', 'submitted'].includes(detail.status) && canSendOps && (
                            <button type="button" className="clients-btn clients-btn--primary inline-flex items-center gap-1 text-xs" onClick={() => runSendOps(detail.id)}>
                              <Send className="h-4 w-4" aria-hidden />
                              {t('sdForms.sendOps')}
                            </button>
                          )}
                          {canSendOps && (
                            <button
                              type="button"
                              className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs"
                              onClick={() => runEmailOps(detail.id)}
                              disabled={emailOpsSendingId === detail.id}
                            >
                              <Mail className="h-4 w-4" aria-hidden />
                              {emailOpsSendingId === detail.id ? t('sdForms.saving') : t('sdForms.emailOps')}
                            </button>
                          )}
                          {canLinkShipment && (
                            <button type="button" className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs" onClick={() => openLinkModal(detail.id)}>
                              <Link2 className="h-4 w-4" aria-hidden />
                              {t('sdForms.linkShipment')}
                            </button>
                          )}
                          {canEdit && (detail.status !== 'converted_to_shipment' || isAdminRole) && (
                            <button type="button" className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs" onClick={() => openEdit(detail.id)}>
                              <Pencil className="h-4 w-4" aria-hidden />
                              {t('sdForms.edit')}
                            </button>
                          )}
                          {canCompleteInformation && detail.status === 'information_requested' && (
                            <>
                              <button
                                type="button"
                                className="clients-btn clients-btn--primary inline-flex items-center gap-1 text-xs"
                                onClick={() => openInfoCompleteModal(detail)}
                              >
                                <CheckCircle2 className="h-4 w-4" aria-hidden />
                                {t('sdForms.infoRequest.completeAction')}
                              </button>
                              <button
                                type="button"
                                className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs"
                                onClick={() => openInfoCompleteModal(detail)}
                              >
                                <Send className="h-4 w-4" aria-hidden />
                                {t('sdForms.infoRequest.returnToBookingAction')}
                              </button>
                            </>
                          )}
                          {canConvertToShipment && ['booking_confirmed', 'in_progress', 'completed'].includes(detail.status) && (
                            <button
                              type="button"
                              className="clients-btn clients-btn--primary inline-flex items-center gap-1 text-xs"
                              onClick={() => openConvertModal(detail, 'convert')}
                            >
                              <PackageCheck className="h-4 w-4" aria-hidden />
                              {t('sdForms.convert.action', 'Complete & Convert to Shipment')}
                            </button>
                          )}
                          {canReopenConverted && detail.status === 'converted_to_shipment' && (
                            <button
                              type="button"
                              className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs"
                              onClick={() => openConvertModal(detail, 'reopen')}
                            >
                              <RotateCcw className="h-4 w-4" aria-hidden />
                              {t('sdForms.convert.reopenAction', 'Reopen SD form')}
                            </button>
                          )}
                        </div>
                        {detail.status === 'converted_to_shipment' && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2">
                            {t(
                              'sdForms.convert.lockedNotice',
                              'This SD form has been converted to a shipment and is locked. Only an admin can reopen it.'
                            )}
                          </p>
                        )}
                        <dl className="sd-detail-modal__dl">
                          {[
                            ['sd_number', detail.sd_number],
                            ['status', t(`sdForms.status.${detail.status}`, detail.status)],
                            ['client', detail.client?.name ?? detail.client_name],
                            ['sales_rep', detail.sales_rep?.name ?? detail.sales_rep_name],
                            ['pol', detail.pol?.name ?? detail.pol_text],
                            ['pod', detail.pod?.name ?? detail.pod_text],
                            ['shipping_line', detail.shipping_line],
                            ['final_destination', detail.final_destination],
                            ['shipment_direction', detail.shipment_direction],
                            ['freight_term', detail.freight_term],
                            ['container_type', detail.container_type],
                            ['container_size', detail.container_size],
                            ['num_containers', detail.num_containers],
                            ['requested_vessel_date', formatDate(detail.requested_vessel_date)],
                            ['acid_number', detail.acid_number],
                            ['cargo_description', detail.cargo_description],
                            ['hs_code', detail.hs_code],
                            ['notes', detail.notes],
                            ['linked_shipment_id', detail.linked_shipment_id ?? detail.linked_shipment?.id],
                          ].map(([k, v]) => (
                            <div key={k} className="sd-detail-modal__dl-item">
                              <dt className="sd-detail-modal__dt">{t(`sdForms.detailFields.${k}`, { defaultValue: String(k) })}</dt>
                              <dd className="sd-detail-modal__dd">{v != null && v !== '' ? String(v) : '—'}</dd>
                            </div>
                          ))}
                        </dl>
                        {(['booking_in_progress', 'booking_confirmed', 'booking_cancelled', 'information_requested', 'converted_to_shipment'].includes(detail.status)
                          || detail.booking_confirmed_at
                          || detail.booking_cancelled_at
                          || detail.booking_cancellation_reason
                          || detail.information_request_note
                          || detail.information_requested_at
                          || detailBookingFiles.length > 0) && (
                          <div className="sd-detail-modal__block sd-booking-outcome mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h4 className="sd-detail-modal__block-title">{t('sdForms.outcome.title', 'Booking outcome')}</h4>
                            <dl className="sd-booking-outcome__grid">
                              <div className="sd-booking-outcome__row">
                                <dt className="sd-booking-outcome__dt">{t('sdForms.outcome.status', 'Booking status')}</dt>
                                <dd className="sd-booking-outcome__dd">
                                  <span className={`sd-forms-badge ${getStatusBadgeClass(detail.status)}`}>
                                    {t(`sdForms.status.${detail.status}`, detail.status)}
                                  </span>
                                </dd>
                              </div>
                              {detail.booking_decided_by?.name && (
                                <div className="sd-booking-outcome__row">
                                  <dt className="sd-booking-outcome__dt">{t('sdForms.outcome.decidedBy', 'Decided by')}</dt>
                                  <dd className="sd-booking-outcome__dd">{detail.booking_decided_by.name}</dd>
                                </div>
                              )}
                              {(detail.booking_confirmed_at || detail.booking_cancelled_at) && (
                                <div className="sd-booking-outcome__row">
                                  <dt className="sd-booking-outcome__dt">{t('sdForms.outcome.decisionDate', 'Decision date')}</dt>
                                  <dd className="sd-booking-outcome__dd">
                                    {formatDate(detail.booking_confirmed_at || detail.booking_cancelled_at)}
                                  </dd>
                                </div>
                              )}
                              {detail.information_requested_at && (
                                <div className="sd-booking-outcome__row">
                                  <dt className="sd-booking-outcome__dt">{t('sdForms.infoRequest.requestedAt', 'Requested at')}</dt>
                                  <dd className="sd-booking-outcome__dd">{formatDate(detail.information_requested_at)}</dd>
                                </div>
                              )}
                              {detail.information_request_note && (
                                <div className="sd-booking-outcome__row sd-booking-outcome__row--block sd-booking-outcome__row--info">
                                  <dt className="sd-booking-outcome__dt">{t('sdForms.infoRequest.noteLabel', 'Operations note')}</dt>
                                  <dd className="sd-booking-outcome__dd whitespace-pre-wrap break-words">
                                    {detail.information_request_note}
                                  </dd>
                                </div>
                              )}
                              {detail.booking_cancellation_reason && (
                                <div className="sd-booking-outcome__row sd-booking-outcome__row--block">
                                  <dt className="sd-booking-outcome__dt">{t('sdForms.outcome.cancellationReason', 'Cancellation reason')}</dt>
                                  <dd className="sd-booking-outcome__dd whitespace-pre-wrap break-words">
                                    {detail.booking_cancellation_reason}
                                  </dd>
                                </div>
                              )}
                              <div className="sd-booking-outcome__row sd-booking-outcome__row--block">
                                <dt className="sd-booking-outcome__dt">{t('sdForms.outcome.confirmationPdf', 'Confirmation document')}</dt>
                                <dd className="sd-booking-outcome__dd">
                                  {detailBookingLoading ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading')}</p>
                                  ) : detailBookingFiles.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {t('sdForms.outcome.noConfirmationFile', 'No confirmation document uploaded yet.')}
                                    </p>
                                  ) : (
                                    <ul className="space-y-2">
                                      {detailBookingFiles.map((f) => (
                                        <li
                                          key={f.id}
                                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 px-3 py-2 text-sm"
                                        >
                                          <span className="font-medium text-gray-800 dark:text-gray-100 break-all">{f.name}</span>
                                          <span className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs py-1 px-2"
                                              onClick={() => handleDetailBookingPreview(f)}
                                            >
                                              <Eye className="h-3.5 w-3.5" aria-hidden />
                                              {t('shipments.viewFile')}
                                            </button>
                                            <button
                                              type="button"
                                              className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs py-1 px-2"
                                              onClick={() => handleDetailBookingDownload(f)}
                                            >
                                              <FileDown className="h-3.5 w-3.5" aria-hidden />
                                              {t('shipments.downloadFile')}
                                            </button>
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        )}
                        {detail.shipper_info ? (
                          <div className="sd-detail-modal__block">
                            <h4 className="sd-detail-modal__block-title">{t('sdForms.form.shipper')}</h4>
                            <p className="sd-detail-modal__block-text">{detail.shipper_info}</p>
                          </div>
                        ) : null}
                        {detail.consignee_info ? (
                          <div className="sd-detail-modal__block">
                            <h4 className="sd-detail-modal__block-title">{t('sdForms.form.consignee')}</h4>
                            <p className="sd-detail-modal__block-text">{detail.consignee_info}</p>
                          </div>
                        ) : null}
                      </section>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => !deleteSubmitting && setDeleteId(null)} />
            <div className="clients-modal-content">
              <h2>{t('sdForms.deleteConfirm')}</h2>
              <p>{t('sdForms.deleteConfirmMessage')}</p>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setDeleteId(null)} disabled={deleteSubmitting}>
                  {t('sdForms.cancel')}
                </button>
                <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteConfirm} disabled={deleteSubmitting}>
                  {deleteSubmitting ? t('sdForms.deleting') : t('sdForms.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {linkOpen && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => !linkSubmitting && setLinkOpen(false)} />
            <div className="clients-modal-content">
              <h2>{t('sdForms.linkShipmentTitle')}</h2>
              <form onSubmit={handleLinkSubmit} className="space-y-3">
                <label className="block text-sm">
                  {t('sdForms.shipmentId')}
                  <input
                    type="number"
                    min={1}
                    required
                    className="clients-input w-full mt-1"
                    value={linkShipmentId}
                    onChange={(e) => setLinkShipmentId(e.target.value)}
                    disabled={linkSubmitting}
                  />
                </label>
                <div className="clients-modal-actions">
                  <button type="button" className="clients-btn" onClick={() => setLinkOpen(false)} disabled={linkSubmitting}>
                    {t('sdForms.cancel')}
                  </button>
                  <button type="submit" className="clients-btn clients-btn--primary" disabled={linkSubmitting}>
                    {linkSubmitting ? t('sdForms.saving') : t('sdForms.link')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {submitOpen && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => !submitSubmitting && setSubmitOpen(false)} />
            <div className="clients-modal-content">
              <h2>{t('sdForms.submitTitle')}</h2>
              <form onSubmit={handleSubmitSd} className="space-y-3">
                <label className="block text-sm">
                  {t('sdForms.form.shipmentDirection')}
                  <select
                    className="clients-input w-full mt-1"
                    value={submitDirection}
                    onChange={(e) => setSubmitDirection(e.target.value)}
                    disabled={submitSubmitting}
                  >
                    {shipmentDirOptions.map((o) => (
                      <option key={`sub-${o.value}`} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                {submitDirection === 'Import' && (
                  <label className="block text-sm">
                    {t('sdForms.form.acidNumber')} *
                    <input
                      type="text"
                      className="clients-input w-full mt-1"
                      required
                      value={submitAcid}
                      onChange={(e) => setSubmitAcid(e.target.value)}
                      disabled={submitSubmitting}
                    />
                  </label>
                )}
                <div className="clients-modal-actions">
                  <button type="button" className="clients-btn" onClick={() => setSubmitOpen(false)} disabled={submitSubmitting}>
                    {t('sdForms.cancel')}
                  </button>
                  <button type="submit" className="clients-btn clients-btn--primary" disabled={submitSubmitting}>
                    {submitSubmitting ? t('sdForms.saving') : t('sdForms.submit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {bookingOpen && bookingRecord && (
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="sd-booking-modal-title">
            <div className="clients-modal-backdrop" onClick={closeBookingModal} />
            <div className="clients-modal-content max-w-lg">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 id="sd-booking-modal-title" className="text-lg font-semibold">
                  {t('sdForms.booking.title', 'Booking Confirmation')}
                </h2>
                <button
                  type="button"
                  className="clients-modal-close"
                  onClick={closeBookingModal}
                  aria-label={t('common.close', 'Close')}
                  disabled={bookingSubmitting}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {t('sdForms.booking.for', 'SD form')}: <strong>{bookingRecord.sd_number || `#${bookingRecord.id}`}</strong>
                {bookingRecord.client_name ? <> — {bookingRecord.client_name}</> : null}
              </p>

              {bookingError && (
                <div className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
                  {bookingError}
                </div>
              )}

              {!bookingAction && (
                <div className="space-y-2">
                  <p className="text-sm">{t('sdForms.booking.choosePrompt', 'Choose an action for this SD form booking:')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="clients-btn inline-flex items-center justify-center gap-2"
                      onClick={() => {
                        setBookingAction('start')
                        resetBookingActionState()
                      }}
                    >
                      <Hourglass className="h-4 w-4" aria-hidden />
                      {t('sdForms.booking.start', 'Mark as Booking in progress')}
                    </button>
                    <button
                      type="button"
                      className="clients-btn clients-btn--primary inline-flex items-center justify-center gap-2"
                      onClick={() => {
                        setBookingAction('confirm')
                        resetBookingActionState()
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      {t('sdForms.booking.confirm', 'Confirm Booking')}
                    </button>
                    <button
                      type="button"
                      className="clients-btn inline-flex items-center justify-center gap-2"
                      onClick={() => {
                        setBookingAction('cancel')
                        resetBookingActionState()
                      }}
                    >
                      <XCircle className="h-4 w-4" aria-hidden />
                      {t('sdForms.booking.cancel', 'Mark as Not booked')}
                    </button>
                    <button
                      type="button"
                      className="clients-btn inline-flex items-center justify-center gap-2"
                      onClick={() => {
                        setBookingAction('requestInfo')
                        resetBookingActionState()
                      }}
                    >
                      <MessageSquareWarning className="h-4 w-4" aria-hidden />
                      {t('sdForms.booking.requestInfo', 'Request information')}
                    </button>
                  </div>
                </div>
              )}

              {bookingAction === 'start' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    runStartBooking()
                  }}
                  className="space-y-3"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('sdForms.booking.startHelp', 'Acknowledges that operations is actively working on the booking. Sales and admin will see the status update.')}
                  </p>
                  <div className="clients-modal-actions">
                    <button
                      type="button"
                      className="clients-btn"
                      onClick={() => {
                        setBookingAction(null)
                        resetBookingActionState()
                      }}
                      disabled={bookingSubmitting}
                    >
                      {t('common.back', 'Back')}
                    </button>
                    <button
                      type="submit"
                      className="clients-btn clients-btn--primary inline-flex items-center gap-2"
                      disabled={bookingSubmitting}
                    >
                      {bookingSubmitting ? <LoaderDots size={8} /> : <Hourglass className="h-4 w-4" aria-hidden />}
                      {t('sdForms.booking.startSubmit', 'Mark as Booking in progress')}
                    </button>
                  </div>
                </form>
              )}

              {bookingAction === 'requestInfo' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    runRequestInformation()
                  }}
                  className="space-y-3"
                >
                  <label className="block text-sm">
                    {t('sdForms.booking.noteLabel', 'What information is missing?')}
                    <textarea
                      className="clients-input w-full mt-1 text-sm"
                      rows={4}
                      value={bookingInfoNote}
                      onChange={(e) => setBookingInfoNote(e.target.value)}
                      placeholder={t('sdForms.booking.notePlaceholder', 'Describe what the sales/admin team needs to complete…')}
                      disabled={bookingSubmitting}
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('sdForms.booking.requestInfoHelp', 'Send the SD form back to the sales/admin team for additional information. Your note will be visible to them.')}
                  </p>
                  <div className="clients-modal-actions">
                    <button
                      type="button"
                      className="clients-btn"
                      onClick={() => {
                        setBookingAction(null)
                        resetBookingActionState()
                      }}
                      disabled={bookingSubmitting}
                    >
                      {t('common.back', 'Back')}
                    </button>
                    <button
                      type="submit"
                      className="clients-btn clients-btn--primary inline-flex items-center gap-2"
                      disabled={bookingSubmitting || String(bookingInfoNote || '').trim().length < 3}
                    >
                      {bookingSubmitting ? <LoaderDots size={8} /> : <MessageSquareWarning className="h-4 w-4" aria-hidden />}
                      {t('sdForms.booking.requestInfoSubmit', 'Send information request')}
                    </button>
                  </div>
                </form>
              )}

              {bookingAction === 'confirm' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    runConfirmBooking()
                  }}
                  className="space-y-3"
                >
                  <label className="block text-sm">
                    {t('sdForms.booking.fileLabel', 'Confirmation document (PDF / image / Office)')}
                    <input
                      type="file"
                      className="clients-input w-full mt-1 text-sm"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,.ppt,.pptx"
                      onChange={(e) => setBookingFile(e.target.files?.[0] || null)}
                      disabled={bookingSubmitting}
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('sdForms.booking.confirmHelp', 'Upload the booking confirmation file. SD form status will become "Booking Confirmed".')}
                  </p>
                  <div className="clients-modal-actions">
                    <button
                      type="button"
                      className="clients-btn"
                      onClick={() => {
                        setBookingAction(null)
                        setBookingFile(null)
                        setBookingError(null)
                      }}
                      disabled={bookingSubmitting}
                    >
                      {t('common.back', 'Back')}
                    </button>
                    <button
                      type="submit"
                      className="clients-btn clients-btn--primary inline-flex items-center gap-2"
                      disabled={bookingSubmitting || !bookingFile}
                    >
                      {bookingSubmitting ? <LoaderDots size={8} /> : <Upload className="h-4 w-4" aria-hidden />}
                      {t('sdForms.booking.confirmSubmit', 'Confirm & Upload')}
                    </button>
                  </div>
                </form>
              )}

              {bookingAction === 'cancel' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    runCancelBooking()
                  }}
                  className="space-y-3"
                >
                  <label className="block text-sm">
                    {t('sdForms.booking.reasonLabel', 'Cancellation reason')}
                    <textarea
                      className="clients-input w-full mt-1 text-sm"
                      rows={4}
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                      placeholder={t('sdForms.booking.reasonPlaceholder', 'Explain why this booking is being cancelled…')}
                      disabled={bookingSubmitting}
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('sdForms.booking.cancelHelp', 'SD form status will become "Booking Cancelled". The reason will be visible to admin and sales.')}
                  </p>
                  <div className="clients-modal-actions">
                    <button
                      type="button"
                      className="clients-btn"
                      onClick={() => {
                        setBookingAction(null)
                        setBookingReason('')
                        setBookingError(null)
                      }}
                      disabled={bookingSubmitting}
                    >
                      {t('common.back', 'Back')}
                    </button>
                    <button
                      type="submit"
                      className="clients-btn clients-btn--primary inline-flex items-center gap-2"
                      disabled={bookingSubmitting || String(bookingReason || '').trim().length < 3}
                    >
                      {bookingSubmitting ? <LoaderDots size={8} /> : <XCircle className="h-4 w-4" aria-hidden />}
                      {t('sdForms.booking.cancelSubmit', 'Submit Cancellation')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {infoCompleteOpen && infoCompleteRecord && (
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="sd-info-complete-modal-title">
            <div className="clients-modal-backdrop" onClick={closeInfoCompleteModal} />
            <div className="clients-modal-content max-w-md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 id="sd-info-complete-modal-title" className="text-lg font-semibold">
                  {t('sdForms.infoRequest.completeTitle')}
                </h2>
                <button
                  type="button"
                  className="clients-modal-close"
                  onClick={closeInfoCompleteModal}
                  aria-label={t('common.close', 'Close')}
                  disabled={infoCompleteSubmitting}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {t('sdForms.booking.for', 'SD form')}: <strong>{infoCompleteRecord.sd_number || `#${infoCompleteRecord.id}`}</strong>
                {infoCompleteRecord.client_name ? <> — {infoCompleteRecord.client_name}</> : null}
              </p>
              {infoCompleteRecord.information_request_note && (
                <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
                  <p className="font-medium text-xs uppercase tracking-wide mb-1">{t('sdForms.infoRequest.noteLabel')}</p>
                  <p className="whitespace-pre-wrap break-words">{infoCompleteRecord.information_request_note}</p>
                </div>
              )}
              {infoCompleteError && (
                <div className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
                  {infoCompleteError}
                </div>
              )}
              <p className="text-sm mb-4">{t('sdForms.infoRequest.completeConfirm')}</p>
              <div className="clients-modal-actions">
                <button
                  type="button"
                  className="clients-btn"
                  onClick={closeInfoCompleteModal}
                  disabled={infoCompleteSubmitting}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  className="clients-btn clients-btn--primary inline-flex items-center gap-2"
                  onClick={runCompleteInformation}
                  disabled={infoCompleteSubmitting}
                >
                  {infoCompleteSubmitting ? <LoaderDots size={8} /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
                  {t('sdForms.infoRequest.completeAction')}
                </button>
              </div>
            </div>
          </div>
        )}

        {convertOpen && convertRecord && (
          <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="sd-convert-modal-title">
            <div className="clients-modal-backdrop" onClick={closeConvertModal} />
            <div className="clients-modal-content max-w-md">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 id="sd-convert-modal-title" className="text-lg font-semibold">
                  {convertMode === 'reopen'
                    ? t('sdForms.convert.reopenTitle', 'Reopen SD form')
                    : t('sdForms.convert.title', 'Convert to Shipment')}
                </h2>
                <button
                  type="button"
                  className="clients-modal-close"
                  onClick={closeConvertModal}
                  aria-label={t('common.close', 'Close')}
                  disabled={convertSubmitting}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                {t('sdForms.booking.for', 'SD form')}: <strong>{convertRecord.sd_number || `#${convertRecord.id}`}</strong>
                {convertRecord.client_name ? <> — {convertRecord.client_name}</> : null}
              </p>

              {convertError && (
                <div className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
                  {convertError}
                </div>
              )}

              <p className="text-sm mb-4">
                {convertMode === 'reopen'
                  ? t(
                      'sdForms.convert.reopenConfirm',
                      'Reopening will return this SD form back to the operations stage so it can be edited again.'
                    )
                  : t(
                      'sdForms.convert.confirm',
                      'This will mark the SD form as fully completed and converted into an active shipment. The form will become read-only.'
                    )}
              </p>

              <div className="clients-modal-actions">
                <button
                  type="button"
                  className="clients-btn"
                  onClick={closeConvertModal}
                  disabled={convertSubmitting}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  className="clients-btn clients-btn--primary inline-flex items-center gap-2"
                  onClick={convertMode === 'reopen' ? runReopenConverted : runConvertToShipment}
                  disabled={convertSubmitting}
                >
                  {convertSubmitting ? (
                    <LoaderDots size={8} />
                  ) : convertMode === 'reopen' ? (
                    <RotateCcw className="h-4 w-4" aria-hidden />
                  ) : (
                    <PackageCheck className="h-4 w-4" aria-hidden />
                  )}
                  {convertMode === 'reopen'
                    ? t('sdForms.convert.reopenSubmit', 'Reopen SD form')
                    : t('sdForms.convert.submit', 'Complete & Convert to Shipment')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
