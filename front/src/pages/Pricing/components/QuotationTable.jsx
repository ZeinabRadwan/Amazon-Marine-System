import { useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useTranslation } from 'react-i18next'
import {
  Eye,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Zap,
} from 'lucide-react'
import Table from '../../../components/Table/Table'
import { DropdownMenu } from '../../../components/DropdownMenu'
import { useQuotes, useMutateQuote } from '../../../hooks/usePricing'
import { useAuthAccess } from '../../../hooks/useAuthAccess'
import CreateQuoteModal from './CreateQuoteModal'
import QuoteDetailModal from './QuoteDetailModal'
import { formatDate, formatLocaleMoney, sortCurrencyCodes, sumAmountsByCurrencyFromItems } from '../../../utils/dateUtils'
import ClientsFilterToolbar from '../../../components/ClientsFilterToolbar'
import ListingPaginationFooter from '../../../components/ListingPaginationFooter'
import '../Pricing.css'

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
      render: (val) =>
        val ? (
          <span className="pricing-table-badge pricing-table-badge--muted">{val}</span>
        ) : (
          t('common.dash')
        ),
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
          return (
            <span className="pricing-money-total text-gray-900 dark:text-white">{formatLocaleMoney(0, 'USD', i18n.language)}</span>
          )
        }
        return (
          <div className="flex flex-col gap-0.5 items-end">
            {keys.map((cur) => (
              <span key={cur} className="pricing-money-total text-gray-900 dark:text-white">
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
            portaled
            align="end"
            trigger={
              <button
                type="button"
                className="clients-filters__btn-icon h-8 w-8 min-w-0 min-h-0 border-gray-200 dark:border-gray-600"
                aria-label={t('pricing.rowActions', 'Row actions')}
                title={t('pricing.rowActions', 'Row actions')}
              >
                <MoreHorizontal className="clients-filters__btn-icon-svg" aria-hidden />
              </button>
            }
            items={rowMenuItems(row)}
          />
        </div>
      ),
    },
  ]

  const tableData = useMemo(() => quotes || [], [quotes])

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
      <ClientsFilterToolbar
        className="mb-6"
        language={i18n.language}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t('pricing.searchQuotes', 'Search by client or ID...'),
          ariaLabel: t('pricing.searchQuotes', 'Search by client or ID...'),
        }}
        filters={null}
        onClear={() => setSearch('')}
        endActions={
          <>
            {!isPricingSalesViewOnly ? (
              <div className="clients-filters__actions">
                <div className="clients-filters-toolbar__icon-cluster">
                  <button
                    type="button"
                    className="clients-filters__btn-icon clients-filters__btn-icon--primary"
                    onClick={openCreateQuotation}
                    aria-label={t('pricing.createQuotation', 'Create Quotation')}
                    title={t('pricing.createQuotation', 'Create Quotation')}
                  >
                    <Plus className="clients-filters__btn-icon-svg" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="clients-filters__btn-icon"
                    onClick={openQuickQuotation}
                    aria-label={t('pricing.quickQuotationMode', 'Quick Quotation Mode')}
                    title={t('pricing.quickQuotationMode', 'Quick Quotation Mode')}
                  >
                    <Zap className="clients-filters__btn-icon-svg" aria-hidden />
                  </button>
                </div>
              </div>
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
