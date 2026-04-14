import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Filter, Eye, MoreHorizontal, Download, CheckCircle2, Clock, XCircle } from 'lucide-react'
import Table from '../../../components/Table/Table'
import { DropdownMenu } from '../../../components/DropdownMenu'
import { useQuotes, useMutateQuote } from '../../../hooks/usePricing'
import CreateQuoteModal from './CreateQuoteModal'
import QuoteDetailModal from './QuoteDetailModal'
import { formatDate } from '../../../utils/dateUtils'

export default function QuotationTable({ refreshKey, openCreateSignal, onCreateClosed }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const { accept, reject, get, loading: mutateLoading } = useMutateQuote()

  const { data: quotes, meta, loading, error, refetch } = useQuotes({
    q: search || undefined,
    page,
    per_page: 12,
  })

  useEffect(() => {
    if (refreshKey > 0) refetch()
  }, [refreshKey])

  useEffect(() => {
    if (openCreateSignal > 0) {
      setCreateOpen(true)
      onCreateClosed?.()
    }
  }, [openCreateSignal])

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

  const columns = [
    { key: 'quote_no', label: t('pricing.quoteId', 'ID'), render: (val) => <span className="font-bold text-blue-600 dark:text-blue-400">{val}</span> },
    { key: 'client', label: t('pricing.client', 'Client'), render: (val) => <span className="font-semibold">{val?.name || '—'}</span> },
    { key: 'route', label: t('pricing.route', 'Route'), render: (_, row) => <span>{row.pol ? `${row.pol} → ${row.pod || ''}` : row.pod || '—'}</span> },
    { key: 'container_type', label: t('pricing.containerType', 'Container'), render: (val) => val || '—' },
    { key: 'price', label: t('pricing.price', 'Price'), render: (_, row) => <span className="font-bold text-gray-900 dark:text-white">$ {(row.total_amount ?? 0).toLocaleString('en-US')}</span> },
    { key: 'status', label: t('pricing.status', 'Status'), render: (val) => getStatusBadge(val) },
    { key: 'sales', label: t('pricing.sales', 'Sales'), hideOnMobile: true, render: (_, row) => row.sales_user?.name || '—' },
    { key: 'date', label: t('pricing.date', 'Date'), hideOnMobile: true, render: (_, row) => formatDate(row.created_at) },
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
            items={[
              { label: t('common.view', 'View Details'), icon: <Eye className="h-4 w-4" />, onClick: () => handleView(row) },
              { label: t('pricing.accept', 'Accept'), onClick: () => handleAccept(row) },
              { label: t('pricing.reject', 'Reject'), onClick: () => handleReject(row) },
              { label: t('common.download', 'Download PDF'), icon: <Download className="h-4 w-4" />, onClick: () => console.log('Download', row.id) },
            ]}
          />
        </div>
      ),
    },
  ]

  const tableData = useMemo(() => quotes || [], [quotes])

  return (
    <div className="quotation-table space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('pricing.searchQuotes', 'Search by client or ID...')}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <Filter className="h-4 w-4" />
            {t('common.filter', 'Filter')}
          </button>
        </div>
      </div>

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

      <CreateQuoteModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
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
