import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Ship, Truck, Search, Filter, X } from 'lucide-react'
import PricingCard from './PricingCard'

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

const DEMO_OFFERS = [
  { id: 'PS-001', region: 'Red Sea', pod: 'Jeddah', type: 'sea', shippingLine: 'MSC', pol: 'Sokhna', dnd: '7det', transitTime: '5 days', sailingDates: ['2026-03-14', '2026-03-21'], pricing: { of20: { price: 70, currency: 'USD' }, of40: { price: 103, currency: 'USD' } }, total: 433 },
  { id: 'PS-002', region: 'Red Sea', pod: 'Jeddah', type: 'sea', shippingLine: 'CMA CGM', pol: 'Alex', dnd: '7d&d', transitTime: '3 days', sailingDates: ['2026-03-05', '2026-03-15'], pricing: { of20: { price: 225, currency: 'USD' }, of40: { price: 275, currency: 'USD' } }, total: 975 },
  { id: 'PI-001', region: 'Cairo', pod: 'Alex', type: 'inland', destination: 'Cairo - Obour', validTo: '2026-12-31', pricing: { t20d: { price: 8500, currency: 'EGP' }, t40hq: { price: 9700, currency: 'EGP' } } },
]

export default function RateSheet() {
  const { t } = useTranslation()
  const [type, setType] = useState('sea')
  const [region, setRegion] = useState('')
  const [pod, setPod] = useState('')
  const [search, setSearch] = useState('')

  const filteredOffers = useMemo(() => {
    return DEMO_OFFERS.filter(o => {
      if (o.type !== type) return false
      if (region && o.region !== region) return false
      if (pod && o.pod !== pod) return false
      if (search && !JSON.stringify(o).toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [type, region, pod, search])

  return (
    <div className="rate-sheet">
      <div className="mb-6 flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
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
                : ['Cairo', 'Giza', 'Alexandria', 'Delta'].map(r => <option key={r} value={r}>{r}</option>)
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOffers.map(offer => (
          <PricingCard key={offer.id} offer={offer} />
        ))}
        {filteredOffers.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p>{t('pricing.noOffers', 'No offers found matching your filters')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
