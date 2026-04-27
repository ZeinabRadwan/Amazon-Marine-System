import { useState, useEffect, useMemo } from 'react'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useTranslation } from 'react-i18next'
import { Ship, Truck, Search, AlertCircle, Plus, FileSpreadsheet, Printer } from 'lucide-react'
import '../../../components/PageHeader/PageHeader.css'
import '../../Clients/Clients.css'
import Tabs from '../../../components/Tabs'
import PricingCard from './PricingCard'
import InlandTransportTable from './InlandTransportTable'
import OfferSkeleton from './OfferSkeleton'
import { useOffers } from '../../../hooks/usePricing'
import OfferDetailModal from './OfferDetailModal'
import CreateQuoteModal from './CreateQuoteModal'
import './OfferCard.css'
import { useAuthAccess } from '../../../hooks/useAuthAccess'
import PortNameAsyncSelect from './PortNameAsyncSelect'
import ListPageToolbar from '../../../components/ListPageToolbar'
import ListingPaginationFooter from '../../../components/ListingPaginationFooter'

/** Maps to `pricing_offer_items.code` (ocean freight OF rows — matches seeded/API pricing keys). */
const OCEAN_CONTAINER_ITEM_CODES = ['of20', 'of40', 'of40rf']

export default function RateSheet({ refreshKey, onEdit, onAddOffer }) {
  const { t } = useTranslation()
  const { canManagePricingOffers, isPricingSalesViewOnly } = useAuthAccess()
  const [type, setType] = useState('sea')
  const [seaPol, setSeaPol] = useState('')
  const [seaPod, setSeaPod] = useState('')
  const [seaItemCode, setSeaItemCode] = useState('')
  const [region, setRegion] = useState('')
  const [pod, setPod] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)
  const [detailOffer, setDetailOffer] = useState(null)
  const [quoteSourceOffer, setQuoteSourceOffer] = useState(null)
  const [createQuoteOpen, setCreateQuoteOpen] = useState(false)

  const oceanContainerOptions = useMemo(
    () =>
      OCEAN_CONTAINER_ITEM_CODES.map((code) => ({
        value: code,
        label:
          code === 'of20'
            ? t('pricing.containerOptOf20', `20' Dry`)
            : code === 'of40'
              ? t('pricing.containerOptOf40Hc', `40' Dry / HC`)
              : t('pricing.containerOptOf40Rf', `40' Reefer`),
      })),
    [t]
  )

  /** Debounced so POL/POD/container react immediately; text search still combines via AND on the server. */
  const debouncedSearch = useDebouncedValue(search.trim(), 320)

  // Reset page when any filter changes (debounced text counts as one logical filter).
  useEffect(() => {
    setPage(1)
  }, [type, seaPol, seaPod, seaItemCode, region, pod, debouncedSearch])

  useEffect(() => {
    setPage(1)
  }, [perPage])

  const offerParams =
    type === 'sea'
      ? {
          pricing_type: 'sea',
          pol: seaPol || undefined,
          pod: seaPod || undefined,
          pricing_item_code: seaItemCode || undefined,
          q: debouncedSearch || undefined,
          page,
          per_page: perPage,
        }
      : {
          pricing_type: 'inland',
          region: region || undefined,
          inland_port: pod || undefined,
          q: debouncedSearch || undefined,
          page,
          per_page: perPage,
        }

  const { data: offers, meta, loading, error, refetch } = useOffers(offerParams)

  const handleRateModeChange = (id) => {
    setType(id)
    setSearch('')
    if (id === 'sea') {
      setRegion('')
      setPod('')
    } else {
      setSeaPol('')
      setSeaPod('')
      setSeaItemCode('')
    }
  }

  // Watch refreshKey to re-fetch on successful create/edit
  useEffect(() => {
    if (refreshKey > 0) refetch()
  }, [refreshKey])

  const rateModeTabs = [
    { id: 'sea', label: t('pricing.oceanFreight', 'Ocean Freight'), icon: <Ship className="h-4 w-4" /> },
    { id: 'inland', label: t('pricing.inlandTransport', 'Inland Transport'), icon: <Truck className="h-4 w-4" /> },
  ]

  const onExportExcel = () => {
    window.alert(t('pricing.exportExcelSoon', 'Export to Excel will be available in a future update.'))
  }

  const onExportPdf = () => {
    window.alert(t('pricing.exportPdfSoon', 'Export to PDF will be available in a future update.'))
  }

  return (
    <div className="rate-sheet">
      <div className="mb-6 pricing-section-tabs-wrap">
        <div className="rate-sheet-nested-tabs">
          <Tabs
            className="pricing-tabs-wrap"
            variant="sub"
            tabs={rateModeTabs}
            activeTab={type}
            onChange={handleRateModeChange}
          />
        </div>
      </div>

      <ListPageToolbar
        className="mb-8"
        heading={t('pricing.filtersHeading', 'Filters')}
        left={
          <>
              {type === 'sea' ? (
                <>
                  <div className="w-full min-w-0">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {t('pricing.globalSearch', 'Global search')}
                    </label>
                    <div className="relative max-w-xl">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('pricing.globalSearchPlaceholder', 'Search POL, POD, shipping line, region…')}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="w-full min-w-[160px] sm:w-44">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {t('pricing.pol', 'POL')}
                    </label>
                    <PortNameAsyncSelect
                      value={seaPol}
                      onChange={setSeaPol}
                      placeholder={t('common.all', 'All')}
                      className="rate-sheet-async-filter"
                    />
                  </div>

                  <div className="w-full min-w-[160px] sm:w-44">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {t('pricing.pod', 'POD')}
                    </label>
                    <PortNameAsyncSelect
                      value={seaPod}
                      onChange={setSeaPod}
                      placeholder={t('common.all', 'All')}
                      className="rate-sheet-async-filter"
                    />
                  </div>

                  <div className="w-full min-w-[160px] sm:w-48">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {t('pricing.filterContainerType', 'Container Type')}
                    </label>
                    <select
                      value={seaItemCode}
                      onChange={(e) => setSeaItemCode(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">{t('common.all', 'All')}</option>
                      {oceanContainerOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setSeaPol(''); setSeaPod(''); setSeaItemCode(''); setSearch(''); }}
                    className="h-[42px] px-4 sm:px-6 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
                  >
                    {t('common.clear', 'Clear')}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-[200px] max-w-md">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {t('pricing.globalSearch', 'Global search')}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('pricing.globalSearchPlaceholder', 'Search POL, POD, shipping line, region…')}
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="w-full min-w-[160px] sm:w-44">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {t('pricing.governorate', 'Governorate')}
                    </label>
                    <select
                      value={region}
                      onChange={(e) => { setRegion(e.target.value); setPod(''); }}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="">{t('common.all', 'All')}</option>
                      {['القاهرة الكبرى', 'الإسكندرية', 'الدلتا'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div className="w-full min-w-[160px] sm:w-44">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {t('pricing.port', 'Port')}
                    </label>
                    <PortNameAsyncSelect
                      value={pod}
                      onChange={setPod}
                      placeholder={t('common.all', 'All')}
                      className="rate-sheet-async-filter"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => { setRegion(''); setPod(''); setSearch(''); }}
                    className="h-[42px] px-4 sm:px-6 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
                  >
                    {t('common.clear', 'Clear')}
                  </button>
                </>
              )}
          </>
        }
        right={
          <>
            {typeof onAddOffer === 'function' && canManagePricingOffers ? (
              <button type="button" className="page-header__btn page-header__btn--primary" onClick={() => onAddOffer(type)}>
                <Plus className="h-4 w-4" />
                {t('pricing.addPrice', 'Add Price')}
              </button>
            ) : null}
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
          </>
        }
      />

      {error ? (
        <div className="flex flex-col items-center justify-center py-16 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/50">
          <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
          <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          <button onClick={refetch} className="mt-4 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm font-bold shadow-sm border border-gray-200 dark:border-gray-700">
            {t('common.retry', 'Retry')}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 px-1 min-h-[1.25rem]" aria-live="polite">
            {loading ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">{t('common.loading', 'Loading…')}</p>
            ) : (
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300" role="status">
                {t('pricing.resultsFound', '{{count}} results found', {
                  count: meta?.total ?? offers?.length ?? 0,
                })}
              </p>
            )}
          </div>
          <div className={type === 'inland' ? 'mb-8' : 'pricing-offer-cards offers-grid mb-8'}>
            {type === 'inland' ? (
              !loading && (!offers || offers.length === 0) ? (
                <div className="offers-grid__empty py-16 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-lg font-medium">{t('pricing.noOffers', 'No offers found matching your filters')}</p>
                </div>
              ) : (
                <InlandTransportTable
                  offers={offers || []}
                  loading={loading}
                  onMutate={refetch}
                  onEdit={onEdit}
                  canManageOffers={canManagePricingOffers}
                  showCreateQuotation={!isPricingSalesViewOnly}
                  onView={setDetailOffer}
                  onCreateQuotation={(selectedOffer) => {
                    setQuoteSourceOffer(selectedOffer)
                    setCreateQuoteOpen(true)
                  }}
                />
              )
            ) : loading ? (
              Array.from({ length: 6 }).map((_, i) => <OfferSkeleton key={i} />)
            ) : offers?.length > 0 ? (
              offers.map((offer) => (
                <PricingCard
                  key={offer.id}
                  offer={offer}
                  onMutate={refetch}
                  onEdit={onEdit}
                  canManageOffers={canManagePricingOffers}
                  showCreateQuotation={!isPricingSalesViewOnly}
                  onView={setDetailOffer}
                  onCreateQuotation={(selectedOffer) => {
                    setQuoteSourceOffer(selectedOffer)
                    setCreateQuoteOpen(true)
                  }}
                />
              ))
            ) : (
              <div className="offers-grid__empty py-16 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-lg font-medium">{t('pricing.noOffers', 'No offers found matching your filters')}</p>
              </div>
            )}
          </div>

          {meta ? (
            <ListingPaginationFooter
              meta={meta}
              loading={loading}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
              pageSize={perPage}
              perPageOptions={[10, 12, 25, 50]}
            />
          ) : null}
        </>
      )}

      <OfferDetailModal
        isOpen={!!detailOffer}
        offer={detailOffer}
        onClose={() => setDetailOffer(null)}
        onCreateQuotation={
          isPricingSalesViewOnly
            ? undefined
            : (o) => {
                setQuoteSourceOffer(o)
                setCreateQuoteOpen(true)
              }
        }
      />

      <CreateQuoteModal
        isOpen={createQuoteOpen}
        initialOffer={quoteSourceOffer}
        onClose={() => {
          setCreateQuoteOpen(false)
          setQuoteSourceOffer(null)
        }}
        onSuccess={() => {
          setCreateQuoteOpen(false)
          setQuoteSourceOffer(null)
        }}
      />
    </div>
  )
}
