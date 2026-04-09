import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import { useAuthAccess } from '../../hooks/useAuthAccess'
import {
  listShipments,
  getShipment,
  createShipment,
  updateShipment,
  deleteShipment,
  getShipmentStats,
  getShipmentCharts,
  exportShipments,
  postShipmentTrackingUpdate,
  downloadShipmentPdf,
} from '../../api/shipments'
import { listShipmentExpenses } from '../../api/expenses'
import { listClients } from '../../api/clients'
import { listUsers } from '../../api/users'
import { listSDForms } from '../../api/sdForms'
import { listVendors } from '../../api/vendors'
import { listPorts, createPort } from '../../api/ports'
import { listShipmentStatuses } from '../../api/settings'
import AsyncSelect from '../../components/AsyncSelect'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table } from '../../components/Table'
import { DropdownMenu } from '../../components/DropdownMenu'
import Pagination from '../../components/Pagination'
import { StatsCard } from '../../components/StatsCard'
import ShipmentStatusBadge from '../../components/ShipmentStatusBadge'
import ShipmentDetailModal from './ShipmentDetailModal'
import ShipmentFinancialsModal from './ShipmentFinancialsModal'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import {
  Eye,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Search,
  X,
  Package,
  RotateCcw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileDown,
  Receipt,
  StickyNote,
  ClipboardList,
  Menu,
  ListFilter,
} from 'lucide-react'
import { BarChart, DonutChart } from '../../components/Charts'
import '../../components/Charts/Charts.css'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'
import './Shipments.css'
import '../SDForms/SDForms.css'
import {
  findShipmentStatusOption,
  shipmentStatusFilterValue,
  shipmentStatusLegacyLabel,
  shipmentStatusLocalizedLabel,
} from '../../utils/shipmentStatusHelpers'

function getMonthFormat(locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })
}

/** Shipment modal: container size / type dropdown values (stored as shown in `value`). */
const SHIPMENT_CONTAINER_SIZE_OPTIONS = [
  { value: '20', labelKey: 'shipments.containerSizes.20' },
  { value: '40', labelKey: 'shipments.containerSizes.40' },
]

const SHIPMENT_CONTAINER_TYPE_OPTIONS = [
  { value: 'Dry', labelKey: 'shipments.containerTypes.dry' },
  { value: 'Reefer', labelKey: 'shipments.containerTypes.reefer' },
  { value: 'Open Top', labelKey: 'shipments.containerTypes.openTop' },
  { value: 'Flat Rack', labelKey: 'shipments.containerTypes.flatRack' },
  { value: 'High Cube', labelKey: 'shipments.containerTypes.highCube' },
]

const defaultCreateForm = () => ({
  client_id: '',
  sd_form_id: '',
  line_vendor_id: '',
  origin_port_id: '',
  destination_port_id: '',
  booking_number: '',
  booking_date: '',
  acid_number: '',
  bl_number: '',
  shipment_direction: 'Export',
  mode: 'Sea',
  shipment_type: 'FCL',
  container_count: '1',
  container_size: '',
  container_type: '',
  loading_place: '',
  loading_date: '',
  cargo_description: '',
  notes: '',
  is_reefer: false,
  reefer_temp: '',
  reefer_vent: '',
  reefer_hum: '',
})

function numOrUndef(v) {
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return Number.isNaN(n) ? undefined : n
}

function normalizeShipmentResponse(payload) {
  // Some backends return `{ data: [...] }` even for "single" shipment requests.
  // The modal expects a single shipment object.
  const d = payload?.data ?? payload
  if (Array.isArray(d)) return d[0] ?? null
  return d ?? null
}

function buildCreatePayload(form) {
  const body = {}
  const cid = numOrUndef(form.client_id)
  if (cid != null) body.client_id = cid
  const sd = numOrUndef(form.sd_form_id)
  if (sd != null) body.sd_form_id = sd
  const lv = numOrUndef(form.line_vendor_id)
  if (lv != null) body.line_vendor_id = lv
  const op = numOrUndef(form.origin_port_id)
  if (op != null) body.origin_port_id = op
  const dp = numOrUndef(form.destination_port_id)
  if (dp != null) body.destination_port_id = dp
  if (form.booking_number?.trim()) body.booking_number = form.booking_number.trim()
  if (form.booking_date?.trim()) body.booking_date = form.booking_date.trim()
  if (form.acid_number?.trim() && form.shipment_direction === 'Import') body.acid_number = form.acid_number.trim()
  if (form.bl_number?.trim()) body.bl_number = form.bl_number.trim()
  if (form.shipment_direction) body.shipment_direction = form.shipment_direction
  if (form.mode) body.mode = form.mode
  if (form.shipment_type) body.shipment_type = form.shipment_type
  const cc = numOrUndef(form.container_count)
  if (cc != null) body.container_count = cc
  if (form.container_size?.trim()) body.container_size = form.container_size.trim()
  if (form.container_type?.trim()) body.container_type = form.container_type.trim()
  if (form.loading_place?.trim()) body.loading_place = form.loading_place.trim()
  if (form.loading_date?.trim()) body.loading_date = form.loading_date.trim()
  if (form.cargo_description?.trim()) body.cargo_description = form.cargo_description.trim()
  if (form.notes?.trim()) body.notes = form.notes.trim()
  if (form.is_reefer) {
    body.is_reefer = true
    if (form.reefer_temp?.trim()) body.reefer_temp = form.reefer_temp.trim()
    if (form.reefer_vent?.trim()) body.reefer_vent = form.reefer_vent.trim()
    if (form.reefer_hum?.trim()) body.reefer_hum = form.reefer_hum.trim()
  }
  return body
}

function clientInitials(row) {
  const n = row.client?.company_name || row.client?.name || ''
  const parts = String(n).trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2)
  return String(n).slice(0, 2).toUpperCase() || '?'
}

/** Apply SD Form row to shipment form state (client, route, cargo from SD). */
function mergeShipmentFormFromSd(sd, prev) {
  if (!sd) return { ...prev, sd_form_id: '' }
  const next = { ...prev, sd_form_id: String(sd.id) }
  if (sd.client_id != null) next.client_id = String(sd.client_id)
  if (sd.shipment_direction) next.shipment_direction = sd.shipment_direction
  if (sd.pol_id != null) next.origin_port_id = String(sd.pol_id)
  if (sd.pod_id != null) next.destination_port_id = String(sd.pod_id)
  if (sd.num_containers != null && String(sd.num_containers).trim() !== '') {
    next.container_count = String(sd.num_containers)
  }
  if (sd.container_size) next.container_size = sd.container_size
  if (sd.container_type) next.container_type = sd.container_type
  if (sd.cargo_description) next.cargo_description = sd.cargo_description
  if (sd.notes != null && String(sd.notes).trim() !== '') next.notes = String(sd.notes)
  if (sd.shipment_direction === 'Import' && sd.acid_number) {
    next.acid_number = String(sd.acid_number)
  }
  return next
}

function sdFormOptionLabel(sd) {
  const num = sd.sd_number || `#${sd.id}`
  return `${num} (ID ${sd.id})`
}

function buildUpdatePayload(form) {
  const body = {
    client_id: numOrUndef(form.client_id),
    sd_form_id: numOrUndef(form.sd_form_id),
    line_vendor_id: numOrUndef(form.line_vendor_id),
    origin_port_id: numOrUndef(form.origin_port_id),
    destination_port_id: numOrUndef(form.destination_port_id),
    shipment_direction: form.shipment_direction || undefined,
    mode: form.mode || undefined,
    shipment_type: form.shipment_type || undefined,
    container_count: numOrUndef(form.container_count),
    container_size: form.container_size?.trim() || null,
    container_type: form.container_type?.trim() || null,
    cargo_description: form.cargo_description?.trim() || null,
    notes: form.notes?.trim() || null,

    bl_number: form.bl_number?.trim() || null,
    booking_number: form.booking_number?.trim() || null,
    booking_date: form.booking_date?.trim() || null,
  }
  if (form.shipment_direction === 'Import') {
    body.acid_number = form.acid_number?.trim() || null;
  }
  body.loading_place = form.loading_place?.trim() || null;
  body.loading_date = form.loading_date?.trim() || null;
  body.is_reefer = !!form.is_reefer;
  body.reefer_temp = form.reefer_temp?.trim() || null;
  body.reefer_vent = form.reefer_vent?.trim() || null;
  body.reefer_hum = form.reefer_hum?.trim() || null;
  return body;
}

export default function Shipments() {
  const { t, i18n } = useTranslation()
  const { hasPageAccess, user, isAdminRole, isOperations, roleId, hasAbility } = useAuthAccess()
  const isSalesRepresentative = roleId === 3 || roleId === 2
  const canManageOps = hasPageAccess('shipments')
  const canViewShipmentFinancials = hasPageAccess('shipments')
  const canManageFinancial = hasPageAccess('shipments')
  const canViewSelling = hasPageAccess('shipments')
  const canManageExpenses = hasPageAccess('shipments')
  const canNotifySalesFinancials = hasPageAccess('shipments')

  const token = getStoredToken()
  const numberLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const monthFormat = getMonthFormat(i18n.language)

  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 })
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    client_id: '',
    sales_rep_id: '',
    line_vendor_id: '',
    from: '',
    to: '',
    sd_number: '',
    sort: 'created_at',
    direction: 'desc',
    page: 1,
    per_page: 25,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [showSort, setShowSort] = useState(false)

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [charts, setCharts] = useState(null)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [pdfExportingId, setPdfExportingId] = useState(null)
  const [selectedIds, setSelectedIds] = useState({})

  const [clientOptions, setClientOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const [vendorOptions, setVendorOptions] = useState([])
  const [portOptions, setPortOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState([])
  const [opsStatusOptions, setOpsStatusOptions] = useState([])
  const [sdFormsForClient, setSdFormsForClient] = useState([])
  const [sdFormsForClientLoading, setSdFormsForClientLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(defaultCreateForm())
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(defaultCreateForm())
  const [editSubmitting, setEditSubmitting] = useState(false)

  /** Load SD forms for the client selected in the open create/edit shipment modal (API filters by client_id). */
  useEffect(() => {
    if (!token) return
    const modalOpen = showCreate || editId != null
    if (!modalOpen) {
      setSdFormsForClient([])
      setSdFormsForClientLoading(false)
      return
    }
    const rawClientId = showCreate ? createForm.client_id : editId != null ? editForm.client_id : ''
    const clientId = numOrUndef(rawClientId)
    if (clientId == null) {
      setSdFormsForClient([])
      setSdFormsForClientLoading(false)
      return
    }
    let cancelled = false
    setSdFormsForClientLoading(true)
    const params = { per_page: 1000, client_id: clientId, sort: 'sd', direction: 'desc' }
    if (isSalesRepresentative && !isAdminRole && !isOperations) {
      params.sales_rep_id = user?.id
    }
    listSDForms(token, params)
      .then((res) => {
        if (cancelled) return
        const data = res.data ?? []
        setSdFormsForClient(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setSdFormsForClient([])
      })
      .finally(() => {
        if (!cancelled) setSdFormsForClientLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [
    token,
    showCreate,
    editId,
    createForm.client_id,
    editForm.client_id,
    isSalesRepresentative,
    isAdminRole,
    isOperations,
    user?.id,
  ])

  const sdFormsSortedForClient = useMemo(
    () =>
      [...sdFormsForClient].sort((a, b) =>
        String(a.sd_number || '').localeCompare(String(b.sd_number || ''), undefined, { numeric: true })
      ),
    [sdFormsForClient]
  )

  const [detailId, setDetailId] = useState(null)
  const [detailShipment, setDetailShipment] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('info')


  const [deleteId, setDeleteId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const [stageRow, setStageRow] = useState(null)
  const [stageForm, setStageForm] = useState({ statusKey: '', eventDate: '', message: '' })
  const [stageSubmitting, setStageSubmitting] = useState(false)

  const [financialRow, setFinancialRow] = useState(null)
  const [financialRows, setFinancialRows] = useState([])
  const [financialLoading, setFinancialLoading] = useState(false)

  const listParams = useMemo(
    () => ({
      search: filters.search?.trim() || undefined,
      status: filters.status || undefined,
      client_id: filters.client_id || undefined,
      sales_rep_id: filters.sales_rep_id || undefined,
      line_vendor_id: filters.line_vendor_id || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      sd_number: filters.sd_number?.trim() || undefined,
      sort: filters.sort,
      direction: filters.direction,
      page: filters.page,
      per_page: filters.per_page,
    }),
    [filters]
  )

  const exportParams = useMemo(() => {
    const { page: _p, per_page: _pp, sort: _s, direction: _d, ...rest } = listParams
    return rest
  }, [listParams])

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listShipments(token, listParams)
      .then((res) => {
        const data = res.data ?? res.shipments ?? []
        setRows(Array.isArray(data) ? data : [])
        const m = res.meta ?? {}
        setMeta({
          current_page: m.current_page ?? 1,
          last_page: Math.max(1, m.last_page ?? 1),
          per_page: m.per_page ?? filters.per_page,
          total: m.total ?? 0,
        })
      })
      .catch((err) => {
        setRows([])
        setAlert({ type: 'error', message: err.message || t('shipments.errorLoad') })
      })
      .finally(() => setLoading(false))
  }, [token, listParams, t])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!token) return
    setStatsLoading(true)
    getShipmentStats(token)
      .then((data) => setStats(data.data ?? data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    setChartsLoading(true)
    getShipmentCharts(token, { months: 6 })
      .then((data) => setCharts(data.data ?? data))
      .catch(() => setCharts(null))
      .finally(() => setChartsLoading(false))
  }, [token])

  useEffect(() => {
    setSelectedIds({})
  }, [filters.page])

  const reloadFinancialExpenses = useCallback(() => {
    const bl = financialRow?.bl_number?.trim()
    if (!bl || !token || !canViewShipmentFinancials) return
    setFinancialLoading(true)
    listShipmentExpenses(token, { bl })
      .then((res) => setFinancialRows(res.data ?? []))
      .catch(() => {})
      .finally(() => setFinancialLoading(false))
  }, [financialRow?.bl_number, financialRow?.id, token, canViewShipmentFinancials])

  const refreshFinancialShipment = useCallback(() => {
    if (!financialRow?.id || !token) return
    getShipment(token, financialRow.id)
      .then((res) => {
        const d = normalizeShipmentResponse(res)
        setFinancialRow((prev) => (prev && d && prev.id === d.id ? { ...prev, ...d } : prev))
      })
      .catch(() => {})
  }, [financialRow?.id, token])

  useEffect(() => {
    if (!financialRow || !token || !canViewShipmentFinancials) {
      setFinancialRows([])
      return
    }
    const bl = financialRow.bl_number?.trim()
    if (!bl) {
      setFinancialRows([])
      return
    }
    setFinancialLoading(true)
    listShipmentExpenses(token, { bl })
      .then((res) => setFinancialRows(res.data ?? []))
      .catch(() => setFinancialRows([]))
      .finally(() => setFinancialLoading(false))
  }, [financialRow, token, canViewShipmentFinancials])

  useEffect(() => {
    if (!token) return
    const clientParams = { per_page: 500 }
    if (isSalesRepresentative && !isAdminRole && !isOperations) {
      clientParams.assigned_sales_id = user?.id
    }

    Promise.all([
      listClients(token, clientParams).catch(() => ({})),
      listUsers(token, { per_page: 300 }).catch(() => ({})),
      listVendors(token).catch(() => ({})),
      listPorts(token, { per_page: 500 }).catch(() => ({})),
      listShipmentStatuses(token).catch(() => ({})),
    ]).then(([c, u, v, p, st]) => {
      const clients = c.data ?? c.clients ?? []
      setClientOptions(Array.isArray(clients) ? clients : [])
      const users = u.data ?? u.users ?? u
      setUserOptions(Array.isArray(users) ? users : [])
      const vendors = v.data ?? v.vendors ?? v
      setVendorOptions(Array.isArray(vendors) ? vendors : [])
      const ports = p.data ?? p
      setPortOptions(Array.isArray(ports) ? ports : [])
      const statuses = st.data ?? []
      if (Array.isArray(statuses)) {
        setStatusOptions(statuses.filter((s) => s.type === 'commercial' || !s.type))
        setOpsStatusOptions(statuses.filter((s) => s.type === 'operational'))
      }
    })
  }, [token, isSalesRepresentative, isAdminRole, isOperations, user?.id])

  useEffect(() => {
    setFilters((f) => ({ ...f, page: 1 }))
  }, [
    filters.search,
    filters.status,
    filters.client_id,
    filters.sales_rep_id,
    filters.line_vendor_id,
    filters.from,
    filters.to,
    filters.sd_number,
    filters.per_page,
  ])

  useEffect(() => {
    if (filters.sort !== 'cost' && filters.sort !== 'profit') return
    setFilters((f) => ({ ...f, sort: 'created_at' }))
  }, [filters.sort])

  const refreshShipmentDetail = useCallback(() => {
    if (!detailId || !token) return
    setDetailLoading(true)
    getShipment(token, detailId)
      .then((data) => setDetailShipment(normalizeShipmentResponse(data)))
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }, [token, detailId])

  useEffect(() => {
    if (!detailId || !token) {
      setDetailShipment(null)
      return
    }
    setDetailLoading(true)
    getShipment(token, detailId)
      .then((data) => setDetailShipment(normalizeShipmentResponse(data)))
      .catch(() => {
        setDetailShipment(null)
        setAlert({ type: 'error', message: t('shipments.errorDetail') })
      })
      .finally(() => setDetailLoading(false))
  }, [token, detailId, t])

  const pageLoading =
    loading ||
    statsLoading ||
    chartsLoading ||
    exportLoading ||
    createSubmitting ||
    editSubmitting ||
    deleteSubmitting ||
    stageSubmitting

  const openEdit = (row) => {
    setEditId(row.id)
    setEditForm({
      client_id: row.client_id != null ? String(row.client_id) : '',
      sd_form_id: row.sd_form_id != null ? String(row.sd_form_id) : '',
      line_vendor_id: row.line_vendor_id != null ? String(row.line_vendor_id) : '',
      origin_port_id: row.origin_port_id != null ? String(row.origin_port_id) : '',
      destination_port_id: row.destination_port_id != null ? String(row.destination_port_id) : '',
      booking_number: row.booking_number ?? '',
      booking_date: row.booking_date ? String(row.booking_date).slice(0, 10) : '',
      acid_number: row.acid_number ?? '',
      bl_number: row.bl_number ?? '',
      shipment_direction: row.shipment_direction ?? 'Export',
      mode: row.mode ?? 'Sea',
      shipment_type: row.shipment_type ?? 'FCL',
      container_count: row.container_count != null ? String(row.container_count) : '',
      container_size: row.container_size ?? '',
      container_type: row.container_type ?? '',
      loading_place: row.loading_place ?? '',
      loading_date: row.loading_date ? String(row.loading_date).slice(0, 10) : '',
      cargo_description: row.cargo_description ?? '',
      notes: row.notes ?? '',
      is_reefer: !!row.is_reefer,
      reefer_temp: row.reefer_temp ?? '',
      reefer_vent: row.reefer_vent ?? '',
      reefer_hum: row.reefer_hum ?? '',
    })
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!canManageOps) return
    if (!numOrUndef(createForm.client_id)) {
      setAlert({ type: 'error', message: t('shipments.errorClientOrSdRequired') })
      return
    }
    setAlert(null)
    setCreateSubmitting(true)
    try {
      await createShipment(token, buildCreatePayload(createForm))
      setShowCreate(false)
      setCreateForm(defaultCreateForm())
      loadList()
      setAlert({ type: 'success', message: t('shipments.created') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('shipments.errorCreate') })
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editId || !canManageOps) return
    const savedEditId = editId
    setAlert(null)
    setEditSubmitting(true)
    try {
      await updateShipment(token, savedEditId, buildUpdatePayload(editForm))
      setEditId(null)
      loadList()
      if (detailId === savedEditId) {
        setDetailShipment(null)
        setDetailId(null)
      }
      setAlert({ type: 'success', message: t('shipments.updated') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('shipments.errorUpdate') })
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId || !canManageOps) return
    setAlert(null)
    setDeleteSubmitting(true)
    try {
      await deleteShipment(token, deleteId)
      const removed = deleteId
      setDeleteId(null)
      if (detailId === removed) {
        setDetailId(null)
        setDetailShipment(null)
      }
      loadList()
      setAlert({ type: 'success', message: t('shipments.deleted') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('shipments.errorDelete') })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleExport = async () => {
    setAlert(null)
    setExportLoading(true)
    try {
      const ids = Object.keys(selectedIds).filter((id) => selectedIds[id])
      const params = ids.length > 0 ? { ...exportParams, ids: ids.join(',') } : exportParams
      const blob = await exportShipments(token, params)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const day = new Date().toISOString().slice(0, 10)
      a.download = ids.length > 0 ? `shipments-selected-${day}.csv` : `shipments-export-${day}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setAlert({ type: 'success', message: t('shipments.exportSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('shipments.errorExport') })
    } finally {
      setExportLoading(false)
    }
  }

  const pageRowIds = useMemo(() => rows.map((r) => String(r.id)), [rows])
  const allPageSelected = pageRowIds.length > 0 && pageRowIds.every((id) => selectedIds[id])
  const getPortOption = (id) => {
    if (!id) return null
    const p = portOptions.find((x) => String(x.id) === String(id))
    if (!p) return { value: id, label: `#${id}` }
    return { value: p.id, label: p.name || p.code || `#${p.id}` }
  }

  const loadPortOptions = async (q) => {
    if (!token) return []
    try {
      const res = await listPorts(token, { q, active: true })
      const data = res.data ?? res
      const arr = Array.isArray(data) ? data : []
      return arr.map((p) => ({
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
      // Optionally refresh the local portOptions list
      const updatedPortsRes = await listPorts(token)
      const updatedPorts = updatedPortsRes.data ?? updatedPortsRes
      setPortOptions(Array.isArray(updatedPorts) ? updatedPorts : [])
      
      return {
        value: newPort.id,
        label: newPort.name || newPort.code || `#${newPort.id}`,
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to create port' })
      return null
    }
  }

  const selectedCount = useMemo(
    () => Object.keys(selectedIds).filter((k) => selectedIds[k]).length,
    [selectedIds]
  )

  const toggleSelectAllPage = () => {
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
  }

  const toggleSelectRow = (id) => {
    const sid = String(id)
    setSelectedIds((prev) => {
      const next = { ...prev }
      if (next[sid]) delete next[sid]
      else next[sid] = true
      return next
    })
  }

  const handleStageSubmit = async (e) => {
    e.preventDefault()
    if (!stageRow || !token || !canManageOps || !stageForm.statusKey?.trim()) return
    const stageShipmentId = stageRow.id
    setStageSubmitting(true)
    setAlert(null)
    try {
      await updateShipment(token, stageShipmentId, { status: stageForm.statusKey.trim() })
      if (stageForm.message?.trim()) {
        const prefix = stageForm.eventDate ? `[${stageForm.eventDate}] ` : ''
        await postShipmentTrackingUpdate(token, stageShipmentId, { update_text: `${prefix}${stageForm.message.trim()}` })
      }
      setStageRow(null)
      setStageForm({ statusKey: '', eventDate: '', message: '' })
      loadList()
      if (detailId === stageShipmentId) {
        setDetailShipment(null)
        setDetailId(null)
      }
      setAlert({ type: 'success', message: t('shipments.stageUpdated') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('shipments.errorStage') })
    } finally {
      setStageSubmitting(false)
    }
  }

  const clientName = (row) => row.client?.company_name ?? row.client?.name ?? '—'
  const routeLabel = (row) => {
    const a = row.origin_port?.name
    const b = row.destination_port?.name
    if (a || b) return [a, b].filter(Boolean).join(' → ')
    return row.route_text || '—'
  }

  const statusDistributionData = useMemo(() => {
    const dist = charts?.status_distribution
    if (!Array.isArray(dist) || dist.length === 0) return []
    return dist.map((item) => {
      const raw = item.status ?? '—'
      const opt = findShipmentStatusOption(statusOptions, raw)
      const name = opt
        ? shipmentStatusLocalizedLabel(opt, i18n.language)
        : shipmentStatusLegacyLabel(raw, t)
      const color = opt && typeof opt.color === 'string' ? opt.color.trim() : undefined
      return { name, count: item.count ?? 0, color }
    })
  }, [charts, statusOptions, i18n.language, t])

  const monthlyChartData = useMemo(() => {
    const m = charts?.monthly_revenue_profit
    if (!Array.isArray(m) || m.length === 0) return []
    return m.map((item) => ({
      monthLabel: item.month ? monthFormat.format(new Date(`${String(item.month).slice(0, 10)}T12:00:00`)) : '—',
      revenue: Number(item.revenue ?? 0),
      profit: Number(item.profit ?? 0),
    }))
  }, [charts, monthFormat])

  const handleTableSort = (sortKey, direction) => {
    setFilters((f) => ({ ...f, sort: sortKey, direction, page: 1 }))
  }

  const columns = useMemo(() => {
    const base = [
      {
        key: '_select',
        label: (
          <input
            type="checkbox"
            checked={allPageSelected}
            onChange={toggleSelectAllPage}
            aria-label={t('shipments.selectAllPage')}
          />
        ),
        sortable: false,
        render: (_, row) => (
          <input
            type="checkbox"
            checked={!!selectedIds[String(row.id)]}
            onChange={() => toggleSelectRow(row.id)}
            aria-label={t('shipments.selectRow')}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        key: 'bl_number',
        sortKey: 'bl',
        label: t('shipments.fields.bl_number'),
        sortable: true,
        render: (v) => v || '—',
      },
      {
        key: 'booking_number',
        label: t('shipments.fields.booking_number'),
        sortable: false,
        render: (v) => v || '—',
      },
      {
        key: 'client',
        sortKey: 'client',
        label: t('shipments.fields.client'),
        sortable: true,
        render: (_, row) => (
          <div className="shipments-client-cell">
            <div className="shipments-client-avatar" aria-hidden>
              {clientInitials(row)}
            </div>
            <span>{clientName(row)}</span>
          </div>
        ),
      },
      {
        key: 'route',
        label: t('shipments.fields.route'),
        sortable: false,
        render: (_, row) => routeLabel(row),
      },
      {
        key: 'line_vendor',
        label: t('shipments.fields.line_vendor'),
        sortable: false,
        render: (_, row) => row.line_vendor?.name ?? '—',
      },
      {
        key: 'status',
        label: t('shipments.fields.status'),
        sortable: false,
        render: (v) => (
          <ShipmentStatusBadge statusOptions={statusOptions} rawStatus={v} lang={i18n.language} t={t} />
        ),
      },
    ]

    base.push({
      key: 'created_at',
      sortKey: 'created_at',
      label: t('shipments.fields.created_at'),
      sortable: true,
      render: (v) => (v ? String(v).slice(0, 10) : '—'),
    })

    base.push({
      key: 'actions',
      label: t('shipments.actions'),
      sortable: false,
      render: (_, row) => {
        const menuItems = [
          {
            id: 'view',
            label: t('shipments.view'),
            icon: <Eye className="h-4 w-4" />,
            onClick: () => {
              setDetailTab('info')
              setDetailId(row.id)
            },
          },
          {
            id: 'track',
            label: t('shipments.track'),
            icon: <MapPin className="h-4 w-4" />,
            onClick: () => {
              setDetailTab('tracking')
              setDetailId(row.id)
            },
          },
        ]
        if (canManageOps) {
          menuItems.push({
            id: 'stage',
            label: t('shipments.stageUpdate'),
            icon: <ClipboardList className="h-4 w-4" />,
            onClick: () => {
              setStageRow(row)
              setStageForm({
                statusKey: row.status ?? '',
                eventDate: new Date().toISOString().slice(0, 10),
                message: '',
              })
            },
          })
        }
        menuItems.push({
          id: 'exportPdf',
          label: pdfExportingId === row.id ? t('shipments.exportPdfLoading') : t('shipments.exportPdf'),
          icon: <FileDown className="h-4 w-4" />,
          disabled: pdfExportingId === row.id,
          onClick: async () => {
            if (!token) return
            setPdfExportingId(row.id)
            try {
              const { blob, filename } = await downloadShipmentPdf(token, row.id)
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = filename
              document.body.appendChild(a)
              a.click()
              a.remove()
              URL.revokeObjectURL(url)
            } catch (e) {
              setAlert({
                type: 'error',
                message: e?.message || t('shipments.exportPdfError'),
              })
            } finally {
              setPdfExportingId(null)
            }
          },
        })
        if (canViewShipmentFinancials) {
          menuItems.push({
            id: 'financials',
            label: t('shipments.financials'),
            icon: <Receipt className="h-4 w-4" />,
            onClick: () => setFinancialRow(row),
          })
        }
        menuItems.push({
          id: 'notes',
          label: t('shipments.notesQuick'),
          icon: <StickyNote className="h-4 w-4" />,
          onClick: () => {
            setDetailTab('notes')
            setDetailId(row.id)
          },
        })
        if (canManageOps) {
          menuItems.push(
            {
              id: 'edit',
              label: t('shipments.edit'),
              icon: <Pencil className="h-4 w-4" />,
              onClick: () => openEdit(row),
            },
            {
              id: 'delete',
              label: t('shipments.delete'),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => setDeleteId(row.id),
            }
          )
        }
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu
              portaled
              align={i18n.language === 'ar' ? 'start' : 'end'}
              className="shipments-row-actions-menu"
              trigger={
                <button
                  type="button"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white p-0 text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
                  title={t('shipments.actions')}
                  aria-label={t('shipments.actions')}
                >
                  <Menu className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              }
              items={menuItems}
            />
          </div>
        )
      },
    })

    return base
  }, [
    t,
    i18n.language,
    canManageOps,
    canViewShipmentFinancials,
    selectedIds,
    allPageSelected,
    statusOptions,
    pdfExportingId,
    token,
    setAlert,
  ])

  const renderShipmentForm = (form, setForm, disabled, isEdit = false) => (
    <div className="clients-form-sections">
      <section className="client-detail-modal__section">
        <h3 className="client-detail-modal__section-title">{t('shipments.createModal.formHeading')}</h3>
        <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field">
            <label htmlFor={isEdit ? 'sh-client-edit' : 'sh-client-create'}>{t('shipments.createModal.clientName')} *</label>
            <select
              id={isEdit ? 'sh-client-edit' : 'sh-client-create'}
              value={form.client_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  client_id: e.target.value,
                  sd_form_id: '',
                }))
              }
              disabled={disabled}
              required
            >
              <option value="">{t('shipments.selectClient')}</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.name || c.id}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('shipments.createModal.clientLinkHint')}</p>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor={isEdit ? 'sh-sd-edit' : 'sh-sd-create'}>{t('shipments.selectSdForm')}</label>
            <select
              id={isEdit ? 'sh-sd-edit' : 'sh-sd-create'}
              value={form.sd_form_id}
              onChange={(e) => {
                const v = e.target.value
                setForm((prev) => {
                  if (!v) return { ...prev, sd_form_id: '' }
                  const sd = sdFormsSortedForClient.find((x) => String(x.id) === String(v))
                  return sd ? mergeShipmentFormFromSd(sd, prev) : { ...prev, sd_form_id: v }
                })
              }}
              disabled={disabled || !numOrUndef(form.client_id) || sdFormsForClientLoading}
            >
              <option value="">
                {!numOrUndef(form.client_id)
                  ? t('shipments.sdFormSelectClientFirst')
                  : sdFormsForClientLoading
                    ? t('shipments.sdFormsLoadingForClient')
                    : t('shipments.sdFormNone')}
              </option>
              {sdFormsSortedForClient.map((sd) => (
                <option key={sd.id} value={sd.id}>
                  {sdFormOptionLabel(sd)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {!numOrUndef(form.client_id)
                ? t('shipments.sdFormHintNeedClient')
                : sdFormsForClientLoading
                  ? t('shipments.sdFormsLoadingForClient')
                  : sdFormsSortedForClient.length === 0
                    ? t('shipments.noSdFormsForClient')
                    : t('shipments.sdFormLinkHint')}
            </p>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-bdate">{t('shipments.fields.booking_date')}</label>
            <input
              id="sh-bdate"
              type="date"
              value={form.booking_date}
              onChange={(e) => setForm((f) => ({ ...f, booking_date: e.target.value }))}
              disabled={disabled}
            />
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
              {t('shipments.dateInputHint')}
            </span>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-booking">{t('shipments.fields.booking_number')}</label>
            <input
              id="sh-booking"
              type="text"
              value={form.booking_number}
              onChange={(e) => setForm((f) => ({ ...f, booking_number: e.target.value }))}
              disabled={disabled}
              placeholder={t('shipments.placeholders.bookingNumber')}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-bl">{t('shipments.fields.bl_number')}</label>
            <input
              id="sh-bl"
              type="text"
              value={form.bl_number}
              onChange={(e) => setForm((f) => ({ ...f, bl_number: e.target.value }))}
              disabled={disabled}
              placeholder={t('shipments.placeholders.blNumber')}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-line">{t('shipments.fields.line_vendor_id')}</label>
            <select
              id="sh-line"
              value={form.line_vendor_id}
              onChange={(e) => setForm((f) => ({ ...f, line_vendor_id: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('shipments.selectShippingLine')}</option>
              {vendorOptions
                .filter(
                  (v) =>
                    v.type === 'shipping_line' ||
                    v.type === 'agent' ||
                    v.type === 'LINE' ||
                    v.type === 'AGENT' ||
                    !v.type ||
                    v.type === ''
                )
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name || v.id}
                  </option>
                ))}
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-mode">{t('shipments.fields.mode')}</label>
            <select
              id="sh-mode"
              value={form.mode}
              onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
              disabled={disabled}
            >
              <option value="Sea">{t('shipments.modeOptions.Sea')}</option>
              <option value="Land">{t('shipments.modeOptions.Land')}</option>
              <option value="Air">{t('shipments.modeOptions.Air')}</option>
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-type">{t('shipments.fields.shipment_type')}</label>
            <select
              id="sh-type"
              value={form.shipment_type}
              onChange={(e) => setForm((f) => ({ ...f, shipment_type: e.target.value }))}
              disabled={disabled}
            >
              <option value="FCL">{t('shipments.shipmentTypeOptions.FCL')}</option>
              <option value="LCL">{t('shipments.shipmentTypeOptions.LCL')}</option>
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-dir">{t('shipments.fields.shipment_direction')}</label>
            <select
              id="sh-dir"
              value={form.shipment_direction}
              onChange={(e) => setForm((f) => ({ ...f, shipment_direction: e.target.value }))}
              disabled={disabled}
            >
              <option value="Export">{t('shipments.directionOption.Export')}</option>
              <option value="Import">{t('shipments.directionOption.Import')}</option>
            </select>
          </div>
          {form.shipment_direction === 'Import' ? (
            <div className="client-detail-modal__form-field">
              <label htmlFor="sh-acid">{t('shipments.fields.acid_number')}</label>
              <input
                id="sh-acid"
                type="text"
                value={form.acid_number}
                onChange={(e) => setForm((f) => ({ ...f, acid_number: e.target.value }))}
                disabled={disabled}
              />
            </div>
          ) : (
            <div className="client-detail-modal__form-field">
              <label htmlFor="sh-ct">{t('shipments.fields.container_type')}</label>
              <select
                id="sh-ct"
                value={form.container_type}
                onChange={(e) => setForm((f) => ({ ...f, container_type: e.target.value }))}
                disabled={disabled}
              >
                <option value="">{t('shipments.optional')}</option>
                {SHIPMENT_CONTAINER_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{t('shipments.fieldHints.containerType')}</span>
            </div>
          )}
          {form.shipment_direction === 'Import' && (
            <div className="client-detail-modal__form-field">
              <label htmlFor="sh-ct">{t('shipments.fields.container_type')}</label>
              <select
                id="sh-ct"
                value={form.container_type}
                onChange={(e) => setForm((f) => ({ ...f, container_type: e.target.value }))}
                disabled={disabled}
              >
                <option value="">{t('shipments.optional')}</option>
                {SHIPMENT_CONTAINER_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
              <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{t('shipments.fieldHints.containerType')}</span>
            </div>
          )}
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-cs">{t('shipments.fields.container_size')}</label>
            <select
              id="sh-cs"
              value={form.container_size}
              onChange={(e) => setForm((f) => ({ ...f, container_size: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('shipments.optional')}</option>
              {SHIPMENT_CONTAINER_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{t('shipments.fieldHints.containerSize')}</span>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-cc">{t('shipments.fields.container_count')}</label>
            <input
              id="sh-cc"
              type="number"
              min={1}
              value={form.container_count}
              onChange={(e) => setForm((f) => ({ ...f, container_count: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-lp">{t('shipments.fields.loading_place')}</label>
            <input
              id="sh-lp"
              type="text"
              list="loading-places"
              value={form.loading_place}
              onChange={(e) => setForm((f) => ({ ...f, loading_place: e.target.value }))}
              disabled={disabled}
              placeholder={t('shipments.placeholders.loadingPlace')}
            />
            <datalist id="loading-places">
              <option value="Factory" />
              <option value="Warehouse" />
              <option value="Port Terminal" />
            </datalist>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-pol">{t('shipments.fields.origin_port_id')}</label>
            <AsyncSelect
              id="sh-pol"
              value={getPortOption(form.origin_port_id)}
              onChange={(opt) => setForm((f) => ({ ...f, origin_port_id: opt?.value || '' }))}
              loadOptions={loadPortOptions}
              onCreate={handleCreatePort}
              placeholder={t('shipments.placeholders.selectPortPol')}
              disabled={disabled}
            />
          </div>
          <div
            className={
              form.shipment_direction === 'Export'
                ? 'client-detail-modal__form-field client-detail-modal__form-field--full'
                : 'client-detail-modal__form-field'
            }
          >
            <label htmlFor="sh-pod">{t('shipments.fields.destination_port_id')}</label>
            <AsyncSelect
              id="sh-pod"
              value={getPortOption(form.destination_port_id)}
              onChange={(opt) => setForm((f) => ({ ...f, destination_port_id: opt?.value || '' }))}
              loadOptions={loadPortOptions}
              onCreate={handleCreatePort}
              placeholder={t('shipments.placeholders.selectPortPodExample')}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-cargo">{t('shipments.fields.cargo_description')}</label>
            <textarea
              id="sh-cargo"
              rows={3}
              className="clients-input min-h-[4.5rem] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={form.cargo_description}
              onChange={(e) => setForm((f) => ({ ...f, cargo_description: e.target.value }))}
              disabled={disabled}
              placeholder={t('shipments.placeholders.cargoDescription')}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-ld">{t('shipments.fields.loading_date')}</label>
            <input
              id="sh-ld"
              type="date"
              value={form.loading_date}
              onChange={(e) => setForm((f) => ({ ...f, loading_date: e.target.value }))}
              disabled={disabled}
            />
            <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
              {t('shipments.dateInputHint')}
            </span>
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="sh-notes">{t('shipments.fields.notes')}</label>
            <textarea
              id="sh-notes"
              rows={3}
              className="clients-input min-h-[4.5rem] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={disabled}
              placeholder={t('shipments.placeholders.notes')}
            />
          </div>
        </div>
      </section>

      <section className="client-detail-modal__section">
        <fieldset className="client-detail-modal__followup-add-fieldset">
          <legend className="client-detail-modal__followup-add-legend">{t('shipments.sections.loadingReefer')}</legend>
          <div className="client-detail-modal__form-grid client-detail-modal__grid--card client-detail-modal__followup-form">
            <div className="client-detail-modal__form-field client-detail-modal__form-field--full client-detail-modal__followup-toggle-wrap">
              <label
                className="client-detail-modal__reminder-mode-option"
                htmlFor={isEdit ? 'sh-reefer-edit' : 'sh-reefer-create'}
              >
                <input
                  id={isEdit ? 'sh-reefer-edit' : 'sh-reefer-create'}
                  type="checkbox"
                  checked={form.is_reefer}
                  onChange={(e) => setForm((f) => ({ ...f, is_reefer: e.target.checked }))}
                  disabled={disabled}
                />
                <span>{t('shipments.fields.is_reefer')}</span>
              </label>
              <p className="client-detail-modal__reminder-before-hint">{t('shipments.reeferToggleHelp')}</p>
            </div>
            {form.is_reefer ? (
              <>
                <div className="client-detail-modal__form-field">
                  <label htmlFor={isEdit ? 'sh-rt-edit' : 'sh-rt-create'}>{t('shipments.fields.reefer_temp')}</label>
                  <input
                    id={isEdit ? 'sh-rt-edit' : 'sh-rt-create'}
                    type="text"
                    value={form.reefer_temp}
                    onChange={(e) => setForm((f) => ({ ...f, reefer_temp: e.target.value }))}
                    disabled={disabled}
                    placeholder={t('shipments.placeholders.reeferTemp')}
                  />
                </div>
                <div className="client-detail-modal__form-field">
                  <label htmlFor={isEdit ? 'sh-rv-edit' : 'sh-rv-create'}>{t('shipments.fields.reefer_vent')}</label>
                  <input
                    id={isEdit ? 'sh-rv-edit' : 'sh-rv-create'}
                    type="text"
                    value={form.reefer_vent}
                    onChange={(e) => setForm((f) => ({ ...f, reefer_vent: e.target.value }))}
                    disabled={disabled}
                    placeholder={t('shipments.placeholders.reeferVent')}
                  />
                </div>
                <div className="client-detail-modal__form-field">
                  <label htmlFor={isEdit ? 'sh-rh-edit' : 'sh-rh-create'}>{t('shipments.fields.reefer_hum')}</label>
                  <input
                    id={isEdit ? 'sh-rh-edit' : 'sh-rh-create'}
                    type="text"
                    value={form.reefer_hum}
                    onChange={(e) => setForm((f) => ({ ...f, reefer_hum: e.target.value }))}
                    disabled={disabled}
                    placeholder={t('shipments.placeholders.reeferHum')}
                  />
                </div>
              </>
            ) : null}
          </div>
        </fieldset>
      </section>
    </div>
  )

  return (
    <Container size="xl">
      <div className="clients-page">
        {pageLoading && (
          <div className="clients-page-loader shipments-no-print" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        {stats && typeof stats === 'object' && (
          <div className="clients-stats-grid shipments-no-print">
            <StatsCard
              title={t('shipments.stats.booked')}
              value={new Intl.NumberFormat(numberLocale).format(stats.booked ?? 0)}
              icon={<Package className="h-6 w-6" />}
              variant="blue"
            />
            <StatsCard
              title={t('shipments.stats.in_transit')}
              value={new Intl.NumberFormat(numberLocale).format(stats.in_transit ?? 0)}
              icon={<Package className="h-6 w-6" />}
              variant="amber"
            />
            <StatsCard
              title={t('shipments.stats.customs_clearance')}
              value={new Intl.NumberFormat(numberLocale).format(stats.customs_clearance ?? 0)}
              icon={<Package className="h-6 w-6" />}
              variant="green"
            />
            <StatsCard
              title={t('shipments.stats.delivered')}
              value={new Intl.NumberFormat(numberLocale).format(stats.delivered ?? 0)}
              icon={<Package className="h-6 w-6" />}
              variant="green"
            />
          </div>
        )}

        <div className="clients-extra-panel clients-charts-panel mb-4 shipments-no-print">
          {charts && (statusDistributionData.length > 0 || monthlyChartData.length > 0) ? (
            <div className="clients-charts-grid shipments-charts-grid">
              {statusDistributionData.length > 0 && (
                <div className="clients-chart-wrap">
                  <DonutChart
                    data={statusDistributionData}
                    nameKey="name"
                    valueKey="count"
                    valueLabel={t('shipments.chartsCount')}
                    title={t('shipments.chartsByStatus')}
                    height={260}
                  />
                </div>
              )}
              {monthlyChartData.length > 0 && (
                <div className="clients-chart-wrap">
                  <BarChart
                    data={monthlyChartData}
                    xKey="monthLabel"
                    yKey="revenue"
                    xLabel={t('shipments.chartsMonth')}
                    yLabel={t('shipments.chartsRevenue')}
                    valueLabel={t('shipments.chartsRevenue')}
                    title={t('shipments.chartsMonthlyRevenue')}
                    height={260}
                    allowDecimals
                  />
                </div>
              )}
              {monthlyChartData.length > 0 && (
                <div className="clients-chart-wrap">
                  <BarChart
                    data={monthlyChartData}
                    xKey="monthLabel"
                    yKey="profit"
                    xLabel={t('shipments.chartsMonth')}
                    yLabel={t('shipments.chartsProfit')}
                    valueLabel={t('shipments.chartsProfit')}
                    title={t('shipments.chartsMonthlyProfit')}
                    height={260}
                    barColor="#22c55e"
                    allowDecimals
                  />
                </div>
              )}
            </div>
          ) : charts ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('shipments.chartsNoData')}</p>
          ) : null}
        </div>

        <div className="clients-filters-card shipments-no-print">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__search-wrap" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
              <Search className="clients-filters__search-icon" aria-hidden />
              <input
                type="search"
                placeholder={t('shipments.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                className="clients-input clients-filters__search"
                aria-label={t('shipments.search')}
              />
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
                    line_vendor_id: '',
                    from: '',
                    to: '',
                    sd_number: '',
                    sort: 'created_at',
                    direction: 'desc',
                    page: 1,
                  }))
                }}
                aria-label={t('shipments.clearFilters')}
                title={t('shipments.clearFilters')}
              >
                <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
              </button>
              <button
                type="button"
                id="shipments-filters-toggle"
                className="clients-filters__sort-toggle clients-filters__btn-icon"
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                aria-controls="shipments-filters-panel"
                title={t('shipments.filtersToggle')}
                aria-label={t('shipments.filtersToggle')}
              >
                <ListFilter className="clients-filters__btn-icon-svg" aria-hidden />
                {showFilters ? (
                  <ChevronUp className="clients-filters__sort-toggle-chevron" aria-hidden />
                ) : (
                  <ChevronDown className="clients-filters__sort-toggle-chevron" aria-hidden />
                )}
              </button>
              <button
                type="button"
                id="shipments-sort-toggle"
                className="clients-filters__sort-toggle clients-filters__btn-icon"
                onClick={() => setShowSort((v) => !v)}
                aria-expanded={showSort}
                aria-controls="shipments-sort-panel"
                title={t('shipments.sortBy')}
              >
                <ArrowUpDown className="clients-filters__btn-icon-svg" aria-hidden />
                {showSort ? (
                  <ChevronUp className="clients-filters__sort-toggle-chevron" aria-hidden />
                ) : (
                  <ChevronDown className="clients-filters__sort-toggle-chevron" aria-hidden />
                )}
              </button>
              <button
                type="button"
                className="clients-filters__btn-icon clients-filters__btn-icon--export"
                onClick={handleExport}
                disabled={exportLoading}
                aria-label={
                  selectedCount > 0 ? t('shipments.bulkExport') : t('pageHeader.export', 'Export')
                }
                title={selectedCount > 0 ? t('shipments.bulkExport') : t('pageHeader.export', 'Export')}
              >
                {exportLoading ? (
                  <span className="clients-filters__export-spinner" aria-hidden />
                ) : (
                  <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
                )}
              </button>
              {canManageOps && (
                <button type="button" className="page-header__btn page-header__btn--primary" onClick={() => setShowCreate(true)}>
                  {t('shipments.create')}
                </button>
              )}
            </div>
          </div>
          <div
            id="shipments-filters-panel"
            className="clients-filters__row clients-filters__row--sort"
            role="region"
            aria-labelledby="shipments-filters-toggle"
            hidden={!showFilters}
          >
            <div className="clients-filters__fields w-full min-w-0">
              <select
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('shipments.filterStatus')}
              >
                <option value="">{t('shipments.statusAll')}</option>
                {statusOptions.map((s) => (
                  <option key={s.id} value={shipmentStatusFilterValue(s)}>
                    {shipmentStatusLocalizedLabel(s, i18n.language)}
                  </option>
                ))}
              </select>
              <select
                value={filters.client_id}
                onChange={(e) => setFilters((f) => ({ ...f, client_id: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('shipments.filterClient')}
              >
                <option value="">{t('shipments.clientAll')}</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || c.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.sales_rep_id}
                onChange={(e) => setFilters((f) => ({ ...f, sales_rep_id: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('shipments.filterSalesRep')}
              >
                <option value="">{t('shipments.salesRepAll')}</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.line_vendor_id}
                onChange={(e) => setFilters((f) => ({ ...f, line_vendor_id: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('shipments.filterLineVendor')}
              >
                <option value="">{t('shipments.lineVendorAll')}</option>
                {vendorOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="clients-input"
                value={filters.from}
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, page: 1 }))}
                aria-label={t('shipments.filterFrom')}
              />
              <input
                type="date"
                className="clients-input"
                value={filters.to}
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value, page: 1 }))}
                aria-label={t('shipments.filterTo')}
              />
              <input
                type="text"
                className="clients-input"
                placeholder={t('shipments.sdNumberPlaceholder')}
                value={filters.sd_number}
                onChange={(e) => setFilters((f) => ({ ...f, sd_number: e.target.value, page: 1 }))}
                aria-label={t('shipments.filterSdNumber')}
              />
            </div>
          </div>
          <div
            id="shipments-sort-panel"
            className="clients-filters__row clients-filters__row--sort"
            role="region"
            aria-labelledby="shipments-sort-toggle"
            hidden={!showSort}
          >
            <div className="clients-filters__sort-group">
              <label className="clients-filters__sort-label" htmlFor="shipments-sort-by">
                {t('shipments.sortBy')}
              </label>
              <select
                id="shipments-sort-by"
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
                className="clients-select"
                aria-label={t('shipments.sortBy')}
              >
                <option value="created_at">{t('shipments.sortCreated')}</option>
                <option value="bl">{t('shipments.sortBl')}</option>
                <option value="client">{t('shipments.sortClient')}</option>
              </select>
              <select
                value={filters.direction}
                onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
                className="clients-select clients-filters__direction"
                aria-label={t('shipments.sortOrder')}
              >
                <option value="asc">{t('shipments.directionAsc')}</option>
                <option value="desc">{t('shipments.directionDesc')}</option>
              </select>
            </div>
          </div>
        </div>

        {alert && <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} className="shipments-no-print" />}

        <div className="shipments-print-root">
          <h1 className="shipments-print-title">{t('shipments.title')}</h1>

          {rows.length === 0 && !loading ? (
            <p className="clients-empty">{t('shipments.empty')}</p>
          ) : (
            <Table
              className="shipments-data-table"
              columns={columns}
              data={rows}
              getRowKey={(r) => r.id}
              emptyMessage={t('shipments.empty')}
              sortKey={filters.sort}
              sortDirection={filters.direction}
              onSort={handleTableSort}
            />
          )}

          {rows.length > 0 && meta.total > 0 && (
            <div className="clients-pagination">
              <div className="clients-pagination__left">
                <span className="clients-pagination__total">
                  {t('shipments.total')}: {meta.total}
                </span>
                <label className="clients-pagination__per-page">
                  <span className="clients-pagination__per-page-label">{t('shipments.perPage')}</span>
                  <select
                    value={filters.per_page}
                    onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
                    className="clients-select clients-pagination__select"
                    aria-label={t('shipments.perPage')}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
              <Pagination
                currentPage={meta.current_page}
                totalPages={Math.max(1, meta.last_page)}
                onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
              />
            </div>
          )}
        </div>

        {showCreate && canManageOps && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="shipment-create-title">
            <div className="client-detail-modal__backdrop" onClick={() => setShowCreate(false)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="shipment-create-title" className="client-detail-modal__title">
                  {t('shipments.create')}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setShowCreate(false)}
                  disabled={createSubmitting}
                  aria-label={t('shipments.close')}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form onSubmit={handleCreateSubmit} className="client-detail-modal__form shipments-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner clients-form-sections">
                    {renderShipmentForm(createForm, setCreateForm, createSubmitting, false)}
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => setShowCreate(false)}
                    disabled={createSubmitting}
                  >
                    {t('shipments.cancel')}
                  </button>
                  <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={createSubmitting}>
                    {createSubmitting ? t('shipments.saving') : t('shipments.createSubmit')}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        <ShipmentDetailModal
          open={!!detailId}
          shipment={detailShipment}
          shipmentLoading={detailLoading}
          detailTab={detailTab}
          onTabChange={setDetailTab}
          statusOptions={statusOptions}
          onClose={() => {
            setDetailId(null)
            setDetailShipment(null)
            setDetailTab('info')
          }}
          onEdit={(s) => {
            openEdit(s)
            setDetailId(null)
            setDetailShipment(null)
          }}
          canManageOps={canManageOps}
          canViewFinancialTotals={canViewShipmentFinancials}
          canViewSelling={canViewSelling}
          isOperations={isOperations}
          isAdminRole={isAdminRole}
          vendorOptions={vendorOptions}
          userOptions={userOptions}
          onOperationsSaved={refreshShipmentDetail}
          opsStatusOptions={opsStatusOptions}
          currentUserId={user?.id ?? null}
          canAddShipmentNote={canManageOps}
          canManageAllShipmentNotes={hasAbility('notes.manage')}
        />

        {stageRow && canManageOps && (
          <div className="client-detail-modal shipments-no-print" role="dialog" aria-modal="true" aria-labelledby="shipment-stage-title">
            <div className="client-detail-modal__backdrop" onClick={() => setStageRow(null)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="shipment-stage-title" className="client-detail-modal__title">
                  {t('shipments.stageModalTitle')}
                </h2>
                <button type="button" className="client-detail-modal__close" onClick={() => setStageRow(null)} aria-label={t('shipments.close')}>
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form onSubmit={handleStageSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner clients-form-sections">
                    <section className="client-detail-modal__section">
                      <div className="client-detail-modal__form-grid">
                    <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                      <label htmlFor="stage-status">{t('shipments.stageNewStatus')}</label>
                      <select
                        id="stage-status"
                        value={stageForm.statusKey}
                        onChange={(e) => setStageForm((f) => ({ ...f, statusKey: e.target.value }))}
                        required
                      >
                        <option value="">{t('shipments.stageSelectStatus')}</option>
                        {statusOptions.map((s) => (
                          <option key={s.id} value={shipmentStatusFilterValue(s)}>
                            {shipmentStatusLocalizedLabel(s, i18n.language)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="client-detail-modal__form-field">
                      <label htmlFor="stage-date">{t('shipments.stageEventDate')}</label>
                      <input
                        id="stage-date"
                        type="date"
                        value={stageForm.eventDate}
                        onChange={(e) => setStageForm((f) => ({ ...f, eventDate: e.target.value }))}
                      />
                    </div>
                    <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                      <label htmlFor="stage-msg">{t('shipments.stageMessage')}</label>
                      <textarea
                        id="stage-msg"
                        rows={3}
                        value={stageForm.message}
                        onChange={(e) => setStageForm((f) => ({ ...f, message: e.target.value }))}
                        placeholder={t('shipments.stageMessagePlaceholder')}
                      />
                    </div>
                      </div>
                    </section>
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setStageRow(null)}>
                    {t('shipments.cancel')}
                  </button>
                  <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={stageSubmitting}>
                    {stageSubmitting ? t('shipments.saving') : t('shipments.save')}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {financialRow && canViewShipmentFinancials && (
          <ShipmentFinancialsModal
            open
            shipment={financialRow}
            expenses={financialRows}
            loading={financialLoading}
            onClose={() => setFinancialRow(null)}
            numberLocale={numberLocale}
            canViewSelling={canViewSelling}
            token={token}
            canManageExpenses={canManageExpenses}
            onExpensesChanged={reloadFinancialExpenses}
            vendors={vendorOptions}
            canManageFinancial={canManageFinancial}
            onShipmentTotalsRefresh={refreshFinancialShipment}
            canNotifySales={canNotifySalesFinancials}
          />
        )}

        {editId && canManageOps && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="shipment-edit-title">
            <div className="client-detail-modal__backdrop" onClick={() => setEditId(null)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="shipment-edit-title" className="client-detail-modal__title">
                  {t('shipments.editTitle')}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setEditId(null)}
                  disabled={editSubmitting}
                  aria-label={t('shipments.close')}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form onSubmit={handleEditSubmit} className="client-detail-modal__form shipments-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner clients-form-sections">
                    {renderShipmentForm(editForm, setEditForm, editSubmitting, true)}
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => setEditId(null)}
                    disabled={editSubmitting}
                  >
                    {t('shipments.cancel')}
                  </button>
                  <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={editSubmitting}>
                    {editSubmitting ? t('shipments.saving') : t('shipments.save')}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {deleteId && canManageOps && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => setDeleteId(null)} />
            <div className="clients-modal-content">
              <h2>{t('shipments.deleteConfirm')}</h2>
              <p>{t('shipments.deleteConfirmMessage')}</p>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setDeleteId(null)} disabled={deleteSubmitting}>
                  {t('shipments.cancel')}
                </button>
                <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteConfirm} disabled={deleteSubmitting}>
                  {deleteSubmitting ? t('shipments.deleting') : t('shipments.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
