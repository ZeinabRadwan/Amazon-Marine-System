import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
} from '../../api/sdForms'
import {
  listShipmentDirections,
  listNotifyPartyModes,
  listFreightTerms,
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
  { value: 'in_progress', labelKey: 'sdForms.statusInProgress' },
  { value: 'completed', labelKey: 'sdForms.statusCompleted' },
  { value: 'cancelled', labelKey: 'sdForms.statusCancelled' },
]

function formatDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return iso
  }
}

function getStatusBadgeClass(status) {
  if (!status) return 'sd-forms-badge--default'
  const s = String(status).toLowerCase()
  if (s === 'draft') return 'sd-forms-badge--draft'
  if (s === 'submitted') return 'sd-forms-badge--submitted'
  if (s === 'sent_to_operations') return 'sd-forms-badge--sent'
  if (s === 'in_progress') return 'sd-forms-badge--progress'
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
    shipment_direction: '',
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

export default function SDForms() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const { isOperations, roleId } = useAuthAccess()
  const isSales = roleId === 3 // SALES
  const isSalesManager = roleId === 2 // SALES_MANAGER
  const isAnySales = isSales || isSalesManager

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    client_id: '',
    sales_rep_id: '',
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
  const [notifyPartyModes, setNotifyPartyModes] = useState([])
  const [freightTerms, setFreightTerms] = useState([])
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

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(emptySdForm)
  const [editLoading, setEditLoading] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [detailId, setDetailId] = useState(null)
  const [detailRecord, setDetailRecord] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

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

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listSDForms(token, {
      search: filters.search || undefined,
      status: filters.status || undefined,
      client_id: filters.client_id || undefined,
      sales_rep_id: filters.sales_rep_id || undefined,
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
      listNotifyPartyModes(token).catch(() => ({ data: [] })),
      listFreightTerms(token).catch(() => ({ data: [] })),
      listContainerTypes(token).catch(() => ({ data: [] })),
      listContainerSizes(token).catch(() => ({ data: [] })),
      listPorts(token).catch(() => ({ data: [] })),
      listShippingLines(token).catch(() => ({ data: [] })),
      listClients(token, { per_page: 100, page: 1 }).catch(() => ({ data: [] })),
      listUsers(token, { per_page: 200 }).catch(() => ({ data: [] })),
    ])
      .then(([dirs, npm, ft, ct, cs, ports, shippingLines, clients, users]) => {
        setShipmentDirections(normalizeListResponse(dirs))
        setNotifyPartyModes(normalizeListResponse(npm))
        setFreightTerms(normalizeListResponse(ft))
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
      const res = await listShippingLines(token, { q, active: true })
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
      const res = await createShippingLine(token, { name, active: true })
      const newLine = res.data ?? res
      const updatedLines = await listShippingLines(token)
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
    setEditId(id)
    setShippingLineAddName('')
    setEditLoading(true)
    setAlert(null)
    getSDForm(token, id)
      .then((d) => {
        const m = d.data ?? d
        setEditForm(modelToForm(m))
      })
      .catch((err) => setAlert({ type: 'error', message: err.message || t('sdForms.errorDetail') }))
      .finally(() => setEditLoading(false))
  }, [token, t])

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

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    await createDraftAndMaybeDownload(false)
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
      setShowCreate(false)
      setCreateForm(initialCreateForm())
      loadList()
      setAlert({ type: 'success', message: t('sdForms.createSuccess') })
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
    if (!String(editForm.shipping_line_id || '').trim() && !String(editForm.shipping_line || '').trim()) {
      setAlert({ type: 'error', message: t('sdForms.errorShippingLineRequired') })
      return
    }
    const savedEditId = editId
    setEditSubmitting(true)
    setAlert(null)
    try {
      await updateSDForm(token, savedEditId, buildPayload(editForm))
      setEditId(null)
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

  const runEmailOps = async (id) => {
    if (!token) return
    setAlert(null)
    try {
      await emailSDFormToOperations(token, id)
      setAlert({ type: 'success', message: t('sdForms.emailOpsSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('sdForms.errorEmailOps') })
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

  const notifyPartyOptions = useMemo(() => {
    const optional = { value: '', label: t('sdForms.form.optional') }
    const labelByKey = {
      same: t('sdForms.form.notifySame'),
      different: t('sdForms.form.notifyDifferent'),
    }
    const fromApi = notifyPartyModes
      .map((m) => {
        const key = String(m.name || '').trim().toLowerCase()
        if (key !== 'same' && key !== 'different') return null
        return { value: key, label: labelByKey[key] }
      })
      .filter(Boolean)
    return [optional, ...fromApi]
  }, [notifyPartyModes, t])

  const freightOptions = useMemo(() => {
    const unset = { value: '', label: t('sdForms.form.freightUnset') }
    const allowed = new Set(['Prepaid', 'Collect'])
    const fromApi = freightTerms
      .map((f) => {
        const n = String(f.name || '').trim()
        if (!allowed.has(n)) return null
        return { value: n, label: n }
      })
      .filter(Boolean)
    return [unset, ...fromApi]
  }, [freightTerms, t])

  const renderCreateFormFields = (form, setForm, disabled) => {
    const showAcid = form.shipment_direction === 'Import'
    const showNotifyDetails = form.notify_party_mode === 'different'
    const showReefer = String(form.container_type || '').trim().toLowerCase() === 'reefer'
    const selectedClient = clientsList.find((c) => String(c.id) === String(form.client_id))
    const clientNamePreview = selectedClient ? (selectedClient.name ?? selectedClient.client_name ?? `#${selectedClient.id}`) : '—'
    const notesHelpText =
      'استخدم هذا الحقل لكتابة أي ملاحظات خاصة بالحجز يجب أن يكون فريق الحجز على علم بها، مثل الشحنات الترانزيت أو أي استثناءات أو تعليمات خاصة بالشحنة'

    return (
      <div className="clients-form-sections sd-create-form" lang="en">
        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">SD Number</h3>
          <p className="sd-form-modal-preview__value">SD-000001</p>
          <p className="sd-form-modal-preview__hint">Auto-generated</p>
          <p className="sd-form-modal-preview__hint" style={{ marginTop: 8 }}>
            Client Name: {clientNamePreview}
          </p>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">
            {t('sdForms.declaration.sections.clientInfo', { lng: 'en' })}
          </h3>
          <div className="client-detail-modal__form-grid">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-client">
                {t('sdForms.form.client', { lng: 'en' })}
              </label>
              <select
                id="sd-c-client"
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                disabled={disabled}
              >
                <option value="">{t('sdForms.form.optional', { lng: 'en' })}</option>
                {clientsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? c.client_name ?? `#${c.id}`}
                  </option>
                ))}
              </select>
            </div>
            {!isAnySales && (
              <div className="client-detail-modal__form-field">
                <label htmlFor="sd-c-rep">
                  {t('sdForms.form.salesRep', { lng: 'en' })}
                </label>
                <select
                  id="sd-c-rep"
                  value={form.sales_rep_id}
                  onChange={(e) => setForm((f) => ({ ...f, sales_rep_id: e.target.value }))}
                  disabled={disabled}
                >
                  <option value="">{t('sdForms.form.defaultCurrentUser', { lng: 'en' })}</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email ?? `#${u.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">1. Shipment Basic Information</h3>
          <div className="client-detail-modal__form-grid">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-pol">1. Port of Loading (POL)</label>
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
              <label htmlFor="sd-c-pod">2. Port of Discharge (POD)</label>
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
                3. Final Destination
              </label>
              <input
                id="sd-c-fdest"
                type="text"
                placeholder="Final destination if different from POD"
                value={form.final_destination}
                onChange={(e) => setForm((f) => ({ ...f, final_destination: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-sline">5. Shipping Line (Required)</label>
              <AsyncSelect
                id="sd-c-sline"
                value={getShippingLineOption(form.shipping_line_id, form.shipping_line)}
                onChange={(opt) => setForm((f) => ({ 
                  ...f, 
                  shipping_line_id: opt?.value || '',
                  shipping_line: opt?.label || ''
                }))}
                loadOptions={loadShippingLineOptions}
                onCreate={handleCreateShippingLine}
                placeholder="Select or create shipping line"
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-dir">
                4. Shipment Direction
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
                <option value="Export">Export</option>
                <option value="Import">Import</option>
              </select>
            </div>
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">2. Parties Information</h3>
          <div className="client-detail-modal__form-grid">
            <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
              <label htmlFor="sd-c-shipper">
                5. Shipper Information
              </label>
              <textarea
                id="sd-c-shipper"
                placeholder="Full shipper details"
                value={form.shipper_info}
                onChange={(e) => setForm((f) => ({ ...f, shipper_info: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
              <label htmlFor="sd-c-consignee">
                6. Consignee Information
              </label>
              <textarea
                id="sd-c-consignee"
                placeholder="Full consignee details"
                value={form.consignee_info}
                onChange={(e) => setForm((f) => ({ ...f, consignee_info: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-npm">
                7. Notify Party
              </label>
              <select
                id="sd-c-npm"
                value={form.notify_party_mode}
                onChange={(e) => setForm((f) => ({ ...f, notify_party_mode: e.target.value }))}
                disabled={disabled}
              >
                <option value="">Select</option>
                <option value="same">Same as Consignee</option>
                <option value="different">Different</option>
              </select>
            </div>
            {showNotifyDetails ? (
              <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                <label htmlFor="sd-c-npd">
                  Notify party details
                </label>
                <textarea
                  id="sd-c-npd"
                  placeholder="Notify party name and address"
                  value={form.notify_party_details}
                  onChange={(e) => setForm((f) => ({ ...f, notify_party_details: e.target.value }))}
                  disabled={disabled}
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">3. Freight & Payment</h3>
          <div className="client-detail-modal__form-grid">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-ft">
                9. Freight Term
              </label>
              <select
                id="sd-c-ft"
                value={form.freight_term}
                onChange={(e) => setForm((f) => ({ ...f, freight_term: e.target.value }))}
                disabled={disabled}
              >
                <option value="">Select</option>
                <option value="Prepaid">Prepaid</option>
                <option value="Collect">Collect</option>
              </select>
            </div>
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">4. Container Details</h3>
          <div className="client-detail-modal__form-grid">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-ctype">
                10. Container Type
              </label>
              <select
                id="sd-c-ctype"
                value={form.container_type}
                onChange={(e) => setForm((f) => ({ ...f, container_type: e.target.value }))}
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
                11. Container Size
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
                12. Number of Containers
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

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">5. Shipment Details</h3>
          <div className="client-detail-modal__form-grid">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-rvd">
                13. Requested Vessel Date
              </label>
              <input
                id="sd-c-rvd"
                type="date"
                lang="en-GB"
                value={form.requested_vessel_date}
                onChange={(e) => setForm((f) => ({ ...f, requested_vessel_date: e.target.value }))}
                disabled={disabled}
              />
            </div>
            {showAcid ? (
              <div className="client-detail-modal__form-field">
                <label htmlFor="sd-c-acid">
                  14. ACID Number
                </label>
                <input
                  id="sd-c-acid"
                  type="text"
                  value={form.acid_number}
                  onChange={(e) => setForm((f) => ({ ...f, acid_number: e.target.value }))}
                  disabled={disabled}
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">6. Cargo Information</h3>
          <div className="client-detail-modal__form-grid">
            <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
              <label htmlFor="sd-c-cargo">
                15. Cargo Description
              </label>
              <textarea
                id="sd-c-cargo"
                placeholder="Cargo description"
                value={form.cargo_description}
                onChange={(e) => setForm((f) => ({ ...f, cargo_description: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-hs">
                16. HS Code
              </label>
              <input
                id="sd-c-hs"
                type="text"
                placeholder="e.g. 5208.11"
                value={form.hs_code}
                onChange={(e) => setForm((f) => ({ ...f, hs_code: e.target.value }))}
                disabled={disabled}
              />
            </div>
          </div>
        </section>

        {showReefer ? (
          <section className="client-detail-modal__section">
            <h3 className="client-detail-modal__section-title">7. Reefer Details</h3>
            <div className="client-detail-modal__form-grid">
              <div className="client-detail-modal__form-field">
                <label htmlFor="sd-c-rt">
                  17. Temperature (Temp)
                </label>
                <input
                  id="sd-c-rt"
                  type="text"
                  value={form.reefer_temp}
                  onChange={(e) => setForm((f) => ({ ...f, reefer_temp: e.target.value }))}
                  disabled={disabled}
                />
              </div>
              <div className="client-detail-modal__form-field">
                <label htmlFor="sd-c-rv">
                  18. Ventilation (Vent)
                </label>
                <input
                  id="sd-c-rv"
                  type="text"
                  value={form.reefer_vent}
                  onChange={(e) => setForm((f) => ({ ...f, reefer_vent: e.target.value }))}
                  disabled={disabled}
                />
              </div>
              <div className="client-detail-modal__form-field">
                <label htmlFor="sd-c-rh">
                  19. Humidity (Hum)
                </label>
                <input
                  id="sd-c-rh"
                  type="text"
                  value={form.reefer_hum}
                  onChange={(e) => setForm((f) => ({ ...f, reefer_hum: e.target.value }))}
                  disabled={disabled}
                />
              </div>
            </div>
          </section>
        ) : null}

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">8. Weight Details</h3>
          <div className="client-detail-modal__form-grid">
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-c-gw">
                20. Total Gross Weight (KG)
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
                21. Total Net Weight (KG)
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

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title flex items-center gap-2">
            {t('sdForms.declaration.sections.notes', { lng: 'en' })}
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

  const renderFormFields = (form, setForm, disabled) => {
    const showAcid = form.shipment_direction === 'Import'
    const showNotifyDetails = form.notify_party_mode === 'different'
    const showReefer = String(form.container_type || '').trim().toLowerCase() === 'reefer'
    const selectedClient = clientsList.find((c) => String(c.id) === String(form.client_id))
    const clientNamePreview = selectedClient ? (selectedClient.name ?? selectedClient.client_name ?? `#${selectedClient.id}`) : '—'
    const notesHelpText =
      'استخدم هذا الحقل لكتابة أي ملاحظات خاصة بالحجز يجب أن يكون فريق الحجز على علم بها، مثل الشحنات الترانزيت أو أي استثناءات أو تعليمات خاصة بالشحنة'

    return (
      <div className="clients-form-sections sd-create-form" lang="en">
        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">{t('sdForms.modal.formDetails', { lng: 'en' })}</h3>
          <p className="sd-form-modal-preview__hint" style={{ marginBottom: 12 }}>
            Client Name: {clientNamePreview}
          </p>
          <div className="client-detail-modal__form-grid mb-4">
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-client">
              {t('sdForms.form.client')}
            </label>
            <select
              id="sd-f-client"
              value={form.client_id}
              onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('sdForms.form.optional')}</option>
              {clientsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.client_name ?? `#${c.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-rep">
              {t('sdForms.form.salesRep')}
            </label>
            <select
              id="sd-f-rep"
              value={form.sales_rep_id}
              onChange={(e) => setForm((f) => ({ ...f, sales_rep_id: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('sdForms.form.defaultCurrentUser')}</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email ?? `#${u.id}`}
                </option>
              ))}
            </select>
          </div>
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">1. Shipment Basic Information</h3>
          <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-pol">1. Port of Loading (POL)</label>
            <AsyncSelect
              id="sd-f-pol"
              value={getPortOption(form.pol_id)}
              onChange={(opt) => setForm((f) => ({ ...f, pol_id: opt?.value || '' }))}
              loadOptions={loadPortOptions}
              onCreate={handleCreatePort}
              placeholder={t('sdForms.form.optional')}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-pod">2. Port of Discharge (POD)</label>
            <AsyncSelect
              id="sd-f-pod"
              value={getPortOption(form.pod_id)}
              onChange={(opt) => setForm((f) => ({ ...f, pod_id: opt?.value || '' }))}
              loadOptions={loadPortOptions}
              onCreate={handleCreatePort}
              placeholder={t('sdForms.form.optional')}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-fdest">
              3. Final Destination
            </label>
            <input
              id="sd-f-fdest"
              type="text"
              value={form.final_destination}
              onChange={(e) => setForm((f) => ({ ...f, final_destination: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-dir">
              4. Shipment Direction
            </label>
            <select
              id="sd-f-dir"
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
              {shipmentDirOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="sd-f-shipping-line">5. Shipping Line (Required)</label>
            <AsyncSelect
              id="sd-f-shipping-line"
              value={getShippingLineOption(form.shipping_line_id, form.shipping_line)}
              onChange={(opt) => setForm((f) => ({ 
                ...f, 
                shipping_line_id: opt?.value || '',
                shipping_line: opt?.label || ''
              }))}
              loadOptions={loadShippingLineOptions}
              onCreate={handleCreateShippingLine}
              placeholder="Select or create shipping line"
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="sd-f-poltxt">
              {t('sdForms.form.polText', { lng: 'en' })}
            </label>
            <input
              id="sd-f-poltxt"
              type="text"
              value={form.pol_text}
              onChange={(e) => setForm((f) => ({ ...f, pol_text: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="sd-f-podtxt">
              {t('sdForms.form.podText', { lng: 'en' })}
            </label>
            <input
              id="sd-f-podtxt"
              type="text"
              value={form.pod_text}
              onChange={(e) => setForm((f) => ({ ...f, pod_text: e.target.value }))}
              disabled={disabled}
            />
          </div>
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">2. Parties Information</h3>
          <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="sd-f-shipper">
              5. Shipper Information
            </label>
            <textarea
              id="sd-f-shipper"
              value={form.shipper_info}
              onChange={(e) => setForm((f) => ({ ...f, shipper_info: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="sd-f-consignee">
              6. Consignee Information
            </label>
            <textarea
              id="sd-f-consignee"
              value={form.consignee_info}
              onChange={(e) => setForm((f) => ({ ...f, consignee_info: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-npm">
              7. Notify Party
            </label>
            <select
              id="sd-f-npm"
              value={form.notify_party_mode}
              onChange={(e) => setForm((f) => ({ ...f, notify_party_mode: e.target.value }))}
              disabled={disabled}
            >
              {notifyPartyOptions.map((o) => (
                <option key={o.value || 'unset'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {showNotifyDetails ? (
            <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
              <label htmlFor="sd-f-npd">
                Notify party details
              </label>
              <textarea
                id="sd-f-npd"
                value={form.notify_party_details}
                onChange={(e) => setForm((f) => ({ ...f, notify_party_details: e.target.value }))}
                disabled={disabled}
              />
            </div>
          ) : null}
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">3. Freight & Payment</h3>
          <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-ft">
              9. Freight Term
            </label>
            <select
              id="sd-f-ft"
              value={form.freight_term}
              onChange={(e) => setForm((f) => ({ ...f, freight_term: e.target.value }))}
              disabled={disabled}
            >
              {freightOptions.map((o) => (
                <option key={o.value || 'unset'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">4. Container Details</h3>
          <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-ctype">
              10. Container Type
            </label>
            <select
              id="sd-f-ctype"
              value={form.container_type}
              onChange={(e) => setForm((f) => ({ ...f, container_type: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('sdForms.form.optional')}</option>
              {containerTypesList.map((ct) => (
                <option key={ct.id} value={ct.name}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-csize">
              11. Container Size
            </label>
            <select
              id="sd-f-csize"
              value={form.container_size}
              onChange={(e) => setForm((f) => ({ ...f, container_size: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('sdForms.form.optional')}</option>
              {containerSizesList.map((cs) => (
                <option key={cs.id} value={cs.name}>
                  {cs.name}
                </option>
              ))}
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-numc">
              12. Number of Containers
            </label>
            <input
              id="sd-f-numc"
              type="number"
              min={1}
              value={form.num_containers}
              onChange={(e) => setForm((f) => ({ ...f, num_containers: e.target.value }))}
              disabled={disabled}
            />
          </div>
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">5. Shipment Details</h3>
          <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-rvd">
              13. Requested Vessel Date
            </label>
            <input
              id="sd-f-rvd"
              type="date"
              lang="en-GB"
              value={form.requested_vessel_date}
              onChange={(e) => setForm((f) => ({ ...f, requested_vessel_date: e.target.value }))}
              disabled={disabled}
            />
          </div>
          {showAcid ? (
            <div className="client-detail-modal__form-field">
              <label htmlFor="sd-f-acid">
                14. ACID Number
              </label>
              <input
                id="sd-f-acid"
                type="text"
                value={form.acid_number}
                onChange={(e) => setForm((f) => ({ ...f, acid_number: e.target.value }))}
                disabled={disabled}
              />
            </div>
          ) : null}
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">6. Cargo Information</h3>
          <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="sd-f-cargo">
              15. Cargo Description
            </label>
            <textarea
              id="sd-f-cargo"
              value={form.cargo_description}
              onChange={(e) => setForm((f) => ({ ...f, cargo_description: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-hs">
              16. HS Code
            </label>
            <input
              id="sd-f-hs"
              type="text"
              value={form.hs_code}
              onChange={(e) => setForm((f) => ({ ...f, hs_code: e.target.value }))}
              disabled={disabled}
            />
          </div>
          </div>
        </section>

        {showReefer ? (
          <section className="client-detail-modal__section">
            <h3 className="client-detail-modal__section-title">7. Reefer Details</h3>
            <div className="client-detail-modal__form-grid">
              <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-rt">
                  17. Temperature (Temp)
            </label>
            <input
              id="sd-f-rt"
              type="text"
              value={form.reefer_temp}
              onChange={(e) => setForm((f) => ({ ...f, reefer_temp: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-rv">
                  18. Ventilation (Vent)
            </label>
            <input
              id="sd-f-rv"
              type="text"
              value={form.reefer_vent}
              onChange={(e) => setForm((f) => ({ ...f, reefer_vent: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-rh">
                  19. Humidity (Hum)
            </label>
            <input
              id="sd-f-rh"
              type="text"
              value={form.reefer_hum}
              onChange={(e) => setForm((f) => ({ ...f, reefer_hum: e.target.value }))}
              disabled={disabled}
            />
          </div>
            </div>
          </section>
        ) : null}

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title">8. Weight Details</h3>
          <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-gw">
              20. Total Gross Weight (KG)
            </label>
            <input
              id="sd-f-gw"
              type="number"
              min={0}
              step="0.01"
              value={form.total_gross_weight}
              onChange={(e) => setForm((f) => ({ ...f, total_gross_weight: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sd-f-nw">
              21. Total Net Weight (KG)
            </label>
            <input
              id="sd-f-nw"
              type="number"
              min={0}
              step="0.01"
              value={form.total_net_weight}
              onChange={(e) => setForm((f) => ({ ...f, total_net_weight: e.target.value }))}
              disabled={disabled}
            />
          </div>
          </div>
        </section>

        <section className="client-detail-modal__section">
          <h3 className="client-detail-modal__section-title flex items-center gap-2">
            {t('sdForms.declaration.sections.notes', { lng: 'en' })}
            <span className="help-icon-wrapper">
              <HelpCircle className="h-4 w-4 text-gray-400" />
              <div className="help-icon-tooltip">
                {notesHelpText}
              </div>
            </span>
          </h3>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <textarea
              id="sd-f-notes"
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

  const monthFormat = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })

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
        render: (_, r) => (
          <span className={`sd-forms-badge ${getStatusBadgeClass(r.status)}`}>
            {t(`sdForms.status.${r.status}`, r.status)}
          </span>
        ),
      },
      { key: 'sales_rep_name', label: t('sdForms.salesRep'), render: (_, r) => r.sales_rep_name ?? '—' },
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
            <IconActionButton icon={<Pencil className="h-4 w-4" />} label={t('sdForms.edit')} onClick={() => openEdit(r.id)} />
            <IconActionButton
              icon={<Trash2 className="h-4 w-4" />}
              label={t('sdForms.delete')}
              variant="danger"
              onClick={() => setDeleteId(r.id)}
            />
          </div>
        ),
      },
    ],
    [t, selectedIds, allPageSelected, toggleSelectAllPage, toggleSelectRow, openDetail, openEdit, downloadPdf]
  )

  const detail = detailRecord

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
              <button
                type="button"
                className="page-header__btn page-header__btn--primary"
                onClick={() => {
                  setCreateForm(initialCreateForm())
                  setShippingLineAddName('')
                  setShowCreate(true)
                }}
              >
                {t('sdForms.newForm')}
              </button>
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
            <div className="client-detail-modal__backdrop" onClick={() => !createSubmitting && setShowCreate(false)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="sd-create-title" className="client-detail-modal__title">
                  Create SD Form
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setShowCreate(false)}
                  disabled={createSubmitting}
                  aria-label="Close"
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form onSubmit={handleCreateSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">
                    {renderCreateFormFields(createForm, setCreateForm, createSubmitting)}
                  </div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setShowCreate(false)} disabled={createSubmitting}>
                    Cancel
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
            <div className="client-detail-modal__backdrop" onClick={() => !editSubmitting && setEditId(null)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="sd-edit-title" className="client-detail-modal__title">
                  {t('sdForms.editTitle')}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setEditId(null)}
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
                    <div className="client-detail-modal__body-inner">{renderFormFields(editForm, setEditForm, editSubmitting)}</div>
                  </div>
                  <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                    <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={() => setEditId(null)} disabled={editSubmitting}>
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
                          {detail.status === 'draft' && (
                            <button
                              type="button"
                              className="clients-btn clients-btn--primary inline-flex items-center gap-1 text-xs"
                              onClick={() => openSubmitModal(detail.id, detail)}
                            >
                              <Send className="h-4 w-4" aria-hidden />
                              {t('sdForms.submit')}
                            </button>
                          )}
                          {detail.status === 'submitted' && !isOperations && (
                            <button type="button" className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs" onClick={() => runSendOps(detail.id)}>
                              <Send className="h-4 w-4" aria-hidden />
                              {t('sdForms.sendOps')}
                            </button>
                          )}
                          {!isOperations && (
                            <button type="button" className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs" onClick={() => runEmailOps(detail.id)}>
                              <Mail className="h-4 w-4" aria-hidden />
                              {t('sdForms.emailOps')}
                            </button>
                          )}
                          <button type="button" className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs" onClick={() => openLinkModal(detail.id)}>
                            <Link2 className="h-4 w-4" aria-hidden />
                            {t('sdForms.linkShipment')}
                          </button>
                          <button type="button" className="clients-btn clients-btn--secondary inline-flex items-center gap-1 text-xs" onClick={() => openEdit(detail.id)}>
                            <Pencil className="h-4 w-4" aria-hidden />
                            {t('sdForms.edit')}
                          </button>
                        </div>
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
      </div>
    </Container>
  )
}
