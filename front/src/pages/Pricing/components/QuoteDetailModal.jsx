import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

function money(amount, currency) {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount))
  } catch {
    return `${amount} ${currency || ''}`.trim()
  }
}

export default function QuoteDetailModal({ isOpen, quote, onClose }) {
  const { t } = useTranslation()

  const total = useMemo(() => {
    return (quote?.items || []).reduce((s, it) => s + (Number(it.selling_amount ?? it.amount) || 0), 0)
  }, [quote])

  if (!isOpen || !quote) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold">
            {t('pricing.quoteDetails', 'Quote Details')} <span className="text-gray-400">{quote.quote_no}</span>
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.client', 'Client')}</div>
              <div className="font-semibold">{quote.client?.name || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.status', 'Status')}</div>
              <div className="font-semibold">{quote.status}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">POL</div>
              <div className="font-semibold">{quote.pol || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">POD</div>
              <div className="font-semibold">{quote.pod || '—'}</div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700 rounded-2xl p-5">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{t('pricing.items', 'Items')}</div>
            <div className="space-y-2">
              {(quote.items || []).map((it) => (
                <div key={it.id || `${it.code}-${it.name}`} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="min-w-0">
                    <div className="font-bold text-gray-900 dark:text-white truncate">{it.name}</div>
                    {it.description && <div className="text-xs text-gray-500 truncate">{it.description}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold">{money(it.selling_amount ?? it.amount, it.currency)}</div>
                    <div className="text-[11px] text-gray-500">
                      {t('pricing.costBase', 'Cost Base')}: {money(it.cost_amount, it.currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-5 py-3">
              <div className="text-sm font-bold text-gray-600 dark:text-gray-300">{t('pricing.total', 'Total')}</div>
              <div className="text-lg font-extrabold text-gray-900 dark:text-white">{money(total, 'USD')}</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  )
}

