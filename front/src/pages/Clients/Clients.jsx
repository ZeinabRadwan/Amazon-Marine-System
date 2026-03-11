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
  bulkAssignSales,
  getClientVisits,
  getClientShipments,
  getClientAttachments,
  postClientAttachment,
  deleteClientAttachment,
} from '../../api/clients'
import { PageHeader } from '../../components/PageHeader'
import { Container } from '../../components/Container'
import { Table, IconActionButton } from '../../components/Table'
import Pagination from '../../components/Pagination'
import Tabs from '../../components/Tabs'
import { StatsCard } from '../../components/StatsCard'
import LoaderDots from '../../components/LoaderDots'
import { Eye, Pencil, Trash2, Download, UserPlus, Users } from 'lucide-react'
import '../../components/LoaderDots/LoaderDots.css'
import { listUsers } from '../../api/users'
import './Clients.css'

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
  const { t } = useTranslation()
  const token = getStoredToken()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    assigned_sales_id: '',
    lead_source_id: '',
    sort: 'client',
    direction: 'asc',
    page: 1,
    per_page: 15,
  })
  const [pagination, setPagination] = useState({ total: 0, last_page: 1, current_page: 1 })
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showBulkAssign, setShowBulkAssign] = useState(false)
  const [bulkAssignSalesId, setBulkAssignSalesId] = useState('')
  const [bulkAssignSubmitting, setBulkAssignSubmitting] = useState(false)
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
  const [users, setUsers] = useState([])
  const [charts, setCharts] = useState(null)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [financialSummary, setFinancialSummary] = useState(null)
  const [financialLoading, setFinancialLoading] = useState(false)
  const [pricingList, setPricingList] = useState([])
  const [pricingLoading, setPricingLoading] = useState(false)
  const [extraPanel, setExtraPanel] = useState(null)

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setError('')
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
      .catch((err) => setError(err.message || t('clients.error')))
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
    if (!detailId || !token) {
      setDetailClient(null)
      return
    }
    setDetailLoading(true)
    getClient(token, detailId)
      .then((data) => setDetailClient(normalizeClient(data.client ?? data.data ?? data)))
      .catch(() => setDetailClient(null))
      .finally(() => setDetailLoading(false))
  }, [token, detailId])

  useEffect(() => {
    if (!detailId || !token || detailTab !== 'visits') return
    setVisitsLoading(true)
    getClientVisits(token, detailId)
      .then((data) => {
        const arr = data.data ?? data.visits ?? data
        setVisits(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setVisits([]))
      .finally(() => setVisitsLoading(false))
  }, [token, detailId, detailTab])

  useEffect(() => {
    if (!detailId || !token || detailTab !== 'shipments') return
    setShipmentsLoading(true)
    getClientShipments(token, detailId, { per_page: 10 })
      .then((data) => {
        const arr = data.data ?? data.shipments ?? data
        setShipments(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setShipments([]))
      .finally(() => setShipmentsLoading(false))
  }, [token, detailId, detailTab])

  useEffect(() => {
    if (!detailId || !token || detailTab !== 'attachments') return
    setAttachmentsLoading(true)
    getClientAttachments(token, detailId)
      .then((data) => {
        const arr = data.data ?? data.attachments ?? data
        setAttachments(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setAttachments([]))
      .finally(() => setAttachmentsLoading(false))
  }, [token, detailId, detailTab])

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
    setError('')
    setCreateSubmitting(true)
    try {
      await createClient(token, createForm)
      setShowCreate(false)
      setCreateForm(defaultClientForm())
      loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editId) return
    setError('')
    setEditSubmitting(true)
    try {
      await updateClient(token, editId, editForm)
      setEditId(null)
      loadList()
      if (detailId === editId) setDetailClient(null)
      setDetailId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setError('')
    setDeleteSubmitting(true)
    try {
      await deleteClient(token, deleteId)
      setDeleteId(null)
      if (detailId === deleteId) {
        setDetailId(null)
        setDetailClient(null)
      }
      loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleExport = async () => {
    setError('')
    setExportLoading(true)
    try {
      const blob = await exportClients(token, { ...filters })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `clients-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setExportLoading(false)
    }
  }

  const handleBulkAssignSubmit = async (e) => {
    e.preventDefault()
    if (selectedIds.size === 0 || !bulkAssignSalesId) return
    setError('')
    setBulkAssignSubmitting(true)
    try {
      await bulkAssignSales(token, {
        client_ids: Array.from(selectedIds),
        assigned_sales_id: Number(bulkAssignSalesId),
      })
      setShowBulkAssign(false)
      setBulkAssignSalesId('')
      setSelectedIds(new Set())
      loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setBulkAssignSubmitting(false)
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === list.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(list.map((c) => c.id)))
  }

  const handleAttachmentUpload = async (e) => {
    const file = e.target?.files?.[0]
    if (!file || !detailId || !token) return
    setError('')
    setAttachmentUploading(true)
    try {
      await postClientAttachment(token, detailId, file)
      const data = await getClientAttachments(token, detailId)
      const arr = data.data ?? data.attachments ?? data
      setAttachments(Array.isArray(arr) ? arr : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setAttachmentUploading(false)
      e.target.value = ''
    }
  }

  const handleAttachmentDelete = async (attachmentId) => {
    if (!detailId || !token) return
    setError('')
    setAttachmentDeletingId(attachmentId)
    try {
      await deleteClientAttachment(token, detailId, attachmentId)
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
    } catch (err) {
      setError(err.message)
    } finally {
      setAttachmentDeletingId(null)
    }
  }

  const openBulkAssign = () => {
    setBulkAssignSalesId('')
    listUsers(token)
      .then((data) => {
        const arr = data.data ?? data.users ?? data
        setUsers(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setUsers([]))
    setShowBulkAssign(true)
  }

  const loadCharts = () => {
    if (!token) return
    setExtraPanel('charts')
    setChartsLoading(true)
    getClientCharts(token, { months: 6 })
      .then((data) => setCharts(data.data ?? data.charts ?? data))
      .catch(() => setCharts(null))
      .finally(() => setChartsLoading(false))
  }

  const loadFinancialSummary = () => {
    if (!token) return
    setExtraPanel('financial')
    setFinancialLoading(true)
    getFinancialSummary(token)
      .then((data) => setFinancialSummary(data.data ?? data.summary ?? data))
      .catch(() => setFinancialSummary(null))
      .finally(() => setFinancialLoading(false))
  }

  const loadPricingList = () => {
    if (!token) return
    setExtraPanel('pricing')
    setPricingLoading(true)
    getPricingList(token)
      .then((data) => {
        const arr = data.data ?? data.pricing ?? data
        setPricingList(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setPricingList([]))
      .finally(() => setPricingLoading(false))
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
      key: '_select',
      label: (
        <input
          type="checkbox"
          checked={list.length > 0 && selectedIds.size === list.length}
          onChange={toggleSelectAll}
          aria-label={t('clients.selectAll', 'Select all')}
        />
      ),
      render: (_, c) => (
        <input
          type="checkbox"
          checked={selectedIds.has(c.id)}
          onChange={() => toggleSelect(c.id)}
          aria-label={t('clients.select', 'Select')}
        />
      ),
    },
    {
      key: 'name',
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
        <PageHeader
        title={t('clients.title')}
        breadcrumbs={[
          { label: t('pageHeader.home', 'Home'), href: '/' },
          { label: t('pageHeader.operations', 'Operations'), href: '/' },
          { label: t('clients.title') },
        ]}
        actions={
          <>
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
            <button
              type="button"
              className="page-header__btn"
              onClick={openBulkAssign}
              disabled={selectedIds.size === 0}
            >
              <UserPlus className="h-4 w-4 inline mr-1" />
              {t('clients.bulkAssign', 'Bulk assign')} {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </button>
          </>
        }
      />

      {stats && typeof stats === 'object' && !statsLoading && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(stats).slice(0, 4).map(([key, value], i) => (
            <StatsCard
              key={key}
              title={key.replace(/_/g, ' ')}
              value={typeof value === 'number' ? value : String(value)}
              icon={<Users className="h-6 w-6" />}
              variant={i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'green' : 'amber'}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" className="clients-btn clients-btn--small" onClick={loadCharts}>
          {t('clients.charts', 'Charts')}
        </button>
        <button type="button" className="clients-btn clients-btn--small" onClick={loadFinancialSummary}>
          {t('clients.financialSummary', 'Financial summary')}
        </button>
        <button type="button" className="clients-btn clients-btn--small" onClick={loadPricingList}>
          {t('clients.pricingList', 'Pricing list')}
        </button>
        {extraPanel && (
          <button type="button" className="clients-btn clients-btn--small" onClick={() => setExtraPanel(null)}>
            {t('clients.close')}
          </button>
        )}
      </div>
      {extraPanel === 'charts' && (
        <div className="clients-extra-panel mb-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-2">{t('clients.charts', 'Charts')}</h3>
          {chartsLoading ? (
            <div className="flex items-center gap-3 py-4">
              <LoaderDots size={20} />
              <span>{t('clients.loading')}</span>
            </div>
          ) : charts && <pre className="text-xs overflow-auto max-h-48">{JSON.stringify(charts, null, 2)}</pre>}
        </div>
      )}
      {extraPanel === 'financial' && (
        <div className="clients-extra-panel mb-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-2">{t('clients.financialSummary', 'Financial summary')}</h3>
          {financialLoading ? (
            <div className="flex items-center gap-3 py-4">
              <LoaderDots size={20} />
              <span>{t('clients.loading')}</span>
            </div>
          ) : financialSummary && <pre className="text-xs overflow-auto max-h-48">{JSON.stringify(financialSummary, null, 2)}</pre>}
        </div>
      )}
      {extraPanel === 'pricing' && (
        <div className="clients-extra-panel mb-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-2">{t('clients.pricingList', 'Pricing list')}</h3>
          {pricingLoading ? (
            <div className="flex items-center gap-3 py-4">
              <LoaderDots size={20} />
              <span>{t('clients.loading')}</span>
            </div>
          ) : pricingList.length === 0 ? <p>{t('clients.noPricing', 'No pricing')}</p> : (
            <ul className="text-sm">
              {pricingList.slice(0, 20).map((p, i) => (
                <li key={p.id ?? i}>{typeof p === 'object' ? JSON.stringify(p) : p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="clients-filters">
        <input
          type="search"
          placeholder={t('clients.search')}
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
          className="clients-input"
        />
        <input
          type="text"
          placeholder={t('clients.status')}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          className="clients-input"
        />
        <input
          type="text"
          placeholder="Lead source ID"
          value={filters.lead_source_id}
          onChange={(e) => setFilters((f) => ({ ...f, lead_source_id: e.target.value, page: 1 }))}
          className="clients-input"
        />
        <input
          type="text"
          placeholder="Assigned sales ID"
          value={filters.assigned_sales_id}
          onChange={(e) => setFilters((f) => ({ ...f, assigned_sales_id: e.target.value, page: 1 }))}
          className="clients-input"
        />
        <select
          value={filters.sort}
          onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
          className="clients-select"
        >
          <option value="client">client</option>
          <option value="company_name">company_name</option>
          <option value="created_at">created_at</option>
        </select>
        <select
          value={filters.direction}
          onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
          className="clients-select"
        >
          <option value="asc">asc</option>
          <option value="desc">desc</option>
        </select>
        <select
          value={filters.per_page}
          onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
          className="clients-select"
        >
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      {error && <div className="clients-error" role="alert">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-3 py-8">
          <LoaderDots size={24} />
          <span>{t('clients.loading')}</span>
        </div>
      ) : list.length === 0 ? (
        <p className="clients-empty">{t('clients.noClients')}</p>
      ) : (
        <Table
          columns={clientColumns}
          data={list}
          getRowKey={(c) => c.id}
          emptyMessage={t('clients.noClients')}
        />
      )}

      {list.length > 0 && pagination.last_page > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('clients.total', 'Total')}: {pagination.total}
          </span>
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

      {/* Detail modal */}
      {detailId && (
        <div className="clients-modal" role="dialog" aria-modal="true">
          <div className="clients-modal-backdrop" onClick={() => { setDetailId(null); setDetailClient(null); setDetailTab('info') }} />
          <div className="clients-modal-content clients-modal-content--wide">
            <h2>{t('clients.detail')}</h2>
            <Tabs
              tabs={[
                { id: 'info', label: t('clients.tabs.info', 'Info') },
                { id: 'visits', label: t('clients.tabs.visits', 'Visits') },
                { id: 'shipments', label: t('clients.tabs.shipments', 'Shipments') },
                { id: 'attachments', label: t('clients.tabs.attachments', 'Attachments') },
              ]}
              activeTab={detailTab}
              onChange={setDetailTab}
              className="mb-4"
            />
            <div role="tabpanel" id={`panel-${detailTab}`} aria-labelledby={`tab-${detailTab}`}>
            {detailTab === 'info' && (
              <>
                {detailLoading ? (
                  <div className="flex items-center gap-3 py-4">
                    <LoaderDots size={20} />
                    <span>{t('clients.loading')}</span>
                  </div>
                ) : detailClient ? (
                  <div className="clients-detail">
                    {clientFormFields.flat().map((key) => (
                      <div key={key} className="clients-detail-row">
                        <span className="clients-detail-label">{t(`clients.fields.${key}`)}</span>
                        <span className="clients-detail-value">{detailClient[key] ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>{t('clients.error')}</p>
                )}
              </>
            )}
            {detailTab === 'visits' && (
              visitsLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <LoaderDots size={20} />
                  <span>{t('clients.loading')}</span>
                </div>
              ) : (
                <div className="clients-detail-list">
                  {visits.length === 0 ? <p>{t('clients.noVisits', 'No visits')}</p> : visits.map((v) => (
                    <div key={v.id ?? v.visit_date} className="clients-detail-row">
                      <span className="clients-detail-label">{v.visit_date ?? v.date ?? '—'}</span>
                      <span className="clients-detail-value">{v.notes ?? v.summary ?? '—'}</span>
                    </div>
                  ))}
                </div>
              )
            )}
            {detailTab === 'shipments' && (
              shipmentsLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <LoaderDots size={20} />
                  <span>{t('clients.loading')}</span>
                </div>
              ) : (
                <div className="clients-detail-list">
                  {shipments.length === 0 ? <p>{t('clients.noShipments', 'No shipments')}</p> : shipments.map((s) => (
                    <div key={s.id} className="clients-detail-row">
                      <span className="clients-detail-label">{s.bl_number ?? s.reference ?? s.id}</span>
                      <span className="clients-detail-value">{s.status ?? s.amount ?? '—'}</span>
                    </div>
                  ))}
                </div>
              )
            )}
            {detailTab === 'attachments' && (
              attachmentsLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <LoaderDots size={20} />
                  <span>{t('clients.loading')}</span>
                </div>
              ) : (
                <div className="clients-detail-list">
                  <div className="flex items-center gap-2 mb-3">
                    <label className="clients-btn clients-btn--small clients-btn--primary cursor-pointer">
                      {attachmentUploading ? t('clients.uploading') : t('clients.uploadAttachment', 'Upload')}
                      <input type="file" className="hidden" accept="*" onChange={handleAttachmentUpload} disabled={attachmentUploading} />
                    </label>
                  </div>
                  {attachments.length === 0 ? <p>{t('clients.noAttachments', 'No attachments')}</p> : attachments.map((a) => (
                    <div key={a.id} className="clients-detail-row flex items-center justify-between">
                      <span className="clients-detail-value">{a.file_name ?? a.name ?? a.id}</span>
                      <button
                        type="button"
                        className="clients-btn clients-btn--small clients-btn--danger"
                        onClick={() => handleAttachmentDelete(a.id)}
                        disabled={attachmentDeletingId === a.id}
                      >
                        {attachmentDeletingId === a.id ? t('clients.deleting') : t('clients.delete')}
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
            </div>
            <div className="clients-modal-actions">
              <button type="button" className="clients-btn" onClick={() => { setDetailId(null); setDetailClient(null); setDetailTab('info') }}>
                {t('clients.close')}
              </button>
              {detailClient && detailTab === 'info' && (
                <button type="button" className="clients-btn clients-btn--primary" onClick={() => { openEdit(detailClient); setDetailId(null); setDetailClient(null) }}>
                  {t('clients.edit')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Bulk assign modal */}
      {showBulkAssign && (
        <div className="clients-modal" role="dialog" aria-modal="true">
          <div className="clients-modal-backdrop" onClick={() => setShowBulkAssign(false)} />
          <div className="clients-modal-content">
            <h2>{t('clients.bulkAssign', 'Bulk assign sales')}</h2>
            <p>{t('clients.bulkAssignSelected', 'Selected')}: {selectedIds.size}</p>
            <form onSubmit={handleBulkAssignSubmit} className="clients-form">
              <div className="clients-field">
                <label>{t('clients.assignedSales', 'Assigned sales')}</label>
                <select
                  value={bulkAssignSalesId}
                  onChange={(e) => setBulkAssignSalesId(e.target.value)}
                  required
                  disabled={bulkAssignSubmitting}
                >
                  <option value="">—</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name ?? u.email ?? u.id}</option>
                  ))}
                </select>
              </div>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setShowBulkAssign(false)} disabled={bulkAssignSubmitting}>
                  {t('clients.cancel')}
                </button>
                <button type="submit" className="clients-btn clients-btn--primary" disabled={bulkAssignSubmitting}>
                  {bulkAssignSubmitting ? t('clients.saving') : t('clients.save')}
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
