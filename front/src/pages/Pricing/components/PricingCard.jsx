import { useTranslation } from 'react-i18next'
import { Calendar, Clock, Ship, Truck, Eye, Edit2, CheckCircle, Archive, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'
import { useMutateOffer } from '../../../hooks/usePricing'

export default function PricingCard({ offer, onMutate, onEdit, onView, onCreateQuote }) {
  const { t } = useTranslation()
  const isSea = offer.pricing_type === 'sea'
  const { activate, archive, loading } = useMutateOffer()
  const [actionLoading, setActionLoading] = useState(null) // 'activate' or 'archive'

  const formatPrice = (price, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(price || 0)
  }

  const handleActivate = async () => {
    setActionLoading('activate')
    try {
      await activate(offer.id)
      if (onMutate) onMutate()
    } catch(e) {
      console.error(e)
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchive = async () => {
    setActionLoading('archive')
    try {
      await archive(offer.id)
      if (onMutate) onMutate()
    } catch(e) {
      console.error(e)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className={`premium-card bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border flex flex-col transition-all ${offer.status === 'archived' ? 'opacity-70 border-gray-300 dark:border-gray-700 grayscale' : 'border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800'}`}>
      <div className="p-5 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isSea ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
              {isSea ? offer.shipping_line || t('pricing.sea', 'Sea') : t('pricing.inland', 'Inland')}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                offer.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                offer.status === 'archived' ? 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400' :
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {offer.status || 'draft'}
            </span>
          </div>
          <span className="text-xs font-bold text-gray-400">#{offer.id}</span>
        </div>
        
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          {isSea ? <Ship className="h-4 w-4 text-blue-500 shrink-0" /> : <Truck className="h-4 w-4 text-amber-500 shrink-0" />}
          <span className="truncate" title={isSea ? `${offer.pol} → ${offer.pod}` : offer.destination}>
            {isSea ? `${offer.pol || ''} → ${offer.pod || ''}` : offer.destination || ''}
          </span>
        </h3>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          {isSea && (
            <>
              {offer.transit_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {offer.transit_time}</span>}
              {offer.sailing_dates?.length > 0 && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {offer.sailing_dates.length} {t('pricing.sailings', 'Sailings')}</span>}
            </>
          )}
          <span className="flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
            <Calendar className="h-3 w-3" /> {t('pricing.validTo', 'Valid until')} {offer.valid_to}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 bg-gray-50/50 dark:bg-gray-900/20">
        {isSea ? (
          <>
            <div className="p-4 border-r border-gray-100 dark:border-gray-700 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{t('pricing.oceanFreight', 'Ocean')}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(offer.pricing?.ocean?.price ?? offer.pricing?.of20?.price, offer.pricing?.ocean?.currency ?? offer.pricing?.of20?.currency)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{t('pricing.thc', 'THC')}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(offer.pricing?.thc?.price ?? offer.pricing?.thc20?.price, offer.pricing?.thc?.currency ?? offer.pricing?.thc20?.currency)}</p>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-r border-gray-100 dark:border-gray-700 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{t('pricing.inland', 'Inland')}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(offer.pricing?.inland?.price ?? offer.pricing?.t20d?.price, offer.pricing?.inland?.currency ?? offer.pricing?.t20d?.currency)}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">{t('pricing.generator', 'Gen')}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{formatPrice(offer.pricing?.generator?.price, offer.pricing?.generator?.currency)}</p>
            </div>
          </>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 mt-auto border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
               onClick={() => onEdit?.(offer)}
               className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
               title={t('common.edit', 'Edit')}
            >
              <Edit2 className="h-4 w-4" />
            </button>
            
            {offer.status !== 'active' && (
              <button
                 onClick={handleActivate}
                 disabled={loading}
                 className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                 title={t('common.activate', 'Activate')}
              >
                {actionLoading === 'activate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              </button>
            )}

            {offer.status !== 'archived' && (
              <button
                 onClick={handleArchive}
                 disabled={loading}
                 className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                 title={t('common.archive', 'Archive')}
              >
                {actionLoading === 'archive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
             <button
               onClick={() => onCreateQuote?.(offer)}
               className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
             >
               <Plus className="h-3 w-3" /> {t('pricing.createQuoteFromOffer', 'Create Quote')}
             </button>
             <button
               onClick={() => onView?.(offer)}
               className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
             >
               <Eye className="h-3 w-3" /> {t('common.view', 'View')}
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
