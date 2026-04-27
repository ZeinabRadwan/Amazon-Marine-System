import { useState, useEffect, useMemo } from 'react'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useTranslation } from 'react-i18next'
import { Ship, Truck, AlertCircle, Plus, FileSpreadsheet, Printer, LayoutGrid, Table2 } from 'lucide-react'
import '../../../components/PageHeader/PageHeader.css'
import '../../Clients/Clients.css'
import Tabs from '../../../components/Tabs'
import PricingCard from './PricingCard'
import InlandTransportTable from './InlandTransportTable'
import SeaFreightOffersTable from './SeaFreightOffersTable'
import OfferSkeleton from './OfferSkeleton'
import { useOffers } from '../../../hooks/usePricing'
import OfferDetailModal from './OfferDetailModal'
import CreateQuoteModal from './CreateQuoteModal'
import './OfferCard.css'
import { useAuthAccess } from '../../../hooks/useAuthAccess'
import PortNameAsyncSelect from './PortNameAsyncSelect'
import ClientsFilterToolbar from '../../../components/ClientsFilterToolbar'
import ListingPaginationFooter from '../../../components/ListingPaginationFooter'

/** Maps to `pricing_offer_items.code` (ocean freight OF rows — matches seeded/API pricing keys). */
const OCEAN_CONTAINER_ITEM_CODES = ['of20', 'of20rf', 'of40', 'of40rf']

const OFFER_VIEW_STORAGE_KEY = 'pricing-offer-view-mode'

function readStoredOfferViewMode() {
  try {
    const v = localStorage.getItem(OFFER_VIEW_STORAGE_KEY)
    return v === 'table' ? 'table' : 'grid'
  } catch {
    return 'grid'
  }
}

export default function RateSheet({ refreshKey, onEdit, onAddOffer }) {
  const { t, i18n } = useTranslation()
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
  const [offerViewMode, setOfferViewMode] = useState(readStoredOfferViewMode)

  const oceanContainerOptions = useMemo(
    () =>
      OCEAN_CONTAINER_ITEM_CODES.map((code) => ({
        value: code,
        label:
          code === 'of20'
            ? t('pricing.containerOptOf20', `20' Dry`)
            : code === 'of20rf'
              ? t('pricing.containerOptOf20Rf', `20' Reefer`)
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

  useEffect(() => {
    try {
      localStorage.setItem(OFFER_VIEW_STORAGE_KEY, offerViewMode)
    } catch {
      /* ignore */
    }
  }, [offerViewMode])

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
      <div className="rate-sheet-subtabs mb-6">
        <Tabs variant="sub" inline tabs={rateModeTabs} activeTab={type} onChange={handleRateModeChange} />
      </div>

      <ClientsFilterToolbar
        className="mb-8"
        language={i18n.language}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t('pricing.globalSearchPlaceholder', 'Search POL, POD, shipping line, region…'),
          ariaLabel: t('pricing.globalSearch', 'Global search'),
        }}
        filters={
          type === 'sea' ? (
            <>
              <PortNameAsyncSelect
                value={seaPol}
                onChange={setSeaPol}
                placeholder={t('pricing.filterAllPol', 'All POL')}
                aria-label={t('pricing.pol', 'POL')}
              />
              <PortNameAsyncSelect
                value={seaPod}
                onChange={setSeaPod}
                placeholder={t('pricing.filterAllPod', 'All POD')}
                aria-label={t('pricing.pod', 'POD')}
              />
              <select
                value={seaItemCode}
                onChange={(e) => setSeaItemCode(e.target.value)}
                className="clients-select w-full"
                aria-label={t('pricing.filterContainerType', 'Container Type')}
              >
                <option value="">{t('pricing.filterAllContainerTypes', 'All container types')}</option>
                {oceanContainerOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value)
                  setPod('')
                }}
                className="clients-select w-full"
                aria-label={t('pricing.governorate', 'Governorate')}
              >
                <option value="">{t('pricing.filterAllGovernorates', 'All governorates')}</option>
                {['القاهرة الكبرى', 'الإسكندرية', 'الدلتا'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <PortNameAsyncSelect
                value={pod}
                onChange={setPod}
                placeholder={t('pricing.filterAllPorts', 'All ports')}
                aria-label={t('pricing.port', 'Port')}
              />
            </>
          )
        }
        onClear={
          type === 'sea'
            ? () => {
                setSeaPol('')
                setSeaPod('')
                setSeaItemCode('')
                setSearch('')
              }
            : () => {
                setRegion('')
                setPod('')
                setSearch('')
              }
        }
        endActions={
          <>
            {loading ? (
              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap me-auto" aria-live="polite">
                {t('common.loading', 'Loading…')}
              </span>
            ) : null}
            <div className="clients-filters-toolbar__icon-cluster">
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
            </div>
            <div className="pricing-view-toggle shrink-0" role="group" aria-label={t('pricing.viewModeLabel', 'Layout')}>
              <button
                type="button"
                className="pricing-view-toggle__btn"
                aria-pressed={offerViewMode === 'grid'}
                aria-label={t('pricing.viewAsGrid', 'Grid')}
                title={t('pricing.viewAsGrid', 'Grid')}
                onClick={() => setOfferViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                className="pricing-view-toggle__btn"
                aria-pressed={offerViewMode === 'table'}
                aria-label={t('pricing.viewAsTable', 'Table')}
                title={t('pricing.viewAsTable', 'Table')}
                onClick={() => setOfferViewMode('table')}
              >
                <Table2 className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            </div>
            {typeof onAddOffer === 'function' && canManagePricingOffers ? (
              <div className="clients-filters__actions">
                <button
                  type="button"
                  className="clients-filters__btn-icon clients-filters__btn-icon--primary"
                  onClick={() => onAddOffer(type)}
                  aria-label={t('pricing.addPrice', 'Add Price')}
                  title={t('pricing.addPrice', 'Add Price')}
                >
                  <Plus className="clients-filters__btn-icon-svg" aria-hidden />
                </button>
              </div>
            ) : null}
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
          <div
            className={
              offerViewMode === 'grid'
                ? 'pricing-offer-cards offers-grid mb-8'
                : 'mb-8'
            }
          >
            {!loading && (!offers || offers.length === 0) ? (
              <div className="offers-grid__empty py-16 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-lg font-medium">{t('pricing.noOffers', 'No offers found matching your filters')}</p>
              </div>
            ) : type === 'inland' ? (
              offerViewMode === 'table' ? (
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
              ) : loading ? (
                Array.from({ length: 6 }).map((_, i) => <OfferSkeleton key={i} />)
              ) : (
                (offers || []).map((offer) => (
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
              )
            ) : offerViewMode === 'table' ? (
              <SeaFreightOffersTable
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
            ) : loading ? (
              Array.from({ length: 6 }).map((_, i) => <OfferSkeleton key={i} />)
            ) : (
              (offers || []).map((offer) => (
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
