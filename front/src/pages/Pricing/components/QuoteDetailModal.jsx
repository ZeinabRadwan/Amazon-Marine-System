import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, X } from 'lucide-react'
import { useMutateQuote } from '../../../hooks/usePricing'
import '../../Clients/ClientDetailModal.css'
import '../../Shipments/Shipments.css'
import '../Pricing.css'
import QuoteDetailViewContent from './QuoteDetailViewContent'

export default function QuoteDetailModal({ isOpen, quote, onClose }) {
  const { t, i18n } = useTranslation()
  const { downloadPdf, loading: pdfLoading } = useMutateQuote()
  const [pdfError, setPdfError] = useState(null)

  const handleDownloadPdf = async () => {
    if (!quote?.id) return
    setPdfError(null)
    try {
      const { blob, filename } = await downloadPdf(quote.id, { locale: i18n.language })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setPdfError(err?.message || t('pricing.quotePdfFailed'))
    }
  }

  if (!isOpen || !quote) return null

  const isQuick = Boolean(quote.is_quick_quotation ?? quote.quick_mode)
  const headerTitle = t('pricing.quoteDetails', 'Quote Details')

  return (
    <div
      className="client-detail-modal shipments-no-print shipment-fin-modal-root pricing-fin-modal-root pricing-quote-modal-root pricing-quote-detail-readonly"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-quote-detail-title"
    >
      <div className="client-detail-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="client-detail-modal__box client-detail-modal__box--form shipment-fin-modal__box pricing-fin-form-modal__box max-w-5xl w-full max-h-[92vh] flex flex-col">
        <header className="client-detail-modal__header client-detail-modal__header--form shipment-fin-modal__header">
          <div className="shipment-fin-modal__header-main min-w-0">
            <div className="ship-bar">
              <div>
                <div id="pricing-quote-detail-title" className="ship-ref pricing-fin-ship-ref--title" role="heading" aria-level={2}>
                  {headerTitle}{' '}
                  <span className="text-gray-400 font-semibold">{quote.quote_no}</span>
                </div>
              </div>
              <div className="ship-metas">
                {isQuick ? (
                  <>
                    <div>
                      <div className="ship-meta-val">{t('pricing.quickModeBadgeShort', 'Quick Mode')}</div>
                      <div className="ship-meta-lbl">{t('pricing.finHeaderMode', 'Mode')}</div>
                    </div>
                    <div className="ship-meta-divider" aria-hidden />
                  </>
                ) : null}
                <div>
                  <div className="ship-meta-val">
                    {isQuick ? t('pricing.quickQuotation', 'Quick') : t('pricing.finHeaderModeSea', 'Ocean')}
                  </div>
                  <div className="ship-meta-lbl">{t('pricing.finHeaderMode', 'Mode')}</div>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="client-detail-modal__close shipment-fin-modal__header-close"
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
          >
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <div className="client-detail-modal__body client-detail-modal__body--form shipment-fin-modal__body flex-1 min-h-0">
          <div className="client-detail-modal__body-inner h-full min-h-0">
            <QuoteDetailViewContent quote={quote} />
          </div>
        </div>

        <div className="pricing-fin-modal__footer pricing-fin-modal__footer--detail flex flex-col items-end gap-2">
          {pdfError ? (
            <p className="text-sm text-red-600 dark:text-red-400 m-0 w-full text-end" role="alert">
              {pdfError}
            </p>
          ) : null}
          <div className="flex justify-end gap-3 flex-wrap w-full">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              {t('common.close', 'Close')}
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="page-header__btn page-header__btn--primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              {pdfLoading ? t('common.loading', 'Loading…') : t('pricing.downloadQuotePdf')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
