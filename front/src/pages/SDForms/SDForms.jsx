import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getStoredToken } from '../Login'
import {
  listSDForms,
  getSDFormStats,
  getSDFormCharts,
  exportSDForms,
} from '../../api/sdForms'
import { Container } from '../../components/Container'
import '../../components/PageHeader/PageHeader.css'
import { Table } from '../../components/Table'
import Pagination from '../../components/Pagination'
import { StatsCard } from '../../components/StatsCard'
import LoaderDots from '../../components/LoaderDots'
import Alert from '../../components/Alert'
import { FileSpreadsheet, Search, RotateCcw, ArrowUpDown, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { BarChart } from '../../components/Charts'
import '../../components/Charts/Charts.css'
import '../../components/LoaderDots/LoaderDots.css'
import '../Clients/Clients.css'
import './SDForms.css'

const SD_FORM_STATUSES = [
  { value: '', labelKey: 'sdForms.statusAll' },
  { value: 'draft', labelKey: 'sdForms.statusDraft' },
  { value: 'submitted', labelKey: 'sdForms.statusSubmitted' },
  { value: 'sent_to_operations', labelKey: 'sdForms.statusSentToOperations' },
  { value: 'in_progress', labelKey: 'sdForms.statusInProgress' },
  { value: 'cancelled', labelKey: 'sdForms.statusCancelled' },
]

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
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
  if (s === 'cancelled') return 'sd-forms-badge--cancelled'
  return 'sd-forms-badge--default'
}

export default function SDForms() {
  const { t, i18n } = useTranslation()
  const token = getStoredToken()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
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

  const loadList = useCallback(() => {
    if (!token) return
    setLoading(true)
    setAlert(null)
    listSDForms(token, {
      search: filters.search || undefined,
      status: filters.status || undefined,
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
  }, [token, filters.search, filters.status, filters.sort, filters.direction, filters.page, filters.per_page, t])

  useEffect(() => {
    loadList()
  }, [loadList])

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

  const handleExport = useCallback(() => {
    if (!token) return
    setAlert(null)
    setExportLoading(true)
    exportSDForms(token)
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sd-forms-export-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        setAlert({ type: 'success', message: t('sdForms.exportSuccess') })
      })
      .catch((err) => setAlert({ type: 'error', message: err.message || t('sdForms.exportError') }))
      .finally(() => setExportLoading(false))
  }, [token, t])

  const pageLoading = loading || statsLoading || exportLoading
  const monthFormat = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })

  const columns = [
    { key: 'sd_number', label: t('sdForms.sdNumber'), sortKey: 'sd', render: (_, r) => r.sd_number ?? '—' },
    { key: 'client_name', label: t('sdForms.client'), sortKey: 'client', render: (_, r) => r.client_name ?? '—' },
    { key: 'pol', label: t('sdForms.pol'), render: (_, r) => r.pol ?? '—' },
    { key: 'pod', label: t('sdForms.pod'), render: (_, r) => r.pod ?? '—' },
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
  ]

  return (
    <Container size="xl">
      <div className="clients-page sd-forms-page">
        {pageLoading && (
          <div className="clients-page-loader" aria-live="polite" aria-busy="true">
            <LoaderDots />
          </div>
        )}

        <div className="clients-header">
          <h1 className="sd-forms-page-title">{t('sdForms.title')}</h1>
        </div>

        {stats && (
          <div className="sd-forms-stats-grid">
            <StatsCard
              title={t('sdForms.statsTotal')}
              value={stats.total_forms ?? 0}
              icon={<FileText className="h-6 w-6" />}
              variant="blue"
            />
            {(stats.by_status ?? []).map((item) => (
              <StatsCard
                key={item.status}
                title={t(`sdForms.status.${item.status}`, item.status)}
                value={item.count ?? 0}
                icon={<FileText className="h-6 w-6" />}
                variant="default"
              />
            ))}
          </div>
        )}

        {charts?.monthly?.length > 0 && (
          <div className="clients-extra-panel clients-charts-panel mb-4">
            <div className="clients-chart-wrap">
              <BarChart
                data={charts.monthly.map((d) => ({
                  ...d,
                  monthLabel: d.month ? monthFormat.format(new Date(d.month)) : d.month,
                }))}
                xKey="monthLabel"
                yKey="count"
                xLabel={t('sdForms.chartMonth')}
                yLabel={t('sdForms.chartCount')}
                valueLabel={t('sdForms.chartCount')}
                title={t('sdForms.chartTitle')}
                height={260}
              />
            </div>
          </div>
        )}

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
            </div>
            <button
              type="button"
              className="clients-filters__clear clients-filters__btn-icon"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  search: '',
                  status: '',
                  sort: 'date',
                  direction: 'desc',
                  page: 1,
                }))
              }
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
            <div className="clients-filters__actions">
              <button
                type="button"
                className="clients-filters__btn-icon clients-filters__btn-icon--export"
                onClick={handleExport}
                disabled={exportLoading}
                aria-label={t('pageHeader.export')}
                title={t('pageHeader.export')}
              >
                {exportLoading ? (
                  <span className="clients-filters__export-spinner" aria-hidden />
                ) : (
                  <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
                )}
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

        {alert && (
          <Alert
            variant={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

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
      </div>
    </Container>
  )
}
