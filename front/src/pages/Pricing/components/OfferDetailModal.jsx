import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Ship, Truck, Calendar, Clock } from 'lucide-react'

const SEA_ITEMS = [
  { key: 'ocean', label: "Ocean Freight" },
  { key: 'thc', label: "THC" },
  { key: 'power', label: 'Power (Reefer)', optional: true },
  { key: 'pti', label: 'PTI (Reefer)', optional: true },
  { key: 'bl', label: 'B/L Fee' },
  { key: 'telex', label: 'Telex Release' },
]

const INLAND_ITEMS = [
  { key: 'inland', label: "Inland Rate" },
  { key: 'generator', label: 'Generator', optional: true },
]

function formatMoney(price, currency) {
  if (price == null || Number.isNaN(Number(price))) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(price))
  } catch {
    return `${price} ${currency || ''}`.trim()
  }
}

export default function OfferDetailModal({ isOpen, offer, onClose, onCreateQuote }) {
  const { t } = useTranslation()
  const isSea = offer?.pricing_type === 'sea'

  const rows = useMemo(() => {
    if (!offer) return []
    const items = isSea ? SEA_ITEMS : INLAND_ITEMS
    return items
      .map((it) => {
        const item = offer.pricing?.[it.key]
        if (it.optional && (!item || item.price == null || item.price === '')) return null
        return {
          key: it.key,
          label: it.label,
          value: formatMoney(item?.price, item?.currency),
        }
      })
      .filter(Boolean)
  }, [offer, isSea])

  if (!isOpen || !offer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {isSea ? <Ship className="h-5 w-5 text-blue-500" /> : <Truck className="h-5 w-5 text-amber-500" />}
            <h2 className="text-lg font-bold">
              {t('pricing.offerDetails', 'Offer Details')} <span className="text-gray-400">#{offer.id}</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isSea ? (
              <>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.shippingLine', 'Shipping line')}</div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400">{offer.shipping_line || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.containerSpec', 'Container Spec')}</div>
                  <div className="font-semibold">
                    {offer.container_size} {offer.container_height === 'HQ' ? 'HQ' : ''} {offer.container_type}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">POL</div>
                  <div className="font-semibold">{offer.pol || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">POD</div>
                  <div className="font-semibold">{offer.pod || '—'}</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.containerSpec', 'Container Spec')}</div>
                  <div className="font-semibold">
                    {offer.container_size} {offer.container_height === 'HQ' ? 'HQ' : ''} {offer.container_type}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.port', 'Port')}</div>
                  <div className="font-semibold">{offer.inland_port || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.destination', 'Destination')}</div>
                  <div className="font-semibold">{offer.destination || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.governorate', 'Governorate')}</div>
                  <div className="font-semibold">{offer.inland_gov || offer.region || '—'}</div>
                </div>
              </>
            )}
          </div>

          {isSea && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300">
              {offer.transit_time && (
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {offer.transit_time} Days Transit
                </span>
              )}
               {offer.free_time && (
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" /> {offer.free_time} Days Free
                </span>
              )}
              {offer.available_sailing_days?.length > 0 && (
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Sailings: {offer.available_sailing_days.join(', ')}
                  {offer.weekly_sailings && <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">({offer.weekly_sailings}x / week)</span>}
                </span>
              )}
              {offer.valid_to && (
                <span className="inline-flex items-center gap-2 font-semibold text-green-600 dark:text-green-400">
                  <Calendar className="h-4 w-4" /> {t('pricing.validTo', 'Valid until')} {offer.valid_to}
                </span>
              )}
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 rounded-2xl p-5">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
              {t('pricing.pricing', 'Pricing')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rows.map((r) => (
                <div key={r.key} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{r.label}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {(offer.other_charges || offer.notes) && (
            <div className="space-y-2">
              {offer.other_charges && (
                <div className="text-sm">
                  <span className="font-bold">{t('pricing.otherCharges', 'Other charges')}: </span>
                  <span className="text-gray-700 dark:text-gray-300">{offer.other_charges}</span>
                </div>
              )}
              {offer.notes && (
                <div className="text-sm">
                  <span className="font-bold">{t('pricing.notes', 'Notes')}: </span>
                  <span className="text-gray-700 dark:text-gray-300">{offer.notes}</span>
                </div>
              )}
            </div>
          )}
        </div>

         <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
            {t('common.close', 'Close')}
          </button>
          <button
            onClick={() => { onCreateQuote?.(offer); onClose(); }} 
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            {t('pricing.createQuoteFromOffer', 'Create Quote')}
          </button>
        </div>
      </div>
    </div>
  )
}

