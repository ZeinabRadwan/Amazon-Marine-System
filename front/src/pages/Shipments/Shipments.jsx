import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { getStoredToken } from '../Login'
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
} from '../../api/shipments'
import { listShipmentExpenses } from '../../api/expenses'
import { listClients } from '../../api/clients'
import { listUsers } from '../../api/users'
import { listVendors } from '../../api/vendors'
import { listPorts } from '../../api/ports'
import { listShipmentStatuses } from '../../api/settings'
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
  Printer,
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
import {
  findShipmentStatusOption,
  shipmentStatusFilterValue,
  shipmentStatusLegacyLabel,
  shipmentStatusLocalizedLabel,
} from '../../utils/shipmentStatusHelpers'

function getMonthFormat(locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })
}

const defaultCreateForm = () => ({
  client_id: '',
  sd_form_id: '',
  sales_rep_id: '',
  line_vendor_id: '',
  origin_port_id: '',
  destination_port_id: '',
  booking_number: '',
  shipment_direction: 'Export',
  mode: 'Sea',
  shipment_type: 'FCL',
  status: '',
  operations_status: '',
  container_count: '',
  container_size: '',
  container_type: '',
  loading_place: '',
  loading_date: '',
  cargo_description: '',
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

function buildCreatePayload(form) {
  const body = {}
  const cid = numOrUndef(form.client_id)
  if (cid != null) body.client_id = cid
  const sd = numOrUndef(form.sd_form_id)
  if (sd != null) body.sd_form_id = sd
  const sr = numOrUndef(form.sales_rep_id)
  if (sr != null) body.sales_rep_id = sr
  const lv = numOrUndef(form.line_vendor_id)
  if (lv != null) body.line_vendor_id = lv
  const op = numOrUndef(form.origin_port_id)
  if (op != null) body.origin_port_id = op
  const dp = numOrUndef(form.destination_port_id)
  if (dp != null) body.destination_port_id = dp
  if (form.booking_number?.trim()) body.booking_number = form.booking_number.trim()
  if (form.shipment_direction) body.shipment_direction = form.shipment_direction
  if (form.mode) body.mode = form.mode
  if (form.shipment_type) body.shipment_type = form.shipment_type
  if (form.status?.trim()) body.status = form.status.trim()
  const os = numOrUndef(form.operations_status)
  if (os != null) body.operations_status = os
  const cc = numOrUndef(form.container_count)
  if (cc != null) body.container_count = cc
  if (form.container_size?.trim()) body.container_size = form.container_size.trim()
  if (form.container_type?.trim()) body.container_type = form.container_type.trim()
  if (form.loading_place?.trim()) body.loading_place = form.loading_place.trim()
  if (form.loading_date?.trim()) body.loading_date = form.loading_date.trim()
  if (form.cargo_description?.trim()) body.cargo_description = form.cargo_description.trim()
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

function buildUpdatePayload(form) {
  return {
    bl_number: form.bl_number?.trim() || null,
    booking_number: form.booking_number?.trim() || null,
    status: form.status?.trim() || undefined,
    operations_status: numOrUndef(form.operations_status),
    loading_place: form.loading_place?.trim() || null,
    loading_date: form.loading_date?.trim() || null,
    is_reefer: !!form.is_reefer,
    reefer_temp: form.reefer_temp?.trim() || null,
    reefer_vent: form.reefer_vent?.trim() || null,
    reefer_hum: form.reefer_hum?.trim() || null,
  }
}

function userHasAdminRole(user) {
  const roles = user?.roles
  if (!Array.isArray(roles)) return false
  return roles.some((r) => {
    const name = typeof r === 'string' ? r : r?.name
    return String(name || '').toLowerCase() === 'admin'
  })
}

export default function Shipments() {
  const { t, i18n } = useTranslation()
  const { permissions = [], user } = useOutletContext() || {}
  const isAdminRole = userHasAdminRole(user)
  const canManageOps = isAdminRole || (Array.isArray(permissions) && permissions.includes('shipments.manage_ops'))
  const canViewAccounting = isAdminRole || (Array.isArray(permissions) && permissions.includes('accounting.view'))
  const canViewFinancial = isAdminRole || (Array.isArray(permissions) && permissions.includes('financial.view'))
  const canViewShipmentFinancials = canViewAccounting || canViewFinancial
  const canManageFinancial =
    isAdminRole ||
    (Array.isArray(permissions) &&
      (permissions.includes('financial.manage') || permissions.includes('accounting.manage')))
  const canViewSelling =
    isAdminRole ||
    (Array.isArray(permissions) &&
      (permissions.includes('accounting.view') || permissions.includes('pricing.view_client_pricing')))
  const canManageExpenses = isAdminRole || (Array.isArray(permissions) && permissions.includes('accounting.manage'))
  const canNotifySalesFinancials = canManageOps || canManageExpenses || canManageFinancial

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
    operations_status: '',
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
  const [selectedIds, setSelectedIds] = useState({})

  const [clientOptions, setClientOptions] = useState([])
  const [userOptions, setUserOptions] = useState([])
  const [vendorOptions, setVendorOptions] = useState([])
  const [portOptions, setPortOptions] = useState([])
  const [statusOptions, setStatusOptions] = useState([])

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(defaultCreateForm())
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [detailId, setDetailId] = useState(null)
  const [detailShipment, setDetailShipment] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('info')

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({
    bl_number: '',
    booking_number: '',
    status: '',
    operations_status: '',
    loading_place: '',
    loading_date: '',
    is_reefer: false,
    reefer_temp: '',
    reefer_vent: '',
    reefer_hum: '',
  })
  const [editSubmitting, setEditSubmitting] = useState(false)

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
      operations_status: filters.operations_status || undefined,
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
        const d = res.data ?? res
        setFinancialRow((prev) => (prev && prev.id === d.id ? { ...prev, ...d } : prev))
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
    Promise.all([
      listClients(token, { per_page: 500 }).catch(() => ({})),
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
      setStatusOptions(Array.isArray(statuses) ? statuses : [])
    })
  }, [token])

  useEffect(() => {
    setFilters((f) => ({ ...f, page: 1 }))
  }, [
    filters.search,
    filters.status,
    filters.operations_status,
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

  useEffect(() => {
    if (!detailId || !token) {
      setDetailShipment(null)
      return
    }
    setDetailLoading(true)
    getShipment(token, detailId)
      .then((data) => setDetailShipment(data.data ?? data))
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
      bl_number: row.bl_number ?? '',
      booking_number: row.booking_number ?? '',
      status: row.status ?? '',
      operations_status: row.operations_status != null ? String(row.operations_status) : '',
      loading_place: row.loading_place ?? '',
      loading_date: row.loading_date ? String(row.loading_date).slice(0, 10) : '',
      is_reefer: !!row.is_reefer,
      reefer_temp: row.reefer_temp ?? '',
      reefer_vent: row.reefer_vent ?? '',
      reefer_hum: row.reefer_hum ?? '',
    })
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!canManageOps) return
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
  const selectedCount = useMemo(() => Object.keys(selectedIds).filter((k) => selectedIds[k]).length, [selectedIds])

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
      {
        key: 'operations_status',
        label: t('shipments.fields.operations_status'),
        sortable: false,
        render: (v) => (v != null ? String(v) : '—'),
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
          id: 'print',
          label: t('shipments.print'),
          icon: <Printer className="h-4 w-4" />,
          onClick: () => window.print(),
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
  ])

  const renderCreateForm = (form, setForm, disabled) => (
    <div className="clients-form-sections">
      <section className="client-detail-modal__section">
        <h3 className="client-detail-modal__section-title">{t('shipments.sections.main')}</h3>
        <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="sh-client">{t('shipments.fields.client')} *</label>
            <select
              id="sh-client"
              value={form.client_id}
              onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
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
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-sd">{t('shipments.fields.sd_form_id')}</label>
            <input
              id="sh-sd"
              type="number"
              min={1}
              value={form.sd_form_id}
              onChange={(e) => setForm((f) => ({ ...f, sd_form_id: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-sales">{t('shipments.fields.sales_rep_id')}</label>
            <select
              id="sh-sales"
              value={form.sales_rep_id}
              onChange={(e) => setForm((f) => ({ ...f, sales_rep_id: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('shipments.optional')}</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email || u.id}
                </option>
              ))}
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-line">{t('shipments.fields.line_vendor')}</label>
            <select
              id="sh-line"
              value={form.line_vendor_id}
              onChange={(e) => setForm((f) => ({ ...f, line_vendor_id: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('shipments.optional')}</option>
              {vendorOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || v.id}
                </option>
              ))}
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-pol">{t('shipments.fields.origin_port_id')}</label>
            <select
              id="sh-pol"
              value={form.origin_port_id}
              onChange={(e) => setForm((f) => ({ ...f, origin_port_id: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('shipments.optional')}</option>
              {portOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.code || p.id}
                </option>
              ))}
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-pod">{t('shipments.fields.destination_port_id')}</label>
            <select
              id="sh-pod"
              value={form.destination_port_id}
              onChange={(e) => setForm((f) => ({ ...f, destination_port_id: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('shipments.optional')}</option>
              {portOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.code || p.id}
                </option>
              ))}
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-booking">{t('shipments.fields.booking_number')}</label>
            <input
              id="sh-booking"
              type="text"
              value={form.booking_number}
              onChange={(e) => setForm((f) => ({ ...f, booking_number: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-dir">{t('shipments.fields.shipment_direction')}</label>
            <select
              id="sh-dir"
              value={form.shipment_direction}
              onChange={(e) => setForm((f) => ({ ...f, shipment_direction: e.target.value }))}
              disabled={disabled}
            >
              <option value="Export">Export</option>
              <option value="Import">Import</option>
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
              <option value="Sea">Sea</option>
              <option value="Air">Air</option>
              <option value="Land">Land</option>
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
              <option value="FCL">FCL</option>
              <option value="LCL">LCL</option>
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-status">{t('shipments.fields.status')}</label>
            <input
              id="sh-status"
              type="text"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              disabled={disabled}
              placeholder={t('shipments.statusPlaceholder')}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-ops">{t('shipments.fields.operations_status')}</label>
            <select
              id="sh-ops"
              value={form.operations_status}
              onChange={(e) => setForm((f) => ({ ...f, operations_status: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('shipments.optional')}</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section className="client-detail-modal__section">
        <h3 className="client-detail-modal__section-title">{t('shipments.sections.cargoLoading')}</h3>
        <div className="client-detail-modal__form-grid">
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
            <label htmlFor="sh-cs">{t('shipments.fields.container_size')}</label>
            <input
              id="sh-cs"
              type="text"
              value={form.container_size}
              onChange={(e) => setForm((f) => ({ ...f, container_size: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="sh-ct">{t('shipments.fields.container_type')}</label>
            <input
              id="sh-ct"
              type="text"
              value={form.container_type}
              onChange={(e) => setForm((f) => ({ ...f, container_type: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="sh-lp">{t('shipments.fields.loading_place')}</label>
            <input
              id="sh-lp"
              type="text"
              value={form.loading_place}
              onChange={(e) => setForm((f) => ({ ...f, loading_place: e.target.value }))}
              disabled={disabled}
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
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="sh-cargo">{t('shipments.fields.cargo_description')}</label>
            <textarea
              id="sh-cargo"
              rows={2}
              value={form.cargo_description}
              onChange={(e) => setForm((f) => ({ ...f, cargo_description: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label className="client-detail-modal__checkbox-label">
              <input
                type="checkbox"
                checked={form.is_reefer}
                onChange={(e) => setForm((f) => ({ ...f, is_reefer: e.target.checked }))}
                disabled={disabled}
              />
              {t('shipments.fields.is_reefer')}
            </label>
          </div>
          {form.is_reefer && (
            <>
              <div className="client-detail-modal__form-field">
                <label htmlFor="sh-rt">{t('shipments.fields.reefer_temp')}</label>
                <input
                  id="sh-rt"
                  type="text"
                  value={form.reefer_temp}
                  onChange={(e) => setForm((f) => ({ ...f, reefer_temp: e.target.value }))}
                  disabled={disabled}
                />
              </div>
              <div className="client-detail-modal__form-field">
                <label htmlFor="sh-rv">{t('shipments.fields.reefer_vent')}</label>
                <input
                  id="sh-rv"
                  type="text"
                  value={form.reefer_vent}
                  onChange={(e) => setForm((f) => ({ ...f, reefer_vent: e.target.value }))}
                  disabled={disabled}
                />
              </div>
              <div className="client-detail-modal__form-field">
                <label htmlFor="sh-rh">{t('shipments.fields.reefer_hum')}</label>
                <input
                  id="sh-rh"
                  type="text"
                  value={form.reefer_hum}
                  onChange={(e) => setForm((f) => ({ ...f, reefer_hum: e.target.value }))}
                  disabled={disabled}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )

  const renderEditForm = (form, setForm, disabled) => (
    <div className="clients-form-sections">
      <section className="client-detail-modal__section">
        <h3 className="client-detail-modal__section-title">{t('shipments.sections.main')}</h3>
        <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field">
            <label htmlFor="ed-bl">{t('shipments.fields.bl_number')}</label>
            <input
              id="ed-bl"
              type="text"
              value={form.bl_number}
              onChange={(e) => setForm((f) => ({ ...f, bl_number: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="ed-bk">{t('shipments.fields.booking_number')}</label>
            <input
              id="ed-bk"
              type="text"
              value={form.booking_number}
              onChange={(e) => setForm((f) => ({ ...f, booking_number: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="ed-st">{t('shipments.fields.status')}</label>
            <input
              id="ed-st"
              type="text"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="ed-ops">{t('shipments.fields.operations_status')}</label>
            <select
              id="ed-ops"
              value={form.operations_status}
              onChange={(e) => setForm((f) => ({ ...f, operations_status: e.target.value }))}
              disabled={disabled}
            >
              <option value="">{t('shipments.optional')}</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
      <section className="client-detail-modal__section">
        <h3 className="client-detail-modal__section-title">{t('shipments.sections.loadingReefer')}</h3>
        <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="ed-lp">{t('shipments.fields.loading_place')}</label>
            <input
              id="ed-lp"
              type="text"
              value={form.loading_place}
              onChange={(e) => setForm((f) => ({ ...f, loading_place: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="ed-ld">{t('shipments.fields.loading_date')}</label>
            <input
              id="ed-ld"
              type="date"
              value={form.loading_date}
              onChange={(e) => setForm((f) => ({ ...f, loading_date: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label className="client-detail-modal__checkbox-label">
              <input
                type="checkbox"
                checked={form.is_reefer}
                onChange={(e) => setForm((f) => ({ ...f, is_reefer: e.target.checked }))}
                disabled={disabled}
              />
              {t('shipments.fields.is_reefer')}
            </label>
          </div>
          {form.is_reefer && (
            <>
              <div className="client-detail-modal__form-field">
                <label htmlFor="ed-rt">{t('shipments.fields.reefer_temp')}</label>
                <input
                  id="ed-rt"
                  type="text"
                  value={form.reefer_temp}
                  onChange={(e) => setForm((f) => ({ ...f, reefer_temp: e.target.value }))}
                  disabled={disabled}
                />
              </div>
              <div className="client-detail-modal__form-field">
                <label htmlFor="ed-rv">{t('shipments.fields.reefer_vent')}</label>
                <input
                  id="ed-rv"
                  type="text"
                  value={form.reefer_vent}
                  onChange={(e) => setForm((f) => ({ ...f, reefer_vent: e.target.value }))}
                  disabled={disabled}
                />
              </div>
              <div className="client-detail-modal__form-field">
                <label htmlFor="ed-rh">{t('shipments.fields.reefer_hum')}</label>
                <input
                  id="ed-rh"
                  type="text"
                  value={form.reefer_hum}
                  onChange={(e) => setForm((f) => ({ ...f, reefer_hum: e.target.value }))}
                  disabled={disabled}
                />
              </div>
            </>
          )}
        </div>
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
                    operations_status: '',
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
                value={filters.operations_status}
                onChange={(e) => setFilters((f) => ({ ...f, operations_status: e.target.value, page: 1 }))}
                className="clients-input"
                aria-label={t('shipments.filterOpsStatus')}
              >
                <option value="">{t('shipments.opsStatusAll')}</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}
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
              <form onSubmit={handleCreateSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">
                    {renderCreateForm(createForm, setCreateForm, createSubmitting)}
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
                    {createSubmitting ? t('shipments.saving') : t('shipments.save')}
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
          canViewFinancialTotals={canViewAccounting}
          canViewSelling={canViewSelling}
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
                  <div className="client-detail-modal__body-inner">
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
              <form onSubmit={handleEditSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">{renderEditForm(editForm, setEditForm, editSubmitting)}</div>
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
