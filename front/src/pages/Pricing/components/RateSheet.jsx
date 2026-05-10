import { useState, useEffect, useMemo } from 'react'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useTranslation } from 'react-i18next'
import { Ship, Truck, AlertCircle, Plus } from 'lucide-react'
import '../../../components/PageHeader/PageHeader.css'
import '../../Clients/Clients.css'
import Tabs from '../../../components/Tabs'
import InlandTransportTable from './InlandTransportTable'
import SeaFreightOffersTable from './SeaFreightOffersTable'
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

  const rateModeTabs = [
    { id: 'sea', label: t('pricing.oceanFreight', 'Ocean Freight'), icon: <Ship className="h-4 w-4" /> },
    { id: 'inland', label: t('pricing.inlandTransport', 'Inland Transport'), icon: <Truck className="h-4 w-4" /> },
  ]

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
                {['القاهرة', 'الجيزة', 'الإسكندرية', 'الشرقية', 'المنوفية', 'البحيرة', 'الإسماعيلية', 'بورسعيد', 'السويس', 'القاهرة الكبرى', 'الدلتا'].map((r) => (
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
            className="mb-8"
          >
            {type === 'inland' ? (
              <InlandTransportTable
                offers={offers || []}
                loading={loading}
                onEdit={onEdit}
                canManageOffers={canManagePricingOffers}
                onView={setDetailOffer}
              />
            ) : (
              <SeaFreightOffersTable
                offers={offers || []}
                loading={loading}
                onEdit={onEdit}
                canManageOffers={canManagePricingOffers}
                onView={setDetailOffer}
              />
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
