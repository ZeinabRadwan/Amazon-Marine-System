import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download } from 'lucide-react'
import { getStoredToken } from '../../Login'
import { downloadQuotePdf } from '../../../api/pricing'
import { formatLocaleMoney, sortCurrencyCodes, sumAmountsByCurrencyFromItems } from '../../../utils/dateUtils'

export default function QuoteDetailModal({ isOpen, quote, onClose }) {
  const { t, i18n } = useTranslation()

  const totalsByCurrency = useMemo(() => {
    if (!quote) return {}
    if (quote.totals_by_currency && typeof quote.totals_by_currency === 'object') {
      return quote.totals_by_currency
    }
    return sumAmountsByCurrencyFromItems(quote.items)
  }, [quote])

  const totalCurrencyKeys = useMemo(
    () => sortCurrencyCodes(Object.keys(totalsByCurrency).filter((c) => Math.abs(Number(totalsByCurrency[c]) || 0) > 1e-9)),
    [totalsByCurrency]
  )

  const dash = t('common.dash')

  const quoteStatusLabel =
    quote?.status?.toLowerCase() === 'accepted'
      ? t('common.status.accepted', 'Accepted')
      : quote?.status?.toLowerCase() === 'pending'
        ? t('common.status.pending', 'Pending')
        : quote?.status?.toLowerCase() === 'rejected'
          ? t('common.status.rejected', 'Rejected')
          : quote?.status || dash

  if (!isOpen || !quote) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h2 className="text-xl font-bold">
              {t('pricing.quoteDetails', 'Quote Details')} <span className="text-gray-400">{quote.quote_no}</span>
            </h2>
            {quote.is_quick_quotation ?? quote.quick_mode ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 shrink-0">
                {t('pricing.quickQuotation', 'Quick Quotation')}
              </span>
            ) : null}
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.client', 'Client')}</div>
              <div className="font-semibold">{quote.client?.name || dash}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.status', 'Status')}</div>
              <div className="font-semibold">{quoteStatusLabel}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.pol')}</div>
              <div className="font-semibold">{quote.pol || dash}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.podShort')}</div>
              <div className="font-semibold">{quote.pod || dash}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase">{t('pricing.shippingLine', 'Shipping line')}</div>
              {quote.show_carrier_on_pdf !== false ? (
                <div className="font-semibold">{quote.shipping_line || dash}</div>
              ) : (
                <div>
                  <div className="font-semibold text-gray-400 dark:text-gray-500 italic">
                    {t('pricing.shippingLineHiddenFromClient', 'Not shown to client')}
                  </div>
                  {quote.shipping_line ? (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      {t('pricing.shippingLineInternalNote', 'Stored')}: {quote.shipping_line}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {quote.official_receipts_note ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/40 p-4 text-sm">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{t('pricing.officialReceipts', 'Official Receipts')}</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 mb-2">
                {t('pricing.officialReceiptsSummaryTag', 'Note only — excluded from totals above')}
              </p>
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{quote.official_receipts_note}</p>
            </div>
          ) : null}

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
                    <div className="text-sm font-bold tabular-nums text-gray-900 dark:text-white">
                      {formatLocaleMoney(it.selling_amount ?? it.amount, it.currency, i18n.language)}
                    </div>
                    <div className="text-[11px] text-gray-500 tabular-nums">
                      {t('pricing.costBase')}: {formatLocaleMoney(it.cost_amount, it.currency, i18n.language)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-5 py-3 space-y-2">
              <div className="text-sm font-bold text-gray-600 dark:text-gray-300">{t('pricing.total', 'Total')}</div>
              {totalCurrencyKeys.length ? (
                <div className="flex flex-col items-end gap-1">
                  {totalCurrencyKeys.map((cur) => (
                    <div key={cur} className="text-lg font-extrabold text-gray-900 dark:text-white tabular-nums">
                      {formatLocaleMoney(totalsByCurrency[cur], cur, i18n.language)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-lg font-extrabold text-gray-500 dark:text-gray-400">{dash}</div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2 flex-wrap">
          <button
            type="button"
            onClick={async () => {
              try {
                const token = getStoredToken()
                if (!token || !quote?.id) return
                const { blob } = await downloadQuotePdf(token, quote.id, { locale: i18n.language })
                const url = URL.createObjectURL(blob)
                window.open(url, '_blank', 'noopener,noreferrer')
                window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
              } catch (e) {
                console.error(e)
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4" aria-hidden />
            {t('common.download', 'Download PDF')}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  )
}

