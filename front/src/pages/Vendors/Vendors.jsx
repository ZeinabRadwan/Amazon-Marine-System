import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import {
  listVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorStats,
  getVendorCharts,
  exportVendors,
  getVendorVisits,
} from '../../api/vendors'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table, IconActionButton } from '../../components/Table'
import Pagination from '../../components/Pagination'
import { StatsCard } from '../../components/StatsCard'
import VendorDetailModal from './VendorDetailModal'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import {
  Eye,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Search,
  X,
  Building2,
  RotateCcw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { BarChart, DonutChart } from '../../components/Charts'
import '../../components/Charts/Charts.css'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'

export const VENDOR_TYPE_KEYS = ['shipping', 'transport', 'customs', 'other']

function getMonthFormat(locale) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })
}

const defaultVendorForm = () => ({
  name: '',
  type: 'shipping',
  email: '',
  phone: '',
  city: '',
  country: '',
  address: '',
  payment_terms: '',
  notes: '',
})

function buildVendorPayload(form) {
  const str = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : null)
  return {
    name: form.name?.trim() || '',
    type: form.type?.trim() || 'shipping',
    email: str(form.email),
    phone: str(form.phone),
    city: str(form.city),
    country: str(form.country),
    address: str(form.address),
    payment_terms: str(form.payment_terms),
    notes: str(form.notes),
  }
}

export default function Vendors() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const numberLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US'
  const monthFormat = getMonthFormat(i18n.language)

  const [rawList, setRawList] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  const [filters, setFilters] = useState({
    search: '',
    type: '',
    sort: 'name',
    direction: 'asc',
    page: 1,
    per_page: 25,
  })
  const [showSort, setShowSort] = useState(false)

  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [charts, setCharts] = useState(null)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(defaultVendorForm())
  const [createSubmitting, setCreateSubmitting] = useState(false)

  const [detailId, setDetailId] = useState(null)
  const [detailVendor, setDetailVendor] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('info')
  const [visits, setVisits] = useState([])
  const [visitsLoading, setVisitsLoading] = useState(false)

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(defaultVendorForm())
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [deleteId, setDeleteId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const listParams = useMemo(
    () => ({
      type: filters.type || undefined,
      search: filters.search?.trim() || undefined,
    }),
    [filters.type, filters.search]
  )

  const statsParams = useMemo(() => ({ type: filters.type || undefined, currency: 'USD' }), [filters.type])

  const chartsParams = useMemo(() => ({ type: filters.type || undefined, months: 6 }), [filters.type])

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listVendors(token, listParams)
      .then((data) => {
        const arr = data.data ?? data.vendors ?? data
        setRawList(Array.isArray(arr) ? arr : [])
      })
      .catch(() => setAlert({ type: 'error', message: t('vendors.errorLoad') }))
      .finally(() => setLoading(false))
  }, [token, listParams, t])

  useEffect(() => {
    loadList()
  }, [loadList])

  useEffect(() => {
    if (!token) return
    setStatsLoading(true)
    getVendorStats(token, statsParams)
      .then((data) => setStats(data.data ?? data.stats ?? data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false))
  }, [token, statsParams])

  useEffect(() => {
    if (!token) return
    setChartsLoading(true)
    getVendorCharts(token, chartsParams)
      .then((data) => setCharts(data.data ?? data.charts ?? data))
      .catch(() => setCharts(null))
      .finally(() => setChartsLoading(false))
  }, [token, chartsParams])

  useEffect(() => {
    if (!detailId || !token) {
      setDetailVendor(null)
      return
    }
    setDetailLoading(true)
    getVendor(token, detailId)
      .then((data) => setDetailVendor(data.data ?? data.vendor ?? data))
      .catch(() => {
        setDetailVendor(null)
        setAlert({ type: 'error', message: t('vendors.errorDetail') })
      })
      .finally(() => setDetailLoading(false))
  }, [token, detailId, t])

  useEffect(() => {
    if (!detailId || !token || detailTab !== 'visits') {
      setVisits([])
      return
    }
    setVisitsLoading(true)
    getVendorVisits(token, detailId)
      .then((data) => {
        const arr = data.data ?? data.visits ?? data
        setVisits(Array.isArray(arr) ? arr : [])
      })
      .catch(() => {
        setVisits([])
        setAlert({ type: 'warning', message: t('vendors.warningVisits') })
      })
      .finally(() => setVisitsLoading(false))
  }, [token, detailId, detailTab, t])

  useEffect(() => {
    setFilters((f) => ({ ...f, page: 1 }))
  }, [filters.search, filters.type])

  const filteredSorted = useMemo(() => {
    let rows = [...rawList]
    const mult = filters.direction === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      const ka = filters.sort
      const va = String(a[ka] ?? '').toLowerCase()
      const vb = String(b[ka] ?? '').toLowerCase()
      return va.localeCompare(vb) * mult
    })
    return rows
  }, [rawList, filters.sort, filters.direction])

  const pagination = useMemo(() => {
    const total = filteredSorted.length
    const lastPage = Math.max(1, Math.ceil(total / filters.per_page) || 1)
    const currentPage = Math.min(filters.page, lastPage)
    const start = (currentPage - 1) * filters.per_page
    return {
      total,
      last_page: lastPage,
      current_page: currentPage,
      slice: filteredSorted.slice(start, start + filters.per_page),
    }
  }, [filteredSorted, filters.page, filters.per_page])

  const pageLoading =
    loading ||
    statsLoading ||
    chartsLoading ||
    exportLoading ||
    createSubmitting ||
    editSubmitting ||
    deleteSubmitting

  const openEdit = (v) => {
    setEditId(v.id)
    setEditForm({
      name: v.name ?? '',
      type: v.type ?? 'shipping',
      email: v.email ?? '',
      phone: v.phone ?? '',
      city: v.city ?? '',
      country: v.country ?? '',
      address: v.address ?? '',
      payment_terms: v.payment_terms ?? '',
      notes: v.notes ?? '',
    })
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setAlert(null)
    setCreateSubmitting(true)
    try {
      await createVendor(token, buildVendorPayload(createForm))
      setShowCreate(false)
      setCreateForm(defaultVendorForm())
      loadList()
      setAlert({ type: 'success', message: t('vendors.created') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('vendors.errorCreate') })
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
      await updateVendor(token, editId, buildVendorPayload(editForm))
      setEditId(null)
      loadList()
      if (detailId === editId) setDetailVendor(null)
      setDetailId(null)
      setAlert({ type: 'success', message: t('vendors.updated') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('vendors.errorUpdate') })
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    setAlert(null)
    setDeleteSubmitting(true)
    try {
      await deleteVendor(token, deleteId)
      setDeleteId(null)
      if (detailId === deleteId) {
        setDetailId(null)
        setDetailVendor(null)
      }
      loadList()
      setAlert({ type: 'success', message: t('vendors.deleted') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('vendors.errorDelete') })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleExport = async () => {
    setAlert(null)
    setExportLoading(true)
    try {
      const blob = await exportVendors(token, listParams)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vendors-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      setAlert({ type: 'success', message: t('vendors.exportSuccess') })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || t('vendors.errorExport') })
    } finally {
      setExportLoading(false)
    }
  }

  const renderForm = (form, setForm, disabled) => (
    <div className="clients-form-sections">
      <section className="client-detail-modal__section">
        <h3 className="client-detail-modal__section-title">{t('vendors.sections.basic')}</h3>
        <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="vendor-name">{t('vendors.fields.name')}</label>
            <input
              id="vendor-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={disabled}
              required
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="vendor-type">{t('vendors.fields.type')}</label>
            <select
              id="vendor-type"
              value={form.type || 'shipping'}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              disabled={disabled}
              required
            >
              {VENDOR_TYPE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`vendors.types.${k}`)}
                </option>
              ))}
              {form.type && !VENDOR_TYPE_KEYS.includes(form.type) ? (
                <option value={form.type}>{form.type}</option>
              ) : null}
            </select>
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="vendor-email">{t('vendors.fields.email')}</label>
            <input
              id="vendor-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="vendor-phone">{t('vendors.fields.phone')}</label>
            <input
              id="vendor-phone"
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              disabled={disabled}
            />
          </div>
        </div>
      </section>
      <section className="client-detail-modal__section">
        <h3 className="client-detail-modal__section-title">{t('vendors.sections.location')}</h3>
        <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field">
            <label htmlFor="vendor-city">{t('vendors.fields.city')}</label>
            <input
              id="vendor-city"
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field">
            <label htmlFor="vendor-country">{t('vendors.fields.country')}</label>
            <input
              id="vendor-country"
              type="text"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="vendor-address">{t('vendors.fields.address')}</label>
            <textarea
              id="vendor-address"
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              disabled={disabled}
            />
          </div>
        </div>
      </section>
      <section className="client-detail-modal__section">
        <h3 className="client-detail-modal__section-title">{t('vendors.sections.other')}</h3>
        <div className="client-detail-modal__form-grid">
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="vendor-payment">{t('vendors.fields.payment_terms')}</label>
            <input
              id="vendor-payment"
              type="text"
              value={form.payment_terms}
              onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
              disabled={disabled}
            />
          </div>
          <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
            <label htmlFor="vendor-notes">{t('vendors.fields.notes')}</label>
            <textarea
              id="vendor-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              disabled={disabled}
            />
          </div>
        </div>
      </section>
    </div>
  )

  const columns = [
    {
      key: 'name',
      sortKey: 'name',
      label: t('vendors.fields.name'),
    },
    {
      key: 'type',
      sortKey: 'type',
      label: t('vendors.fields.type'),
      render: (val) => (
        <span className="clients-status-badge clients-status-badge--default">
          {val ? t(`vendors.types.${val}`, val) : '—'}
        </span>
      ),
    },
    { key: 'email', sortKey: 'email', label: t('vendors.fields.email'), render: (v) => v || '—' },
    { key: 'phone', sortKey: 'phone', label: t('vendors.fields.phone'), render: (v) => v || '—' },
    { key: 'city', sortKey: 'city', label: t('vendors.fields.city'), render: (v) => v || '—' },
    {
      key: 'actions',
      label: t('vendors.actions'),
      render: (_, row) => (
        <div className="clients-table-actions flex flex-wrap gap-2 justify-end" role="group" aria-label={t('vendors.actions')}>
          <IconActionButton
            icon={<Eye className="h-4 w-4" />}
            label={t('vendors.view')}
            onClick={() => {
              setDetailTab('info')
              setDetailId(row.id)
            }}
          />
          <IconActionButton icon={<Pencil className="h-4 w-4" />} label={t('vendors.edit')} onClick={() => openEdit(row)} />
          <IconActionButton
            icon={<Trash2 className="h-4 w-4" />}
            label={t('vendors.delete')}
            onClick={() => setDeleteId(row.id)}
            variant="danger"
          />
        </div>
      ),
    },
  ]

  const monthlyChartData =
    charts?.monthly_totals?.labels?.length > 0
      ? charts.monthly_totals.labels.map((label, i) => ({
          monthLabel: label ? monthFormat.format(new Date(`${label}T12:00:00`)) : label,
          amount: Number(charts.monthly_totals.values[i] ?? 0),
        }))
      : []

  return (
    <Container size="xl">
      <div className="clients-page">
        {pageLoading && (
          <div className="clients-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        {stats && typeof stats === 'object' && (
          <div className="clients-stats-grid">
            <StatsCard
              title={t('vendors.stats.total_count')}
              value={new Intl.NumberFormat(numberLocale).format(stats.total_count ?? 0)}
              icon={<Building2 className="h-6 w-6" />}
              variant="blue"
            />
            <StatsCard
              title={t('vendors.stats.total_balance_due')}
              value={new Intl.NumberFormat(numberLocale, {
                style: 'currency',
                currency: stats.currency || 'USD',
                maximumFractionDigits: 0,
              }).format(stats.total_balance_due ?? 0)}
              icon={<Building2 className="h-6 w-6" />}
              variant="amber"
            />
            {stats.top_partner?.name && (
              <StatsCard
                title={t('vendors.stats.top_partner')}
                value={`${stats.top_partner.name} (${new Intl.NumberFormat(numberLocale, {
                  style: 'currency',
                  currency: stats.currency || 'USD',
                  maximumFractionDigits: 0,
                }).format(stats.top_partner.revenue ?? 0)})`}
                icon={<Building2 className="h-6 w-6" />}
                variant="green"
              />
            )}
          </div>
        )}

        <div className="clients-extra-panel clients-charts-panel mb-4">
          {charts && (charts.by_type?.length > 0 || monthlyChartData.length > 0) ? (
            <div className="clients-charts-grid">
              {charts.by_type?.length > 0 && (
                <div className="clients-chart-wrap">
                  <DonutChart
                    data={charts.by_type.map((item) => ({
                      ...item,
                      displayName: t(`vendors.types.${item.type}`, item.type ?? '—'),
                    }))}
                    nameKey="displayName"
                    valueKey="count"
                    valueLabel={t('vendors.chartsCount')}
                    title={t('vendors.chartsByType')}
                    height={260}
                  />
                </div>
              )}
              {monthlyChartData.length > 0 && (
                <div className="clients-chart-wrap">
                  <BarChart
                    data={monthlyChartData}
                    xKey="monthLabel"
                    yKey="amount"
                    xLabel={t('vendors.chartsMonth')}
                    yLabel={t('vendors.chartsAmount')}
                    valueLabel={t('vendors.chartsAmount')}
                    title={t('vendors.chartsMonthly')}
                    height={260}
                    allowDecimals
                  />
                </div>
              )}
            </div>
          ) : charts && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('vendors.chartsNoData')}</p>
          )}
        </div>

        <div className="clients-filters-card">
          <div className="clients-filters__row clients-filters__row--main">
            <div className="clients-filters__search-wrap" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
              <Search className="clients-filters__search-icon" aria-hidden />
              <input
                type="search"
                placeholder={t('vendors.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="clients-input clients-filters__search"
                aria-label={t('vendors.search')}
              />
            </div>
            <div className="clients-filters__fields">
              <select
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
                className="clients-input"
                aria-label={t('vendors.filterType')}
              >
                <option value="">{t('vendors.typeAll')}</option>
                {VENDOR_TYPE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t(`vendors.types.${k}`)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="clients-filters__clear clients-filters__btn-icon"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  search: '',
                  type: '',
                  sort: 'name',
                  direction: 'asc',
                  page: 1,
                }))
              }
              aria-label={t('vendors.clearFilters')}
              title={t('vendors.clearFilters')}
            >
              <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
            </button>
            <button
              type="button"
              className="clients-filters__sort-toggle clients-filters__btn-icon"
              onClick={() => setShowSort((v) => !v)}
              aria-expanded={showSort}
              aria-controls="vendors-sort-panel"
              id="vendors-sort-toggle"
              title={t('vendors.sortBy')}
            >
              <ArrowUpDown className="clients-filters__btn-icon-svg" aria-hidden />
              {showSort ? (
                <ChevronUp className="clients-filters__sort-toggle-chevron" aria-hidden />
              ) : (
                <ChevronDown className="clients-filters__sort-toggle-chevron" aria-hidden />
              )}
            </button>
            <div className="clients-filters__actions">
              <button
                type="button"
                className="clients-filters__btn-icon clients-filters__btn-icon--export"
                onClick={handleExport}
                disabled={exportLoading}
                aria-label={t('vendors.export')}
                title={t('vendors.export')}
              >
                {exportLoading ? (
                  <span className="clients-filters__export-spinner" aria-hidden />
                ) : (
                  <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
                )}
              </button>
              <button type="button" className="page-header__btn page-header__btn--primary" onClick={() => setShowCreate(true)}>
                {t('vendors.create')}
              </button>
            </div>
          </div>
          <div
            id="vendors-sort-panel"
            className="clients-filters__row clients-filters__row--sort"
            role="region"
            aria-labelledby="vendors-sort-toggle"
            hidden={!showSort}
          >
            <div className="clients-filters__sort-group">
              <label className="clients-filters__sort-label" htmlFor="vendors-sort-by">
                {t('vendors.sortBy')}
              </label>
              <select
                id="vendors-sort-by"
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
                className="clients-select"
              >
                <option value="name">{t('vendors.sortName')}</option>
                <option value="type">{t('vendors.sortType')}</option>
                <option value="email">{t('vendors.sortEmail')}</option>
                <option value="city">{t('vendors.sortCity')}</option>
              </select>
              <select
                value={filters.direction}
                onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value }))}
                className="clients-select clients-filters__direction"
              >
                <option value="asc">{t('vendors.directionAsc')}</option>
                <option value="desc">{t('vendors.directionDesc')}</option>
              </select>
            </div>
          </div>
        </div>

        {alert && <Alert variant={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        {pagination.slice.length === 0 ? (
          <p className="clients-empty">{t('vendors.empty')}</p>
        ) : (
          <Table
            columns={columns}
            data={pagination.slice}
            getRowKey={(r) => r.id}
            emptyMessage={t('vendors.empty')}
            sortKey={filters.sort}
            sortDirection={filters.direction}
            onSort={(key, direction) => setFilters((f) => ({ ...f, sort: key, direction }))}
          />
        )}

        {pagination.total > 0 && (
          <div className="clients-pagination">
            <div className="clients-pagination__left">
              <span className="clients-pagination__total">
                {t('vendors.total')}: {pagination.total}
              </span>
              <label className="clients-pagination__per-page">
                <span className="clients-pagination__per-page-label">{t('vendors.perPage')}</span>
                <select
                  value={filters.per_page}
                  onChange={(e) => setFilters((f) => ({ ...f, per_page: Number(e.target.value), page: 1 }))}
                  className="clients-select clients-pagination__select"
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
              totalPages={pagination.last_page}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
            />
          </div>
        )}

        {showCreate && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="vendor-create-title">
            <div className="client-detail-modal__backdrop" onClick={() => setShowCreate(false)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="vendor-create-title" className="client-detail-modal__title">
                  {t('vendors.create')}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setShowCreate(false)}
                  disabled={createSubmitting}
                  aria-label={t('vendors.close')}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form onSubmit={handleCreateSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">{renderForm(createForm, setCreateForm, createSubmitting)}</div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => setShowCreate(false)}
                    disabled={createSubmitting}
                  >
                    {t('vendors.cancel')}
                  </button>
                  <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={createSubmitting}>
                    {createSubmitting ? t('vendors.saving') : t('vendors.save')}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        <VendorDetailModal
          open={!!detailId}
          vendor={detailVendor}
          vendorLoading={detailLoading}
          detailTab={detailTab}
          onTabChange={setDetailTab}
          onClose={() => {
            setDetailId(null)
            setDetailVendor(null)
            setDetailTab('info')
          }}
          onEdit={(v) => {
            openEdit(v)
            setDetailId(null)
            setDetailVendor(null)
          }}
          visits={visits}
          visitsLoading={visitsLoading}
        />

        {editId && (
          <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="vendor-edit-title">
            <div className="client-detail-modal__backdrop" onClick={() => setEditId(null)} />
            <div className="client-detail-modal__box client-detail-modal__box--form">
              <header className="client-detail-modal__header client-detail-modal__header--form">
                <h2 id="vendor-edit-title" className="client-detail-modal__title">
                  {t('vendors.editTitle')}
                </h2>
                <button
                  type="button"
                  className="client-detail-modal__close"
                  onClick={() => setEditId(null)}
                  disabled={editSubmitting}
                  aria-label={t('vendors.close')}
                >
                  <X className="client-detail-modal__close-icon" aria-hidden />
                </button>
              </header>
              <form onSubmit={handleEditSubmit} className="client-detail-modal__form">
                <div className="client-detail-modal__body client-detail-modal__body--form">
                  <div className="client-detail-modal__body-inner">{renderForm(editForm, setEditForm, editSubmitting)}</div>
                </div>
                <footer className="client-detail-modal__footer client-detail-modal__footer--form">
                  <button
                    type="button"
                    className="client-detail-modal__btn client-detail-modal__btn--secondary"
                    onClick={() => setEditId(null)}
                    disabled={editSubmitting}
                  >
                    {t('vendors.cancel')}
                  </button>
                  <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={editSubmitting}>
                    {editSubmitting ? t('vendors.saving') : t('vendors.save')}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {deleteId && (
          <div className="clients-modal" role="dialog" aria-modal="true">
            <div className="clients-modal-backdrop" onClick={() => setDeleteId(null)} />
            <div className="clients-modal-content">
              <h2>{t('vendors.deleteConfirm')}</h2>
              <p>{t('vendors.deleteConfirmMessage')}</p>
              <div className="clients-modal-actions">
                <button type="button" className="clients-btn" onClick={() => setDeleteId(null)} disabled={deleteSubmitting}>
                  {t('vendors.cancel')}
                </button>
                <button type="button" className="clients-btn clients-btn--danger" onClick={handleDeleteConfirm} disabled={deleteSubmitting}>
                  {deleteSubmitting ? t('vendors.deleting') : t('vendors.delete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
