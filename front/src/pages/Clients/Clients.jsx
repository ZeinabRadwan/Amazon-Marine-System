import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  getClientStats,
  getClientCharts,
  getFinancialSummary,
  getPricingList,
  exportClients,
  getClientVisits,
  getClientShipments,
  getClientAttachments,
  postClientAttachment,
  deleteClientAttachment,
} from '../../api/clients'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table, IconActionButton } from '../../components/Table'
import Pagination from '../../components/Pagination'
import Tabs from '../../components/Tabs'
import { StatsCard } from '../../components/StatsCard'
import ClientDetailModal from './ClientDetailModal'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import { Eye, Pencil, Trash2, Download, Users, Search, X, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'
import { BarChart, DonutChart } from '../../components/Charts'
import '../../components/Charts/Charts.css'
import '../../components/LoaderDots/LoaderDots.css'
import './Clients.css'

function getMonthFormat(locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })
}

/** Normalize API client: backend may return client_name/source instead of name/contact_name/lead_source */
function normalizeClient(c) {
  if (!c) return c
  return {
    ...c,
    name: c.name ?? c.client_name ?? '',
    contact_name: c.contact_name ?? c.client_name ?? '',
    lead_source: c.lead_source ?? c.source ?? '',
  }
}

const defaultClientForm = () => ({
  name: '',
  contact_name: '',
  company_name: '',
  company_type: '',
  business_activity: '',
  target_markets: '',
  tax_id: '',
  email: '',
  phone: '',
  preferred_comm_method: '',
  city: '',
  country: '',
  address: '',
  website_url: '',
  facebook_url: '',
  linkedin_url: '',
  status: '',
  lead_source: '',
  interest_level: '',
  decision_maker_name: '',
  decision_maker_title: '',
  default_payment_terms: '',
  default_currency: '',
  notes: '',
})

export default function Clients() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const numberLocale = 'en-US'
  const monthFormat = getMonthFormat(i18n.language)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    assigned_sales_id: '',
    lead_source_id: '',
    sort: 'client',
    direction: 'asc',
    page: 1,
    per_page: 50,
  })
  const [pagination, setPagination] = useState({ total: 0, last_page: 1, current_page: 1 })
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(defaultClientForm())
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [detailId, setDetailId] = useState(null)
  const [detailClient, setDetailClient] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(defaultClientForm())
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [detailTab, setDetailTab] = useState('info')
  const [visits, setVisits] = useState([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [shipments, setShipments] = useState([])
  const [shipmentsLoading, setShipmentsLoading] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [attachmentUploading, setAttachmentUploading] = useState(false)
  const [attachmentDeletingId, setAttachmentDeletingId] = useState(null)
  const [charts, setCharts] = useState(null)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [financialSummaryList, setFinancialSummaryList] = useState([])
  const [financialLoading, setFinancialLoading] = useState(false)
  const [pricingList, setPricingList] = useState([])
  const [pricingLoading, setPricingLoading] = useState(false)
  const [showSort, setShowSort] = useState(false)

  const pageLoading =
    loading ||
    statsLoading ||
    chartsLoading ||
    detailLoading ||
    visitsLoading ||
    shipmentsLoading ||
    attachmentsLoading ||
    financialLoading ||
    pricingLoading ||
    exportLoading ||
    createSubmitting ||
    editSubmitting ||
    deleteSubmitting ||
    attachmentUploading

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listClients(token, filters)
      .then((data) => {
        const arr = data.data ?? data.clients ?? data
        setList(Array.isArray(arr) ? arr : [])
        const meta = data.meta ?? data.pagination ?? {}
        setPagination({
          total: meta.total ?? arr.length,
          last_page: meta.last_page ?? 1,
          current_page: meta.current_page ?? meta.page ?? 1,
        })
      })
      .catch(() => setAlert({ type: 'error', message: t('clients.errorLoad') }))
      .finally(() => setLoading(false))
  }, [token, filters.q, filters.status, filters.assigned_sales_id, filters.lead_source_id, filters.sort, filters.direction, filters.page, filters.per_page, t])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!token) return
    setStatsLoading(true)
    getClientStats(token)
      .then((data) => setStats(data.data ?? data.stats ?? data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    setChartsLoading(true)
    getClientCharts(token, { months: 6 })
      .then((data) => setCharts(data.data ?? data.charts ?? data))
      .catch(() => setCharts(null))
      .finally(() => setChartsLoading(false))
  }, [token])

  useEffect(() => {
    if (!detailId || !token) {
      setDetailClient(null)
      return
    }
    setDetailLoading(true)
    getClient(token, detailId)
      .then((data) => setDetailClient(normalizeClient(data.client ?? data.data ?? data)))
      .catch(() => {
        setDetailClient(null)
        setAlert({ type: 'error', message: t('clients.errorDetail') })
      })
      .finally(() => setDetailLoading(false))
  }, [token, detailId, t])

  useEffect(() => {
    if (!detailId || !token || detailTab !== 'visits') return
    setVisitsLoading(true)
    getClientVisits(token, detailId)
      .then((data) => {
        const arr = data.data ?? data.visits ?? data
        setVisits(Array.isArray(arr) ? arr : [])
      })
      .catch(() => {
        setVisits([])
        setAlert({ type: 'warning', message: t('clients.warningVisits') })
      })
      .finally(() => setVisitsLoading(false))
  }, [token, detailId, detailTab, t])

  useEffect(() => {
    if (!detailId || !token || detailTab !== 'shipments') return
    setShipmentsLoading(true)
    getClientShipments(token, detailId, { per_page: 10 })
      .then((data) => {
        const arr = data.data ?? data.shipments ?? data
        setShipments(Array.isArray(arr) ? arr : [])
      })
      .catch(() => {
        setShipments([])
        setAlert({ type: 'warning', message: t('clients.warningShipments') })
      })
      .finally(() => setShipmentsLoading(false))
  }, [token, detailId, detailTab, t])

  useEffect(() => {
    if (!detailId || !token || detailTab !== 'attachments') return
    setAttachmentsLoading(true)
    getClientAttachments(token, detailId)
      .then((data) => {
        const arr = data.data ?? data.attachments ?? data
        setAttachments(Array.isArray(arr) ? arr : [])
      })
      .catch(() => {
        setAttachments([])
        setAlert({ type: 'warning', message: t('clients.warningAttachments') })
      })
      .finally(() => setAttachmentsLoading(false))
  }, [token, detailId, detailTab, t])

  useEffect(() => {
    if (!token) return
    setFinancialLoading(true)
    getFinancialSummary(token)
      .then((data) => setFinancialSummaryList(Array.isArray(data.data) ? data.data : []))
      .catch(() => setFinancialSummaryList([]))
      .finally(() => setFinancialLoading(false))
  }, [token])

  useEffect(() => {
    if (!token) return
    setPricingLoading(true)
    getPricingList(token)
      .then((data) => {
        const arr = data.data ?? data.pricing ?? data
        setPricingList(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setPricingList([]))
      .finally(() => setPricingLoading(false))
  }, [token])

  const openEdit = (client) => {
    const n = normalizeClient(client)
    setEditId(client.id)
    setEditForm({
      name: n.name ?? '',
      contact_name: n.contact_name ?? '',
      company_name: n.company_name ?? '',
      company_type: n.company_type ?? '',
      business_activity: n.business_activity ?? '',
      target_markets: n.target_markets ?? '',
      tax_id: n.tax_id ?? '',
      email: n.email ?? '',
      phone: n.phone ?? '',
      preferred_comm_method: n.preferred_comm_method ?? '',
      city: n.city ?? '',
      country: n.country ?? '',
      address: n.address ?? '',
      website_url: n.website_url ?? '',
      facebook_url: n.facebook_url ?? '',
      linkedin_url: n.linkedin_url ?? '',
      status: n.status ?? '',
      lead_source: n.lead_source ?? '',
      interest_level: n.interest_level ?? '',
      decision_maker_name: n.decision_maker_name ?? '',
      decision_maker_title: n.decision_maker_title ?? '',
      default_payment_terms: n.default_payment_terms ?? '',
      default_currency: n.default_currency ?? '',
      notes: n.notes ?? '',
    })
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setAlert(null)
    setCreateSubmitting(true)
    try {
      await createClient(token, createForm)
      setShowCreate(false)
      setCreateForm(defaultClientForm())
      loadList()
      setAlert({ type: 'success', message: t('clients.created') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorCreate') })
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editId) return
    setAlert(null)
    setEditSubmitting(true)
    try {
      await updateClient(token, editId, editForm)
      setEditId(null)
      loadList()
      if (detailId === editId) setDetailClient(null)
      setDetailId(null)
      setAlert({ type: 'success', message: t('clients.updated') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorUpdate') })
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setAlert(null)
    setDeleteSubmitting(true)
    try {
      await deleteClient(token, deleteId)
      setDeleteId(null)
      if (detailId === deleteId) {
        setDetailId(null)
        setDetailClient(null)
      }
      loadList()
      setAlert({ type: 'success', message: t('clients.deleted') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorDelete') })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleExport = async () => {
    setAlert(null)
    setExportLoading(true)
    try {
      const blob = await exportClients(token, { ...filters })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clients-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setAlert({ type: 'success', message: t('clients.exportSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorExport') })
    } finally {
      setExportLoading(false)
    }
  }

  const handleAttachmentUpload = async (e) => {
    const file = e.target?.files?.[0]
    if (!file || !detailId || !token) return
    setAlert(null)
    setAttachmentUploading(true)
    try {
      await postClientAttachment(token, detailId, file)
      const data = await getClientAttachments(token, detailId)
      const arr = data.data ?? data.attachments ?? data
      setAttachments(Array.isArray(arr) ? arr : [])
      setAlert({ type: 'success', message: t('clients.attachmentUploaded') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorAttachmentUpload') })
    } finally {
      setAttachmentUploading(false)
      e.target.value = ''
    }
  }

  const handleAttachmentDelete = async (attachmentId) => {
    if (!detailId || !token) return
    setAlert(null)
    setAttachmentDeletingId(attachmentId)
    try {
      await deleteClientAttachment(token, detailId, attachmentId)
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
      setAlert({ type: 'success', message: t('clients.attachmentDeleted') })
    } catch (err) {
      setAlert({ type: 'error', message: t('clients.errorAttachmentDelete') })
    } finally {
      setAttachmentDeletingId(null)
    }
  }

  const clientFormFields = [
    ['name', 'contact_name', 'company_name', 'company_type'],
    ['business_activity', 'target_markets', 'tax_id'],
    ['email', 'phone', 'preferred_comm_method'],
    ['city', 'country', 'address'],
    ['website_url', 'facebook_url', 'linkedin_url'],
    ['status', 'lead_source', 'interest_level'],
    ['decision_maker_name', 'decision_maker_title'],
    ['default_payment_terms', 'default_currency'],
    ['notes'],
  ]

  const renderForm = (form, setForm, disabled) => (
    <div className="clients-form-grid">
      {clientFormFields.flat().map((key) => (
        <div key={key} className="clients-field">
          <label>{t(`clients.fields.${key}`)}</label>
          {key === 'notes' ? (
            <textarea
              value={form[key] ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              disabled={disabled}
              rows={3}
            />
          ) : (
            <input
              type="text"
              value={form[key] ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              disabled={disabled}
            />
          )}
        </div>
      ))}
    </div>
  )

  const clientColumns = [
    {
      key: 'name',
      sortKey: 'client',
      label: t('clients.fields.name'),
      render: (_, c) => c.client_name ?? c.name ?? '—',
    },
    { key: 'company_name', label: t('clients.fields.company_name') },
    {
      key: 'contact_name',
      label: t('clients.fields.contact_name'),
      render: (_, c) => c.contact_name ?? c.client_name ?? '—',
    },
    { key: 'email', label: t('clients.fields.email') },
    { key: 'phone', label: t('clients.fields.phone') },
    { key: 'status', label: t('clients.fields.status') },
    {
      key: 'actions',
      label: t('clients.actions'),
      render: (_, c) => (
        <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('clients.actions')}>
          <IconActionButton
            icon={<Eye className="h-4 w-4" />}
            label={t('clients.view')}
            onClick={() => setDetailId(c.id)}
          />
          <IconActionButton
            icon={<Pencil className="h-4 w-4" />}
            label={t('clients.edit')}
            onClick={() => openEdit(c)}
          />
          <IconActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t('clients.delete')}
            onClick={() => setDeleteId(c.id)}
            variant="danger"
          />
        </div>
      ),
    },
  ]

  return (
    <Container size="xl">
      <div className="clients-page">
      {pageLoading && (
        <div className="clients-page-loader" aria-live="polite" aria-busy="true">
          <LoaderDots />
        </div>
      )}
      {stats && typeof stats === 'object' && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(stats).slice(0, 4).map(([key, value], i) => {
            const title = t(`clients.stats.${key}`, { defaultValue: key.replace(/_/g, ' ') })
            const displayValue =
              key === 'total_revenue_from_clients' && typeof value === 'number'
                ? new Intl.NumberFormat(numberLocale, {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0,
                    minimumFractionDigits: 0,
                  }).format(value)
                : typeof value === 'number'
                  ? new Intl.NumberFormat(numberLocale).format(value)
                  : String(value)
            return (
              <StatsCard
                key={key}
                title={title}
                value={displayValue}
                icon={<Users className="h-6 w-6" />}
                variant={i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'green' : 'amber'}
              />
            )
          })}
        </div>
      )}

      <div className="clients-extra-panel clients-charts-panel mb-4">
        {charts && (charts.new_clients_by_month?.length > 0 || charts.by_lead_source?.length > 0) ? (
          <div className="clients-charts-grid">
            {charts.new_clients_by_month?.length > 0 && (
              <div className="clients-chart-wrap">
                <BarChart
                  data={charts.new_clients_by_month.map((d) => ({
                    ...d,
                    monthLabel: d.month ? monthFormat.format(new Date(d.month)) : d.month,
                  }))}
                  xKey="monthLabel"
                  yKey="count"
                  xLabel={t('clients.chartsMonth', 'Month')}
                  yLabel={t('clients.chartsCount', 'Count')}
                  valueLabel={t('clients.chartsCount', 'Count')}
                  title={t('clients.chartsNewClientsByMonth', 'New clients by month')}
                  height={260}
                />
              </div>
            )}
            {charts.by_lead_source?.length > 0 && (
              <div className="clients-chart-wrap">
                <DonutChart
                  data={charts.by_lead_source.map((item) => ({
                    ...item,
                    displayName: t(`clients.leadSource.${item.lead_source_name}`, item.lead_source_name),
                  }))}
                  nameKey="displayName"
                  valueKey="count"
                  valueLabel={t('clients.chartsCount', 'Count')}
                  title={t('clients.chartsByLeadSource', 'By lead source')}
                  height={260}
                />
              </div>
            )}
          </div>
        ) : charts && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('clients.chartsNoData', 'No chart data')}</p>
        )}
      </div>

      <div className="clients-filters-card">
        <div className="clients-filters__row clients-filters__row--main">
          <div className="clients-filters__search-wrap" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <Search className="clients-filters__search-icon" aria-hidden />
            <input
              type="search"
              placeholder={t('clients.searchPlaceholder', t('clients.search'))}
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
              className="clients-input clients-filters__search"
              aria-label={t('clients.search')}
            />
          </div>
          <div className="clients-filters__fields">
            <input
              type="text"
              placeholder={t('clients.status')}
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
              className="clients-input"
              aria-label={t('clients.status')}
            />
            <input
              type="text"
              placeholder={t('clients.filterLeadSource')}
              value={filters.lead_source_id}
              onChange={(e) => setFilters((f) => ({ ...f, lead_source_id: e.target.value, page: 1 }))}
              className="clients-input"
              aria-label={t('clients.filterLeadSource')}
            />
            <input
              type="text"
              placeholder={t('clients.assignedSalesPlaceholder')}
              value={filters.assigned_sales_id}
              onChange={(e) => setFilters((f) => ({ ...f, assigned_sales_id: e.target.value, page: 1 }))}
              className="clients-input"
              aria-label={t('clients.assignedSalesPlaceholder')}
            />
          </div>
          <button
            type="button"
            className="clients-filters__clear"
            onClick={() => setFilters((f) => ({
              ...f,
              q: '',
              status: '',
              assigned_sales_id: '',
              lead_source_id: '',
              sort: 'client',
              direction: 'asc',
              page: 1,
            }))}
            aria-label={t('clients.clearFilters')}
          >
            <X className="clients-filters__clear-icon" aria-hidden />
            {t('clients.clearFilters')}
          </button>
          <button
            type="button"
            className="clients-filters__sort-toggle"
            onClick={() => setShowSort((v) => !v)}
            aria-expanded={showSort}
            aria-controls="clients-sort-panel"
            id="clients-sort-toggle"
          >
            <ArrowUpDown className="clients-filters__sort-toggle-icon" aria-hidden />
            <span>{t('clients.sortBy')}</span>
            {showSort ? <ChevronUp className="clients-filters__sort-toggle-chevron" aria-hidden /> : <ChevronDown className="clients-filters__sort-toggle-chevron" aria-hidden />}
          </button>
          <div className="clients-filters__actions">
            <button
              type="button"
              className="page-header__btn page-header__btn--primary"
              onClick={() => setShowCreate(true)}
            >
              {t('clients.createClient')}
            </button>
            <button
              type="button"
              className="page-header__btn"
              onClick={handleExport}
              disabled={exportLoading}
            >
              {exportLoading ? t('clients.loading') : t('pageHeader.export', 'Export')}
            </button>
          </div>
        </div>
        <div
          id="clients-sort-panel"
          className="clients-filters__row clients-filters__row--sort"
          role="region"
          aria-labelledby="clients-sort-toggle"
          hidden={!showSort}
        >
          <div className="clients-filters__sort-group">
            <label className="clients-filters__sort-label" htmlFor="clients-sort-by">
              {t('clients.sortBy')}
            </label>
            <select
              id="clients-sort-by"
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              className="clients-select"
              aria-label={t('clients.sortBy')}
            >
              <option value="client">{t('clients.sortClient')}</option>
              <option value="company_name">{t('clients.sortCompany')}</option>
              <option value="created_at">created_at</option>
            </select>
            <select
              value={filters.direction}
              onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
              className="clients-select clients-filters__direction"
              aria-label={t('clients.sortOrder')}
            >
              <option value="asc">{t('clients.directionAsc')}</option>
              <option value="desc">{t('clients.directionDesc')}</option>
            </select>
          </div>
        </div>
      </div>

      {alert && (
        <Alert
          variant={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {list.length === 0 ? (
        <p className="clients-empty">{t('clients.noClients')}</p>
      ) : (
        <Table
          columns={clientColumns}
          data={list}
          getRowKey={(c) => c.id}
          emptyMessage={t('clients.noClients')}
          sortKey={filters.sort}
          sortDirection={filters.direction}
          onSort={(key, direction) => setFilters((f) => ({ ...f, sort: key, direction }))}
        />
      )}

      {list.length > 0 && pagination.last_page > 0 && (
        <div className="clients-pagination">
          <div className="clients-pagination__left">
            <span className="clients-pagination__total">
              {t('clients.total', 'Total')}: {pagination.total}
            </span>
            <label className="clients-pagination__per-page">
              <span className="clients-pagination__per-page-label">{t('clients.perPage', 'Per page')}</span>
              <select
                value={filters.per_page}
                onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
                className="clients-select clients-pagination__select"
                aria-label={t('clients.perPage', 'Per page')}
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

      {/* Create modal */}
      {showCreate && (
        <div className="clients-modal" role="dialog" aria-modal="true">
          <div className="clients-modal-backdrop" onClick={() => setShowCreate(false)} />
          <div className="clients-modal-content clients-modal-content--wide">
            <h2>{t('clients.createClient')}</h2>
            <form onSubmit={handleCreateSubmit} className="clients-form">
              <div className="clients-form-scroll">{renderForm(createForm, setCreateForm, createSubmitting)}</div>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setShowCreate(false)} disabled={createSubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="submit" className="clients-btn clients-btn--primary" disabled={createSubmitting}>
                  {createSubmitting ? t('clients.saving') : t('clients.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ClientDetailModal
        open={!!detailId}
        detailId={detailId}
        detailClient={detailClient}
        detailTab={detailTab}
        onTabChange={setDetailTab}
        onClose={() => { setDetailId(null); setDetailClient(null); setDetailTab('info') }}
        onEdit={openEdit}
        visits={visits}
        shipments={shipments}
        attachments={attachments}
        attachmentUploading={attachmentUploading}
        attachmentDeletingId={attachmentDeletingId}
        onAttachmentUpload={handleAttachmentUpload}
        onAttachmentDelete={handleAttachmentDelete}
        financialSummaryList={financialSummaryList}
        pricingList={pricingList}
        numberLocale={numberLocale}
      />

      {/* Edit modal */}
      {editId && (
        <div className="clients-modal" role="dialog" aria-modal="true">
          <div className="clients-modal-backdrop" onClick={() => setEditId(null)} />
          <div className="clients-modal-content clients-modal-content--wide">
            <h2>{t('clients.editClient')}</h2>
            <form onSubmit={handleEditSubmit} className="clients-form">
              <div className="clients-form-scroll">{renderForm(editForm, setEditForm, editSubmitting)}</div>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setEditId(null)} disabled={editSubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="submit" className="clients-btn clients-btn--primary" disabled={editSubmitting}>
                  {editSubmitting ? t('clients.saving') : t('clients.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="clients-modal" role="dialog" aria-modal="true">
          <div className="clients-modal-backdrop" onClick={() => setDeleteId(null)} />
          <div className="clients-modal-content">
            <h2>{t('clients.deleteConfirm')}</h2>
            <p>{t('clients.deleteConfirmMessage')}</p>
            <div className="clients-modal-actions">
              <button type="button" className="clients-btn" onClick={() => setDeleteId(null)} disabled={deleteSubmitting}>
                {t('clients.cancel')}
              </button>
              <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteConfirm} disabled={deleteSubmitting}>
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
