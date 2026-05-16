import { useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useTranslation } from 'react-i18next'
import {
  Eye,
  MoreHorizontal,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react'
import Table from '../../../components/Table/Table'
import { IconActionButton, IconActionButtonGroup } from '../../../components/Table'
import { DropdownMenu } from '../../../components/DropdownMenu'
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
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteRowLoading, setDeleteRowLoading] = useState(null)
  const { accept, reject, get, delete: deleteQuote } = useMutateQuote()

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
      label: t('pricing.quotationColCustomerNo'),
      render: (val, row) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-bold text-gray-900 dark:text-white">{val || dash}</span>
          {row.is_quick_quotation ?? row.quick_mode ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
              {t('pricing.quickQuotation', 'Quick Quotation')}
            </span>
          ) : null}
        </span>
      ),
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
        <div className="flex justify-end items-center gap-1">
          <IconActionButtonGroup aria-label={t('pricing.rowActions', 'Row actions')}>
            <IconActionButton
              icon={<Eye className="h-4 w-4" />}
              label={t('common.view', 'View Details')}
              onClick={() => handleView(row)}
              segment={!isPricingSalesViewOnly ? 'first' : 'single'}
            />
            {!isPricingSalesViewOnly ? (
              <IconActionButton
                icon={<Trash2 className="h-4 w-4" />}
                label={t('pricing.quotationOptionDelete')}
                variant="danger"
                onClick={() => setDeleteTarget(row)}
                disabled={deleteRowLoading === row.id}
                segment="last"
              />
            ) : null}
          </IconActionButtonGroup>
          {!isPricingSalesViewOnly ? (
            <DropdownMenu
              portaled
              align="end"
              trigger={
                <button
                  type="button"
                  className="clients-filters__btn-icon h-8 w-8 min-w-0 min-h-0"
                  aria-label={t('pricing.rowActions', 'Row actions')}
                  title={t('pricing.rowActions', 'Row actions')}
                >
                  <MoreHorizontal className="clients-filters__btn-icon-svg" aria-hidden />
                </button>
              }
              items={rowMenuItems(row)}
            />
          ) : null}
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
            <h2 id="quotation-delete-title">{t('pricing.quotationOptionDeleteTitle')}</h2>
            <p>{t('pricing.quotationOptionDeleteConfirm')}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400" dir="rtl">
              {t('pricing.quotationOptionDeleteConfirmAr')}
            </p>
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
