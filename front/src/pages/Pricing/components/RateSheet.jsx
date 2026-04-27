import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Ship, Truck, Search, Filter, X, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import PricingCard from './PricingCard'
import OfferSkeleton from './OfferSkeleton'
import { useOffers } from '../../../hooks/usePricing'
import OfferDetailModal from './OfferDetailModal'
import CreateQuoteModal from './CreateQuoteModal'

const REGIONS_PODS = {
  'Red Sea': ['Jeddah', 'Port Sudan', 'Aqaba', 'Hodeidah'],
  'Mediterranean': ['Port Said', 'Damietta', 'Istanbul', 'Marseille', 'Genoa', 'Barcelona'],
  'Gulf': ['Dubai', 'Jebel Ali', 'King Abdullah Port', 'Salalah', 'Doha'],
  'Europe': ['Hamburg', 'Rotterdam', 'Antwerp', 'Le Havre'],
}

const INLAND_PORTS = [
  { value: 'Alex', label: 'Alexandria' },
  { value: 'PortSaidWest', label: 'Port Said West' },
  { value: 'PortSaidEast', label: 'Port Said East' },
  { value: 'Damietta', label: 'Damietta' },
  { value: 'Sokhna', label: 'Ain Sokhna' }
]

export default function RateSheet({ refreshKey, onEdit }) {
  const { t } = useTranslation()
  const [type, setType] = useState('sea')
  const [region, setRegion] = useState('')
  const [pod, setPod] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [detailOffer, setDetailOffer] = useState(null)
  const [quoteSourceOffer, setQuoteSourceOffer] = useState(null)
  const [createQuoteOpen, setCreateQuoteOpen] = useState(false)

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [type, region, pod, search])

  // Watch refreshKey to re-fetch on successful create/edit
  useEffect(() => {
    if (refreshKey > 0) refetch()
  }, [refreshKey])

  const { data: offers, meta, loading, error, refetch } = useOffers({
    pricing_type: type,
    region: region || undefined,
    pod: type === 'sea' ? pod || undefined : undefined,
    inland_port: type === 'inland' ? pod || undefined : undefined,
    q: search || undefined,
    page,
    per_page: 12
  })

  return (
    <div className="rate-sheet">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
          <button
            onClick={() => setType('sea')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${type === 'sea' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Ship className="h-4 w-4" />
            {t('pricing.shippingLines', 'Shipping Lines')}
          </button>
          <button
            onClick={() => setType('inland')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold transition-all ${type === 'inland' ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-600 dark:text-amber-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Truck className="h-4 w-4" />
            {t('pricing.inlandTransport', 'Inland Transport')}
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-6 mb-8 shadow-sm">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('pricing.quickSearch', 'Quick Search (Port Name)')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('pricing.searchPlaceholder', 'Ex: Jeddah, Dubai, Hamburg...')}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {type === 'sea' ? t('pricing.region', 'Region') : t('pricing.governorate', 'Governorate')}
            </label>
            <select
              value={region}
              onChange={(e) => { setRegion(e.target.value); setPod(''); }}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">{t('common.all', 'All')}</option>
              {type === 'sea' 
                ? Object.keys(REGIONS_PODS).map(r => <option key={r} value={r}>{r}</option>)
                : ['القاهرة الكبرى', 'الإسكندرية', 'الدلتا'].map(r => <option key={r} value={r}>{r}</option>) // Updated inline with mock data
              }
            </select>
          </div>

          <div className="w-48">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {type === 'sea' ? t('pricing.pod', 'POD') : t('pricing.port', 'Port')}
            </label>
            <select
              value={pod}
              onChange={(e) => setPod(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">{t('common.all', 'All')}</option>
              {type === 'sea' && region
                ? REGIONS_PODS[region]?.map(p => <option key={p} value={p}>{p}</option>)
                : INLAND_PORTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)
              }
            </select>
          </div>

          <button 
            onClick={() => { setRegion(''); setPod(''); setSearch(''); }}
            className="h-[42px] px-6 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {t('common.clear', 'Clear')}
          </button>
        </div>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <OfferSkeleton key={i} />)
            ) : offers?.length > 0 ? (
              offers.map(offer => (
                <PricingCard
                  key={offer.id}
                  offer={offer}
                  onMutate={refetch}
                  onEdit={onEdit}
                  onView={setDetailOffer}
                  onCreateQuotation={(selectedOffer) => {
                    setQuoteSourceOffer(selectedOffer)
                    setCreateQuoteOpen(true)
                  }}
                />
              ))
            ) : (
              <div className="col-span-full py-16 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-lg font-medium">{t('pricing.noOffers', 'No offers found matching your filters')}</p>
              </div>
            )}
          </div>

          {!loading && meta?.last_page > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {t('common.page', 'Page')} {meta.current_page} {t('common.of', 'of')} {meta.last_page}
              </span>
              <button
                disabled={page === meta.last_page}
                onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </>
      )}

      <OfferDetailModal
        isOpen={!!detailOffer}
        offer={detailOffer}
        onClose={() => setDetailOffer(null)}
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
