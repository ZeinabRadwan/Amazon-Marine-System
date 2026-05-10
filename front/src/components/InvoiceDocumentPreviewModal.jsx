import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Printer, X } from 'lucide-react'
import { fetchInvoiceHtmlPreview } from '../api/invoices'
import './InvoiceDocumentPreviewModal.css'

/**
 * Full-screen invoice preview using the same server-rendered HTML as the PDF template.
 *
 * @param {{ open: boolean, onClose: () => void, token: string | null, invoiceId: number | string | null | undefined }} props
 */
export default function InvoiceDocumentPreviewModal({ open, onClose, token, invoiceId }) {
  const { t } = useTranslation()
  const iframeRef = useRef(null)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) {
      return undefined
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !token || invoiceId == null || invoiceId === '') {
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setHtml('')
    fetchInvoiceHtmlPreview(token, invoiceId)
      .then((h) => {
        if (!cancelled) {
          setHtml(h)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || String(e))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, token, invoiceId])

  const handlePrint = () => {
    try {
      const w = iframeRef.current?.contentWindow
      if (w) {
        w.focus()
        w.print()
      }
    } catch {
      // ignore
    }
  }

  if (!open || typeof document === 'undefined') {
    return null
  }

  const title = t('shipments.fin.previewModalTitle', { defaultValue: 'Invoice preview' })

  return createPortal(
    <div className="invoice-doc-preview-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="invoice-doc-preview-modal__backdrop" role="presentation" onClick={onClose} />
      <div className="invoice-doc-preview-modal__shell" onClick={(e) => e.stopPropagation()}>
        <header className="invoice-doc-preview-modal__toolbar">
          <span className="invoice-doc-preview-modal__title">{title}</span>
          <div className="invoice-doc-preview-modal__actions">
            <button
              type="button"
              className="invoice-doc-preview-modal__btn invoice-doc-preview-modal__btn--ghost"
              onClick={handlePrint}
              disabled={!html || Boolean(loading)}
            >
              <Printer size={18} aria-hidden />
              {t('accountings.print', { defaultValue: 'Print' })}
            </button>
            <button type="button" className="invoice-doc-preview-modal__btn invoice-doc-preview-modal__btn--primary" onClick={onClose}>
              <X size={18} aria-hidden />
              {t('common.close')}
            </button>
          </div>
        </header>
        <div className="invoice-doc-preview-modal__body">
          {loading ? (
            <div className="invoice-doc-preview-modal__state">{t('common.loading')}</div>
          ) : error ? (
            <div className="invoice-doc-preview-modal__state invoice-doc-preview-modal__state--error">{error}</div>
          ) : (
            <iframe
              title={title}
              ref={iframeRef}
              className="invoice-doc-preview-modal__iframe"
              srcDoc={html}
              sandbox="allow-same-origin allow-modals"
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
