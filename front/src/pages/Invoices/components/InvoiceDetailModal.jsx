import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, DollarSign, FileText, Printer, CheckCircle, Ban } from 'lucide-react'
import { getStoredToken } from '../../Login'
import { getInvoice, issueInvoice, cancelInvoice } from '../../../api/invoices'
import RecordPaymentModal from './RecordPaymentModal'
import InvoicePdfPreviewModal from './InvoicePdfPreviewModal'

function money(amount, currency) {
  const n = Number(amount) || 0
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${n} ${currency || ''}`.trim()
  }
}

export default function InvoiceDetailModal({ isOpen, invoiceId, onClose, onChanged }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    if (!isOpen || !invoiceId) return
    const token = getStoredToken()
    if (!token) return
    setLoading(true)
    setError(null)
    getInvoice(token, invoiceId)
      .then((data) => setInvoice(data))
      .catch((e) => setError(e.message || 'Failed to load invoice'))
      .finally(() => setLoading(false))
  }, [isOpen, invoiceId])

  const canRecordPayment = invoice && !['paid', 'cancelled'].includes(String(invoice.status || '').toLowerCase())

  const totals = useMemo(() => {
    if (!invoice) return null
    return {
      subtotal: invoice.total_amount ?? invoice.net_amount ?? 0,
      tax: invoice.tax_amount ?? 0,
      total: invoice.net_amount ?? invoice.total_amount ?? 0,
    }
  }, [invoice])

  const handleIssue = async () => {
    const token = getStoredToken()
    if (!token || !invoiceId) return
    try {
      await issueInvoice(token, invoiceId)
      onChanged?.()
    } catch (e) {
      setError(e.message || 'Failed to issue invoice')
    }
  }

  const handleCancel = async () => {
    const token = getStoredToken()
    if (!token || !invoiceId) return
    try {
      await cancelInvoice(token, invoiceId)
      onChanged?.()
    } catch (e) {
      setError(e.message || 'Failed to cancel invoice')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold">{t('invoices.details', 'Invoice Details')}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {loading || !invoice ? (
            <div className="text-sm text-gray-500">{t('common.loading', 'Loading...')}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/20">
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('invoices.table.number', 'Invoice #')}</div>
                  <div className="text-lg font-extrabold">{invoice.invoice_number}</div>
                  <div className="text-xs text-gray-500">{t('invoices.table.date', 'Date')}: {invoice.issue_date || '—'}</div>
                  <div className="text-xs text-gray-500">{t('invoices.dueDate', 'Due')}: {invoice.due_date || '—'}</div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/20">
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('invoices.table.party', 'Client/Partner')}</div>
                  <div className="text-lg font-bold">{invoice.client?.name || '—'}</div>
                  <div className="text-xs text-gray-500">{invoice.client?.phone || ''} {invoice.client?.email ? `• ${invoice.client.email}` : ''}</div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/20">
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('invoices.table.shipment', 'Shipment')}</div>
                  <div className="text-lg font-bold">{invoice.shipment?.bl_number || '—'}</div>
                  <div className="text-xs text-gray-500">{invoice.shipment?.route_text || ''}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/20">
                    <tr>
                      <th className="p-3 text-left">#</th>
                      <th className="p-3 text-left">{t('invoices.item.description', 'Description')}</th>
                      <th className="p-3 text-center">{t('invoices.item.qty', 'Qty')}</th>
                      <th className="p-3 text-right">{t('invoices.item.unitPrice', 'Unit')}</th>
                      <th className="p-3 text-right">{t('invoices.item.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((it, idx) => (
                      <tr key={it.id || idx} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="p-3 text-left">{idx + 1}</td>
                        <td className="p-3 text-left font-semibold">{it.description}</td>
                        <td className="p-3 text-center">{it.quantity}</td>
                        <td className="p-3 text-right">{money(it.unit_price, invoice.currency_code)}</td>
                        <td className="p-3 text-right font-bold">{money(it.line_total, invoice.currency_code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totals && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{t('invoices.subtotal', 'Subtotal')}</span>
                    <span className="font-semibold">{money(totals.subtotal, invoice.currency_code)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-sm">
                    <span className="text-gray-500">{t('invoices.tax', 'Tax')}</span>
                    <span className="font-semibold">{money(totals.tax, invoice.currency_code)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                    <span className="font-bold">{t('invoices.total', 'Total')}</span>
                    <span className="text-lg font-extrabold">{money(totals.total, invoice.currency_code)}</span>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-sm font-bold mb-2">{t('invoices.payments', 'Payments')}</div>
                {(invoice.payments || []).length === 0 ? (
                  <div className="text-sm text-gray-500">{t('invoices.noPayments', 'No payments yet')}</div>
                ) : (
                  <div className="space-y-2">
                    {(invoice.payments || []).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
                        <div className="text-gray-600 dark:text-gray-300">{p.paid_at || p.created_at || '—'} • {p.method}</div>
                        <div className="font-bold">{money(p.amount, p.currency_code)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 flex-wrap">
          {invoice?.status === 'draft' && (
            <button onClick={handleIssue} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold inline-flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {t('invoices.issue', 'Issue')}
            </button>
          )}
          {invoice && invoice.status !== 'cancelled' && (
            <button onClick={handleCancel} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold inline-flex items-center gap-2">
              <Ban className="h-4 w-4" /> {t('invoices.cancel', 'Cancel')}
            </button>
          )}
          <button onClick={() => setPreviewOpen(true)} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold inline-flex items-center gap-2">
            <FileText className="h-4 w-4" /> {t('invoices.previewPdf', 'Preview PDF')}
          </button>
          {canRecordPayment && (
            <button onClick={() => setPaymentOpen(true)} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold inline-flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> {t('invoices.recordPayment', 'Record payment')}
            </button>
          )}
          <button onClick={() => window.print()} className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold inline-flex items-center gap-2">
            <Printer className="h-4 w-4" /> {t('common.print', 'Print')}
          </button>
        </div>

        <RecordPaymentModal
          isOpen={paymentOpen}
          invoiceId={invoiceId}
          currencyCode={invoice?.currency_code}
          onClose={() => setPaymentOpen(false)}
          onSuccess={() => {
            setPaymentOpen(false)
            onChanged?.()
          }}
        />

        <InvoicePdfPreviewModal
          isOpen={previewOpen}
          invoice={invoice}
          onClose={() => setPreviewOpen(false)}
        />
      </div>
    </div>
  )
}

