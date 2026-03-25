import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Download } from 'lucide-react'

function money(amount, currency) {
  const n = Number(amount) || 0
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${n} ${currency || ''}`.trim()
  }
}

export default function InvoicePdfPreviewModal({ isOpen, invoice, onClose }) {
  const { t } = useTranslation()
  const lines = useMemo(() => invoice?.items || [], [invoice])

  if (!isOpen) return null

  const handleDownload = () => {
    // Backend currently provides CSV export only; PDF endpoint not present.
    // This keeps the UI flow consistent with UI spec until PDF endpoint is added.
    window.print()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold">{t('invoices.pdfPreview', 'PDF Preview')}</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {!invoice ? (
            <div className="text-sm text-gray-500">{t('common.loading', 'Loading...')}</div>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-900/20">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-2xl font-extrabold">{t('invoices.title', 'Invoice')}</div>
                  <div className="text-sm text-gray-500">{invoice.invoice_number}</div>
                  <div className="text-sm text-gray-500">{invoice.issue_date || ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{invoice.client?.name || '—'}</div>
                  <div className="text-xs text-gray-500">{invoice.client?.email || ''}</div>
                  <div className="text-xs text-gray-500">{invoice.client?.phone || ''}</div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/20">
                    <tr>
                      <th className="p-3 text-left">{t('invoices.item.description', 'Description')}</th>
                      <th className="p-3 text-center">{t('invoices.item.qty', 'Qty')}</th>
                      <th className="p-3 text-right">{t('invoices.item.unitPrice', 'Unit')}</th>
                      <th className="p-3 text-right">{t('invoices.item.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((it, idx) => (
                      <tr key={it.id || idx} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="p-3 font-semibold">{it.description}</td>
                        <td className="p-3 text-center">{it.quantity}</td>
                        <td className="p-3 text-right">{money(it.unit_price, invoice.currency_code)}</td>
                        <td className="p-3 text-right font-bold">{money(it.line_total, invoice.currency_code)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('invoices.tax', 'Tax')}</span>
                    <span className="font-semibold">{money(invoice.tax_amount, invoice.currency_code)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-base font-extrabold">
                    <span>{t('invoices.total', 'Total')}</span>
                    <span>{money(invoice.net_amount, invoice.currency_code)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={handleDownload} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold inline-flex items-center gap-2">
            <Download className="h-4 w-4" /> {t('common.download', 'Download')}
          </button>
        </div>
      </div>
    </div>
  )
}

