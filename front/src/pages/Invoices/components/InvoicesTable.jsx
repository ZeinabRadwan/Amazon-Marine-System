import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Download,
  Eye,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Table, IconActionButton } from '../../../components/Table'
import Pagination from '../../../components/Pagination'
import Alert from '../../../components/Alert'
import { getStoredToken } from '../../Login'
import { listInvoices, exportInvoicesCsv } from '../../../api/invoices'
import InvoiceDetailModal from './InvoiceDetailModal'

/** Map invoice status to Clients-style badge variant (Clients.css) */
function invoiceStatusVariant(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'paid') return 'active'
  if (s === 'partial') return 'pending'
  if (s === 'cancelled') return 'inactive'
  if (s === 'issued') return 'pending'
  if (s === 'draft') return 'lead'
  if (s === 'unpaid') return 'default'
  if (s === 'overdue') return 'inactive'
  return 'default'
}

function statusLabel(status, t) {
  const s = String(status || '').toLowerCase()
  const keys = {
    paid: 'invoices.status.paid',
    partial: 'invoices.status.partial',
    cancelled: 'invoices.status.cancelled',
    issued: 'invoices.status.issued',
    draft: 'invoices.status.draft',
    unpaid: 'invoices.status.unpaid',
    overdue: 'invoices.status.overdue',
  }
  const key = keys[s]
  return key ? t(key) : status || '—'
}

const STATUS_FILTER_VALUES = ['paid', 'partial', 'unpaid', 'overdue', 'issued', 'draft', 'cancelled']

export default function InvoicesTable({
  refreshKey,
  invoiceType,
  onChanged,
  onFiltersChange,
  canManage = true,
  exportLoading = false,
  onExportCsv,
  onCreateInvoice,
}) {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sort, setSort] = useState('date')
  const [showSort, setShowSort] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)

  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [detailId, setDetailId] = useState(null)

  const fetchData = () => {
    const token = getStoredToken()
    if (!token) return
    setLoading(true)
    setError(null)
    listInvoices(token, {
      search: search || undefined,
      status: status || undefined,
      invoice_type: invoiceType || undefined,
      currency_id: currencyId || undefined,
      issue_date_from: dateFrom || undefined,
      issue_date_to: dateTo || undefined,
      sort: sort || undefined,
      per_page: perPage,
      page,
    })
      .then((res) => {
        setRows(res.data ?? [])
        setMeta(res.meta ?? null)
        setSelectedIds(new Set())
      })
      .catch((e) => {
        setError(e.message || 'Failed to load invoices')
        setRows([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [refreshKey, invoiceType, search, status, currencyId, dateFrom, dateTo, sort, page, perPage])

  useEffect(() => {
    onFiltersChange?.({
      search,
      status,
      currencyId,
      dateFrom,
      dateTo,
      sort,
    })
  }, [search, status, currencyId, dateFrom, dateTo, sort, onFiltersChange])

  const allSelected = rows.length > 0 && selectedIds.size === rows.length

  const toggleAll = (checked) => {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(rows.map((r) => r.id)))
  }

  const toggleOne = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleExportSelected = async () => {
    const token = getStoredToken()
    if (!token) return
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      await exportInvoicesCsv(token, { ids })
    } catch (e) {
      console.error(e)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setCurrencyId('')
    setDateFrom('')
    setDateTo('')
    setSort('date')
    setPage(1)
  }

  const pagination = {
    total: meta?.total ?? rows.length,
    last_page: Math.max(1, meta?.last_page ?? 1),
    current_page: meta?.current_page ?? page,
  }

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => toggleAll(e.target.checked)}
            aria-label={t('clients.selectAll')}
        />
      ),
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => toggleOne(row.id, e.target.checked)}
          aria-label={t('clients.select')}
        />
      ),
      sortable: false,
    },
    {
      key: 'invoice_number',
      label: t('invoices.table.number', 'Invoice #'),
      sortable: false,
    },
    {
      key: 'party_name',
      label: t('invoices.table.party', 'Client/Partner'),
      sortable: false,
    },
    { key: 'shipment_bl', label: t('invoices.table.shipment', 'Shipment'), sortable: false },
    {
      key: 'amount',
      label: t('invoices.table.amount', 'Amount'),
      render: (v) => <span className="tabular-nums font-semibold">{Number(v || 0).toLocaleString()}</span>,
      sortable: false,
    },
    { key: 'currency_code', label: t('invoices.table.currency', 'Currency'), sortable: false },
    {
      key: 'status',
      label: t('invoices.table.status', 'Status'),
      render: (v) => {
        const variant = invoiceStatusVariant(v)
        const lbl = statusLabel(v, t)
        return (
          <span className={`clients-status-badge clients-status-badge--${variant}`} title={lbl}>
            {lbl}
          </span>
        )
      },
      sortable: false,
    },
    {
      key: 'is_vat_invoice',
      label: t('invoices.table.vat', 'VAT'),
      render: (v) => (v ? t('rolesPermissions.yes') : t('rolesPermissions.no')),
      sortable: false,
    },
    {
      key: 'issue_date',
      label: t('invoices.table.date', 'Date'),
      sortable: false,
    },
    {
      key: 'actions',
      label: t('invoices.actions'),
      render: (_, row) => (
        <div className="clients-table-actions flex flex-wrap justify-end gap-2" role="group" aria-label={t('invoices.actions')}>
          <IconActionButton
            icon={<Eye className="h-4 w-4" />}
            label={t('clients.view')}
            onClick={() => setDetailId(row.id)}
          />
        </div>
      ),
      sortable: false,
    },
  ]

  return (
    <div className="invoices-table-root">
      {selectedIds.size > 0 && (
        <div className="invoices-bulk-toolbar" role="region" aria-label={t('invoices.bulk.region')}>
          <p className="invoices-bulk-toolbar__label">
            {t('invoices.bulk.selected', { count: selectedIds.size, defaultValue: `${selectedIds.size} selected` })}
          </p>
          <div className="invoices-bulk-toolbar__actions">
            <button type="button" className="page-header__btn" onClick={handleExportSelected}>
              <Download className="clients-filters__btn-icon-svg" size={18} aria-hidden />
              {t('invoices.exportSelected')}
            </button>
            <button type="button" className="page-header__btn" onClick={() => setSelectedIds(new Set())}>
              {t('invoices.clearSelection')}
            </button>
          </div>
        </div>
      )}

      <div className="clients-filters-card">
        <div className="clients-filters__row clients-filters__row--main">
          <div className="clients-filters__search-wrap" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
            <Search className="clients-filters__search-icon" aria-hidden />
            <input
              type="search"
              placeholder={t('invoices.searchPlaceholder', 'Search invoice # or client…')}
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              className="clients-input clients-filters__search"
              aria-label={t('clients.search')}
            />
          </div>
          <div className="clients-filters__fields flex flex-wrap gap-2">
            <select
              value={status}
              onChange={(e) => {
                setPage(1)
                setStatus(e.target.value)
              }}
              className="clients-input"
              aria-label={t('invoices.filters.status', 'Status')}
            >
              <option value="">{t('invoices.filterAll')}</option>
              {STATUS_FILTER_VALUES.map((val) => (
                <option key={val} value={val}>
                  {statusLabel(val, t)}
                </option>
              ))}
            </select>
            <select
              value={currencyId}
              onChange={(e) => {
                setPage(1)
                setCurrencyId(e.target.value)
              }}
              className="clients-input"
              aria-label={t('invoices.filters.currency', 'Currency')}
            >
              <option value="">{t('invoices.filterAll')}</option>
              <option value="1">USD</option>
              <option value="2">EGP</option>
              <option value="3">EUR</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setPage(1)
                setDateFrom(e.target.value)
              }}
              className="clients-input"
              aria-label={t('invoices.dateFrom')}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setPage(1)
                setDateTo(e.target.value)
              }}
              className="clients-input"
              aria-label={t('invoices.dateTo')}
            />
          </div>
          <button
            type="button"
            className="clients-filters__clear clients-filters__btn-icon"
            onClick={clearFilters}
            aria-label={t('invoices.clearFilters')}
            title={t('invoices.clearFilters')}
          >
            <RotateCcw className="clients-filters__btn-icon-svg" aria-hidden />
          </button>
          <button
            type="button"
            className="clients-filters__sort-toggle clients-filters__btn-icon"
            onClick={() => setShowSort((v) => !v)}
            aria-expanded={showSort}
            aria-controls="invoices-sort-panel"
            id="invoices-sort-toggle"
            title={t('invoices.sortBy')}
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
              onClick={() => onExportCsv?.()}
              disabled={exportLoading}
              aria-label={t('pageHeader.export', 'Export')}
              title={t('pageHeader.export', 'Export')}
            >
              {exportLoading ? (
                <span className="clients-filters__export-spinner" aria-hidden />
              ) : (
                <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
              )}
            </button>
            {typeof onCreateInvoice === 'function' && (
              <button type="button" className="page-header__btn page-header__btn--primary" onClick={onCreateInvoice}>
                <Plus className="clients-filters__btn-icon-svg" size={18} aria-hidden />
                {t('invoices.create', 'Create Invoice')}
              </button>
            )}
          </div>
        </div>
        <div
          id="invoices-sort-panel"
          className="clients-filters__row clients-filters__row--sort"
          role="region"
          aria-labelledby="invoices-sort-toggle"
          hidden={!showSort}
        >
          <div className="clients-filters__sort-group">
            <label className="clients-filters__sort-label" htmlFor="invoices-sort-by">
              {t('invoices.sortBy')}
            </label>
            <select
              id="invoices-sort-by"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
              className="clients-select"
              aria-label={t('invoices.sortBy')}
            >
              <option value="date">{t('invoices.sortDate')}</option>
              <option value="number">{t('invoices.sortNumber')}</option>
              <option value="amount">{t('invoices.sortAmount')}</option>
            </select>
          </div>
        </div>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError(null)} />}

      {!loading && rows.length === 0 ? (
        <p className="clients-empty">{t('invoices.noInvoices')}</p>
      ) : (
        <Table
          columns={columns}
          data={rows}
          getRowKey={(r) => r.id}
          emptyMessage={loading ? t('invoices.loading') : t('invoices.noInvoices')}
        />
      )}

      {rows.length > 0 && pagination.last_page > 0 && (
        <div className="clients-pagination">
          <div className="clients-pagination__left">
            <span className="clients-pagination__total">
              {t('clients.total', 'Total')}: {pagination.total}
            </span>
            <label className="clients-pagination__per-page">
              <span className="clients-pagination__per-page-label">{t('clients.perPage', 'Per page')}</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
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
            totalPages={pagination.last_page}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      <InvoiceDetailModal
        invoiceId={detailId}
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        canManage={canManage}
        onChanged={() => {
          setDetailId(null)
          onChanged?.()
        }}
      />
    </div>
  )
}
