import { useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Eye,
  MoreHorizontal,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Printer,
  FileSpreadsheet,
  Zap,
} from 'lucide-react'
import '../../../components/PageHeader/PageHeader.css'
import Table from '../../../components/Table/Table'
import { DropdownMenu } from '../../../components/DropdownMenu'
import { useQuotes, useMutateQuote } from '../../../hooks/usePricing'
import { useAuthAccess } from '../../../hooks/useAuthAccess'
import CreateQuoteModal from './CreateQuoteModal'
import QuoteDetailModal from './QuoteDetailModal'
import { formatDate, formatLocaleMoney, sortCurrencyCodes, sumAmountsByCurrencyFromItems } from '../../../utils/dateUtils'
import { getStoredToken } from '../../Login'
import { downloadQuotePdf } from '../../../api/pricing'
import ListPageToolbar from '../../../components/ListPageToolbar'
import ListingPaginationFooter from '../../../components/ListingPaginationFooter'

export default function QuotationTable({ refreshKey }) {
  const { t, i18n } = useTranslation()
  const { isPricingSalesViewOnly } = useAuthAccess()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)
  const debouncedSearch = useDebouncedValue(search.trim(), 320)
  const [createOpen, setCreateOpen] = useState(false)
  const [createInitialQuickMode, setCreateInitialQuickMode] = useState(false)
  const [detail, setDetail] = useState(null)
  const { accept, reject, get, loading: mutateLoading } = useMutateQuote()

  const { data: quotes, meta, loading, error, refetch } = useQuotes({
    q: debouncedSearch || undefined,
    page,
    per_page: perPage,
  })

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    setPage(1)
  }, [perPage])

  useEffect(() => {
    if (refreshKey > 0) refetch()
  }, [refreshKey])

  const handleView = async (row) => {
    try {
      const res = await get(row.id)
      setDetail(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAccept = async (row) => {
    try {
      await accept(row.id)
      refetch()
    } catch (e) {
      console.error(e)
    }
  }

  const handleReject = async (row) => {
    try {
      await reject(row.id)
      refetch()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDownloadPdf = async (row) => {
    try {
      const token = getStoredToken()
      if (!token) return
      const { blob } = await downloadQuotePdf(token, row.id, { locale: i18n.language })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      console.error(e)
    }
  }

  const getStatusBadge = (status) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"><CheckCircle2 className="h-3 w-3" /> {t('common.status.accepted', 'Accepted')}</span>
      case 'pending':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><Clock className="h-3 w-3" /> {t('common.status.pending', 'Pending')}</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"><XCircle className="h-3 w-3" /> {t('common.status.rejected', 'Rejected')}</span>
      default:
        return status
    }
  }

  const rowMenuItems = (row) => {
    const items = [{ label: t('common.view', 'View Details'), icon: <Eye className="h-4 w-4" />, onClick: () => handleView(row) }]
    if (!isPricingSalesViewOnly) {
      items.push(
        { label: t('pricing.accept', 'Accept'), onClick: () => handleAccept(row) },
        { label: t('pricing.reject', 'Reject'), onClick: () => handleReject(row) }
      )
    }
    items.push({
      label: t('common.download', 'Download PDF'),
      icon: <Download className="h-4 w-4" />,
      onClick: () => handleDownloadPdf(row),
    })
    return items
  }

  const columns = [
    {
      key: 'quote_no',
      label: t('pricing.quoteId', 'ID'),
      render: (val, row) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-bold text-blue-600 dark:text-blue-400">{val}</span>
          {row.is_quick_quotation ?? row.quick_mode ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              {t('pricing.quickQuotation', 'Quick Quotation')}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'client',
      label: t('pricing.client'),
      render: (val) => <span className="font-semibold">{val?.name || t('common.dash')}</span>,
    },
    {
      key: 'route',
      label: t('pricing.route'),
      render: (_, row) => (
        <span>
          {row.pol
            ? `${row.pol} → ${row.pod || ''}`
            : row.pod || t('common.dash')}
        </span>
      ),
    },
    {
      key: 'container_type',
      label: t('pricing.containerType'),
      render: (val) => val || t('common.dash'),
    },
    {
      key: 'price',
      label: t('pricing.price'),
      render: (_, row) => {
        const raw = row.totals_by_currency
        const map =
          raw && typeof raw === 'object' && Object.keys(raw).length
            ? raw
            : row.total_amount != null && row.total_amount !== ''
              ? { USD: Number(row.total_amount) }
              : sumAmountsByCurrencyFromItems(row.items)
        const keys = sortCurrencyCodes(Object.keys(map).filter((c) => Math.abs(Number(map[c]) || 0) > 1e-9))
        if (!keys.length) {
          return <span className="font-bold text-gray-900 dark:text-white">{formatLocaleMoney(0, 'USD', i18n.language)}</span>
        }
        return (
          <div className="flex flex-col gap-0.5 items-end">
            {keys.map((cur) => (
              <span key={cur} className="font-bold text-gray-900 dark:text-white tabular-nums">
                {formatLocaleMoney(map[cur], cur, i18n.language)}
              </span>
            ))}
          </div>
        )
      },
    },
    { key: 'status', label: t('pricing.status', 'Status'), render: (val) => getStatusBadge(val) },
    {
      key: 'sales',
      label: t('pricing.sales'),
      hideOnMobile: true,
      render: (_, row) => row.sales_user?.name || t('common.dash'),
    },
    {
      key: 'date',
      label: t('pricing.date'),
      hideOnMobile: true,
      render: (_, row) => formatDate(row.created_at, { locale: i18n.language }),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <div className="flex justify-end">
          <DropdownMenu
            align="end"
            trigger={
              <button className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </button>
            }
            items={rowMenuItems(row)}
          />
        </div>
      ),
    },
  ]

  const tableData = useMemo(() => quotes || [], [quotes])

  const onExportPdf = () => {
    window.alert(t('pricing.exportQuotationsPdfSoon', 'Export quotations to PDF will be available in a future update.'))
  }

  const onExportExcel = () => {
    window.alert(t('pricing.exportQuotationsExcelSoon', 'Export quotations to Excel will be available in a future update.'))
  }

  const openCreateQuotation = () => {
    setCreateInitialQuickMode(false)
    setCreateOpen(true)
  }

  const openQuickQuotation = () => {
    setCreateInitialQuickMode(true)
    setCreateOpen(true)
  }

  return (
    <div className="quotation-table space-y-4">
      <ListPageToolbar
        className="mb-6"
        heading={t('pricing.quotationsSearchLabel', 'Search')}
        left={
          <div className="w-full min-w-0 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={t('pricing.searchQuotes', 'Search by client or ID...')}
                placeholder={t('pricing.searchQuotes', 'Search by client or ID...')}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                autoComplete="off"
              />
            </div>
          </div>
        }
        right={
          <>
            <button
              type="button"
              className="clients-filters__btn-icon"
              onClick={onExportPdf}
              aria-label={t('common.exportPdf', 'Export to PDF')}
              title={t('common.exportPdf', 'Export to PDF')}
            >
              <Printer className="clients-filters__btn-icon-svg" aria-hidden />
            </button>
            <button
              type="button"
              className="clients-filters__btn-icon clients-filters__btn-icon--export"
              onClick={onExportExcel}
              aria-label={t('common.exportExcel', 'Export to Excel')}
              title={t('common.exportExcel', 'Export to Excel')}
            >
              <FileSpreadsheet className="clients-filters__btn-icon-svg" aria-hidden />
            </button>
            {!isPricingSalesViewOnly ? (
              <>
                <button type="button" className="page-header__btn page-header__btn--primary" onClick={openCreateQuotation}>
                  <Plus className="h-4 w-4" />
                  {t('pricing.createQuotation', 'Create Quotation')}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={openQuickQuotation}
                >
                  <Zap className="h-4 w-4" />
                  {t('pricing.quickQuotationMode', 'Quick Quotation Mode')}
                </button>
              </>
            ) : null}
          </>
        }
      />

      <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-6 text-sm text-red-700">{error}</div>
        ) : (
          <Table
            columns={columns}
            data={tableData}
            getRowKey={(r) => r.id}
            emptyMessage={loading ? t('common.loading', 'Loading...') : undefined}
          />
        )}
      </div>

      {!error && meta ? (
        <ListingPaginationFooter
          meta={meta}
          loading={loading}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          pageSize={perPage}
          perPageOptions={[10, 12, 25, 50]}
        />
      ) : null}

      <CreateQuoteModal
        isOpen={createOpen}
        initialQuickMode={createInitialQuickMode}
        onClose={() => {
          setCreateOpen(false)
          setCreateInitialQuickMode(false)
        }}
        onSuccess={() => refetch()}
      />

      <QuoteDetailModal
        isOpen={!!detail}
        quote={detail}
        onClose={() => setDetail(null)}
      />
    </div>
  )
}
