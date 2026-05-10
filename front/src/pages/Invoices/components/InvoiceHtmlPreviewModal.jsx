import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer, X } from 'lucide-react'
import { fetchInvoicePreviewHtml } from '../../../api/invoices'
import { getBackendPublicOrigin, rewriteInvoicePreviewFileUrls } from '../../../utils/invoicePreviewHtml'
import './InvoiceHtmlPreviewModal.css'

export default function InvoiceHtmlPreviewModal({ isOpen, onClose, token, invoiceId }) {
  const { t, i18n } = useTranslation()
  const iframeRef = useRef(null)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen || !token || !invoiceId) {
      setHtml('')
      setError(null)
      setLoading(false)
      return undefined
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setHtml('')

    fetchInvoicePreviewHtml(token, invoiceId, { locale: i18n.language })
      .then((raw) => {
        if (cancelled) return
        const origin = getBackendPublicOrigin()
        setHtml(rewriteInvoicePreviewFileUrls(raw, origin))
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, token, invoiceId, i18n.language])

  const handlePrint = () => {
    try {
      iframeRef.current?.contentWindow?.focus()
      iframeRef.current?.contentWindow?.print()
    } catch {
      window.print()
    }
  }

  if (!isOpen) return null

  return (
    <div className="invoice-html-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="invoice-html-preview-title">
      <div className="invoice-html-preview-shell">
        <header className="invoice-html-preview-toolbar no-print">
          <h2 id="invoice-html-preview-title" className="invoice-html-preview-title">
            {t('shipments.fin.previewInvoiceTitle', { defaultValue: 'Invoice preview' })}
          </h2>
          <div className="invoice-html-preview-actions">
            <button type="button" className="invoice-html-preview-btn invoice-html-preview-btn--ghost" onClick={handlePrint} disabled={loading || !!error || !html}>
              <Printer className="invoice-html-preview-icon" aria-hidden />
              {t('common.print', { defaultValue: 'Print' })}
            </button>
            <button type="button" className="invoice-html-preview-btn invoice-html-preview-btn--primary" onClick={onClose}>
              <X className="invoice-html-preview-icon" aria-hidden />
              {t('common.close', { defaultValue: 'Close' })}
            </button>
          </div>
        </header>
        <div className="invoice-html-preview-body">
          {loading ? (
            <div className="invoice-html-preview-status">{t('common.loading', { defaultValue: 'Loading…' })}</div>
          ) : error ? (
            <div className="invoice-html-preview-status invoice-html-preview-status--error" role="alert">
              {error}
            </div>
          ) : (
            <div className="invoice-html-preview-paper">
              <iframe
                ref={iframeRef}
                title={t('shipments.fin.previewInvoiceTitle', { defaultValue: 'Invoice preview' })}
                srcDoc={html}
                className="invoice-html-preview-iframe"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-modals allow-same-origin"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
