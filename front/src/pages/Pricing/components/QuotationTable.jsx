import { useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useTranslation } from 'react-i18next'
import {
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Plus,
  Trash2,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import Table from '../../../components/Table/Table'
import { IconActionButton } from '../../../components/Table'
import PricingInlineActions from './PricingInlineActions'
import { useQuotes, useMutateQuote } from '../../../hooks/usePricing'
import { useAuthAccess } from '../../../hooks/useAuthAccess'
import CreateQuoteModal from './CreateQuoteModal'
import QuoteDetailModal from './QuoteDetailModal'
import { sumAmountsByCurrencyFromItems } from '../../../utils/dateUtils'
import { CurrencyMapBadges } from '../../Accountings/CurrencyMapBadges'
import '../../Accountings/CurrencyMapBadges.css'
import ClientsFilterToolbar from '../../../components/ClientsFilterToolbar'
import ListingPaginationFooter from '../../../components/ListingPaginationFooter'
import '../../Clients/Clients.css'
import '../Pricing.css'

function quoteTotalsByCurrency(row) {
  const raw = row.totals_by_currency
  if (raw && typeof raw === 'object' && Object.keys(raw).length) {
    return raw
  }
  if (row.total_amount != null && row.total_amount !== '') {
    return { USD: Number(row.total_amount) }
  }
  return sumAmountsByCurrencyFromItems(row.items)
}

function quotePortLabel(row, dash) {
  const pod = String(row.pod || '').trim()
  const pol = String(row.pol || '').trim()
  if (pod && pol && pod !== pol) return `${pol} → ${pod}`
  return pod || pol || dash
}

function quoteSeaDirection(row) {
  if (String(row.pricing_type || '').toLowerCase() === 'inland') return null
  const direction = String(row.pricing_direction || 'export').toLowerCase()
  return direction === 'import' ? 'import' : 'export'
}

export default function QuotationTable({ refreshKey }) {
  const { t, i18n } = useTranslation()
  const { canManagePricingQuotes } = useAuthAccess()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)
  const debouncedSearch = useDebouncedValue(search.trim(), 320)
  const [createOpen, setCreateOpen] = useState(false)
  const [createInitialQuickMode, setCreateInitialQuickMode] = useState(false)
  const [detail, setDetail] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteRowLoading, setDeleteRowLoading] = useState(null)
  const [pdfRowLoading, setPdfRowLoading] = useState(null)
  const { accept, reject, get, delete: deleteQuote, downloadPdf } = useMutateQuote()

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

  const dash = t('common.dash', '—')

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
    if (!row?.id) return
    setPdfRowLoading(row.id)
    try {
      const { blob, filename } = await downloadPdf(row.id, { locale: i18n.language })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setPdfRowLoading(null)
    }
  }

  const getStatusBadge = (status) => {
    const key = String(status || 'pending').toLowerCase()
    switch (key) {
      case 'accepted':
        return (
          <span className="quotation-table__status quotation-table__status--accepted">
            <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />
            {t('common.status.accepted', 'Accepted')}
          </span>
        )
      case 'rejected':
        return (
          <span className="quotation-table__status quotation-table__status--rejected">
            <XCircle className="h-3 w-3 shrink-0" aria-hidden />
            {t('common.status.rejected', 'Rejected')}
          </span>
        )
      case 'pending':
      default:
        return (
          <span className="quotation-table__status quotation-table__status--pending">
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            {t('common.status.pending', 'Pending')}
          </span>
        )
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return
    const id = deleteTarget.id
    setDeleteRowLoading(id)
    try {
      await deleteQuote(id)
      setDeleteTarget(null)
      if (detail?.id === id) setDetail(null)
      refetch()
    } catch {
      // Error toast handled by pricing feedback service
    } finally {
      setDeleteRowLoading(null)
    }
  }

  const columns = [
    {
      key: 'quote_no',
      label: t('pricing.quotationColRecordNo', 'Record No.'),
      render: (val, row) => {
        const seaDirection = quoteSeaDirection(row)
        return (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-bold text-gray-900 dark:text-white font-mono tabular-nums">
              {val || (row.id != null ? String(row.id) : dash)}
            </span>
            {seaDirection === 'import' ? (
              <span className="quotation-table__direction quotation-table__direction--import">
                {t('pricing.quotationSeaDirectionImport')}
              </span>
            ) : seaDirection === 'export' ? (
              <span className="quotation-table__direction quotation-table__direction--export">
                {t('pricing.quotationSeaDirectionExport')}
              </span>
            ) : null}
            {row.is_quick_quotation ?? row.quick_mode ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                {t('pricing.quickModeBadgeShort', 'Quick')}
              </span>
            ) : null}
          </span>
        )
      },
    },
    {
      key: 'port',
      label: t('pricing.quotationColPort'),
      render: (_, row) => {
        const label = quotePortLabel(row, dash)
        if (label === dash) return dash
        return <span className="pricing-table-badge pricing-table-badge--muted">{label}</span>
      },
    },
    {
      key: 'shipping_line',
      label: t('pricing.quotationColShippingLine'),
      render: (_, row) => {
        const line = String(row.shipping_line || '').trim()
        if (!line) return dash
        return <span className="pricing-table-badge pricing-table-badge--carrier">{line}</span>
      },
    },
    {
      key: 'status',
      label: t('pricing.status', 'Status'),
      render: (val) => getStatusBadge(val),
    },
    {
      key: 'price',
      label: t('pricing.price'),
      render: (_, row) => (
        <div className="quotation-table__price-cell">
          <CurrencyMapBadges
            value={quoteTotalsByCurrency(row)}
            size="sm"
            numberLocale={i18n.language}
            emptyLabel={dash}
            zeroFallbackCurrencies={['USD']}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (_, row) => (
        <PricingInlineActions
          className="quotation-table__actions"
          label={t('pricing.rowActions', 'Row actions')}
        >
          <IconActionButton
            icon={<Eye className="h-4 w-4" />}
            label={t('common.view', 'View Details')}
            onClick={() => handleView(row)}
          />
          {canManagePricingQuotes ? (
            <>
              <IconActionButton
                icon={<Download className="h-4 w-4" />}
                label={t('pricing.downloadQuotePdf', 'Download PDF')}
                onClick={() => handleDownloadPdf(row)}
                disabled={pdfRowLoading === row.id}
              />
              <IconActionButton
                icon={<Check className="h-4 w-4" />}
                label={t('pricing.accept', 'Accept')}
                onClick={() => handleAccept(row)}
              />
              <IconActionButton
                icon={<X className="h-4 w-4" />}
                label={t('pricing.reject', 'Reject')}
                onClick={() => handleReject(row)}
              />
              <IconActionButton
                icon={<Trash2 className="h-4 w-4" />}
                label={t('pricing.quotationOptionDelete')}
                onClick={() => setDeleteTarget(row)}
                disabled={deleteRowLoading === row.id}
              />
            </>
          ) : null}
        </PricingInlineActions>
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
            {canManagePricingQuotes ? (
              <div className="clients-filters__actions quotation-toolbar-actions">
                <button
                  type="button"
                  className="clients-filters__btn-icon clients-filters__btn-icon--primary quotation-toolbar-actions__btn quotation-toolbar-actions__btn--primary"
                  onClick={openCreateQuotation}
                  aria-label={t('pricing.createQuotation', 'إنشاء عرض سعر')}
                  title={t('pricing.createQuotation', 'إنشاء عرض سعر')}
                >
                  <Plus className="clients-filters__btn-icon-svg quotation-toolbar-actions__icon" aria-hidden />
                  <span className="quotation-toolbar-actions__label">
                    {t('pricing.createQuotation', 'إنشاء عرض سعر')}
                  </span>
                </button>
                <button
                  type="button"
                  className="clients-filters__btn-icon quotation-toolbar-actions__btn quotation-toolbar-actions__btn--secondary"
                  onClick={openQuickQuotation}
                  aria-label={t('pricing.createQuickQuotation', 'إنشاء عرض سريع')}
                  title={t('pricing.createQuickQuotation', 'إنشاء عرض سريع')}
                >
                  <Zap className="clients-filters__btn-icon-svg quotation-toolbar-actions__icon" aria-hidden />
                  <span className="quotation-toolbar-actions__label">
                    {t('pricing.createQuickQuotation', 'إنشاء عرض سريع')}
                  </span>
                </button>
              </div>
            ) : null}
          </>
        }
      />

      <div className="glass-panel rounded-2xl overflow-hidden">
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

      {deleteTarget ? (
        <div className="clients-modal" role="dialog" aria-modal="true" aria-labelledby="quotation-delete-title">
          <div className="clients-modal-backdrop" onClick={() => !deleteRowLoading && setDeleteTarget(null)} />
          <div className="clients-modal-content">
            <h2 id="quotation-delete-title">{t('pricing.quotationOptionDeleteConfirm')}</h2>
            <div className="clients-modal-actions">
              <button
                type="button"
                className="clients-btn"
                onClick={() => setDeleteTarget(null)}
                disabled={Boolean(deleteRowLoading)}
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className="clients-btn clients-btn--danger"
                onClick={handleDeleteConfirm}
                disabled={Boolean(deleteRowLoading)}
              >
                {deleteRowLoading ? t('common.deleting', 'Deleting…') : t('pricing.quotationOptionDelete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
