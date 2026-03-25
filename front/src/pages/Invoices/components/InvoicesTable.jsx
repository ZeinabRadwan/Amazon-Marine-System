import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Filter, Download, Eye, DollarSign, XCircle, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import Table from '../../../components/Table/Table'
import { DropdownMenu } from '../../../components/DropdownMenu'
import { getStoredToken } from '../../Login'
import { listInvoices, exportInvoicesCsv } from '../../../api/invoices'
import InvoiceDetailModal from './InvoiceDetailModal'

function statusBadge(status, t) {
  const s = String(status || '').toLowerCase()
  if (s === 'paid') return { label: t('invoices.status.paid', 'Paid'), cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: <CheckCircle2 className="h-3 w-3" /> }
  if (s === 'partial') return { label: t('invoices.status.partial', 'Partial'), cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: <Clock className="h-3 w-3" /> }
  if (s === 'cancelled') return { label: t('invoices.status.cancelled', 'Cancelled'), cls: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300', icon: <XCircle className="h-3 w-3" /> }
  if (s === 'issued') return { label: t('invoices.status.issued', 'Issued'), cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: <AlertCircle className="h-3 w-3" /> }
  if (s === 'draft') return { label: t('invoices.status.draft', 'Draft'), cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: <AlertCircle className="h-3 w-3" /> }
  return { label: status || '—', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: <AlertCircle className="h-3 w-3" /> }
}

export default function InvoicesTable({ refreshKey, invoiceType, onChanged }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [month, setMonth] = useState('')
  const [sort, setSort] = useState('date')
  const [page, setPage] = useState(1)
  const [perPage] = useState(20)

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
      month: month || undefined,
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
  }, [refreshKey, invoiceType, search, status, currencyId, month, sort, page])

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

  const columns = useMemo(() => {
    return [
      {
        key: 'select',
        label: (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
            aria-label={t('common.selectAll', 'Select all')}
          />
        ),
        render: (_, row) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.id)}
            onChange={(e) => toggleOne(row.id, e.target.checked)}
            aria-label={t('common.select', 'Select')}
          />
        ),
        sortable: false,
      },
      { key: 'invoice_number', label: t('invoices.table.number', 'Invoice #') },
      { key: 'party_name', label: t('invoices.table.party', 'Client/Partner') },
      { key: 'shipment_bl', label: t('invoices.table.shipment', 'Shipment') },
      { key: 'amount', label: t('invoices.table.amount', 'Amount'), render: (v, r) => <span className="font-bold">{Number(v || 0).toLocaleString()}</span> },
      { key: 'currency_code', label: t('invoices.table.currency', 'Currency') },
      {
        key: 'status',
        label: t('invoices.table.status', 'Status'),
        render: (v) => {
          const b = statusBadge(v, t)
          return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${b.cls}`}>{b.icon}{b.label}</span>
        },
      },
      { key: 'is_vat_invoice', label: t('invoices.table.vat', 'VAT'), render: (v) => (v ? t('common.yes', 'Yes') : t('common.no', 'No')) },
      { key: 'issue_date', label: t('invoices.table.date', 'Date') },
      {
        key: 'actions',
        label: '',
        render: (_, row) => (
          <div className="flex justify-end">
            <DropdownMenu
              align="end"
              trigger={
                <button className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <Eye className="h-4 w-4 text-gray-400" />
                </button>
              }
              items={[
                { label: t('common.view', 'View'), onClick: () => setDetailId(row.id) },
              ]}
            />
          </div>
        ),
        sortable: false,
      },
    ]
  }, [rows, selectedIds, allSelected, t])

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('invoices.bulk.selected', { count: selectedIds.size, defaultValue: `Selected ${selectedIds.size} invoices` })}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={handleExportSelected} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/20">
              <Download className="h-4 w-4" /> {t('common.exportSelected', 'Export selected')}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/20">
              {t('common.clear', 'Clear')}
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('common.search', 'Search')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value) }}
                placeholder={t('invoices.searchPlaceholder', 'Search invoice # or client...')}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('invoices.filters.status', 'Status')}
            </label>
            <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none">
              <option value="">{t('common.all', 'All')}</option>
              <option value="paid">paid</option>
              <option value="partial">partial</option>
              <option value="unpaid">unpaid</option>
              <option value="overdue">overdue</option>
              <option value="issued">issued</option>
              <option value="draft">draft</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <div className="w-40">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('invoices.filters.currency', 'Currency')}
            </label>
            <select value={currencyId} onChange={(e) => { setPage(1); setCurrencyId(e.target.value) }} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none">
              <option value="">{t('common.all', 'All')}</option>
              <option value="1">USD</option>
              <option value="2">EGP</option>
              <option value="3">EUR</option>
            </select>
          </div>

          <div className="w-44">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('invoices.filters.month', 'Month')}
            </label>
            <input type="month" value={month} onChange={(e) => { setPage(1); setMonth(e.target.value) }} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
          </div>

          <div className="w-44">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('common.sort', 'Sort')}
            </label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none">
              <option value="date">date</option>
              <option value="number">number</option>
              <option value="amount">amount</option>
              <option value="status">status</option>
              <option value="party">party</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
          <Table
            columns={columns}
            data={rows}
            getRowKey={(r) => r.id}
            emptyMessage={loading ? t('common.loading', 'Loading...') : undefined}
          />
        </div>
      )}

      {meta?.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50"
          >
            {t('common.prev', 'Prev')}
          </button>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {t('common.page', 'Page')} {meta.current_page} {t('common.of', 'of')} {meta.last_page}
          </span>
          <button
            disabled={page >= meta.last_page}
            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50"
          >
            {t('common.next', 'Next')}
          </button>
        </div>
      )}

      <InvoiceDetailModal
        invoiceId={detailId}
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        onChanged={() => {
          setDetailId(null)
          onChanged?.()
        }}
      />
    </div>
  )
}

