import { useTranslation } from 'react-i18next'
import { Calendar, Clock, Ship, Truck, Eye, Edit2 } from 'lucide-react'

export default function PricingCard({ offer }) {
  const { t } = useTranslation()
  const isSea = offer.type === 'sea'

  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(price || 0)
  }

  return (
    <div className="premium-card bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col">
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isSea ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
            {isSea ? offer.shippingLine : t('pricing.inland', 'Inland')}
          </span>
          <span className="text-xs font-bold text-gray-400">{offer.id}</span>
        </div>
        
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          {isSea ? <Ship className="h-4 w-4 text-blue-500" /> : <Truck className="h-4 w-4 text-amber-500" />}
          {isSea ? `${offer.pol} → ${offer.pod}` : offer.destination}
        </h3>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          {isSea && (
            <>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {offer.transitTime}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {offer.sailingDates?.length} {t('pricing.sailings', 'Sailings')}</span>
            </>
          )}
          {!isSea && (
            <span className="flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
              <Calendar className="h-3 w-3" /> {t('pricing.validTo', 'Valid until')} {offer.validTo}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 bg-gray-50/50 dark:bg-gray-900/20">
        {isSea ? (
          <>
            <div className="p-4 border-r border-gray-100 dark:border-gray-700 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">OF 20'DC</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(offer.pricing?.of20?.price, offer.pricing?.of20?.currency)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">OF 40'HQ</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(offer.pricing?.of40?.price, offer.pricing?.of40?.currency)}</p>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-r border-gray-100 dark:border-gray-700 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">20' Dry</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(offer.pricing?.t20d?.price, offer.pricing?.t20d?.currency)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">40' HQ</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(offer.pricing?.t40hq?.price, offer.pricing?.t40hq?.currency)}</p>
            </div>
          </>
        )}
      </div>

      <div className="p-4 mt-auto border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('pricing.approxTotal', 'Approx Total')}</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400">
            {offer.total ? `$${offer.total}` : '—'}
          </span>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Eye className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
