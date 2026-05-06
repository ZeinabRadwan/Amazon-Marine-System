import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, DollarSign, Download } from 'lucide-react'
import { getStoredToken } from '../../Login'
import { downloadInvoicePdf, getInvoice } from '../../../api/invoices'
import RecordPaymentModal from './RecordPaymentModal'

function money(amount, currency) {
  const n = Number(amount) || 0
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${n} ${currency || ''}`.trim()
  }
}

function groupByCurrency(rows, amountKey = 'amount', currencyKey = 'currency_code', fallbackCurrency = 'USD') {
  const out = {}
  ;(rows || []).forEach((row) => {
    const amount = Number(row?.[amountKey] ?? 0)
    if (!Number.isFinite(amount) || amount === 0) return
    const cur = String(row?.[currencyKey] || fallbackCurrency).toUpperCase()
    out[cur] = (Number(out[cur]) || 0) + amount
  })
  return out
}

function renderCurrencyMap(map) {
  const entries = Object.entries(map || {}).filter(([, value]) => Number(value) !== 0)
  if (!entries.length) return '—'
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, value]) => `${currency}: ${Number(value).toFixed(2)}`)
    .join(' | ')
}

function sectionIdForItem(item) {
  const text = `${item?.description || ''}`.toLowerCase()
  if (/ship|line|ocean|freight|thc|b\/?l|telex|courier|dhl|container|of\b|بحري|ملاحي|شحن/.test(text)) return 'shipping'
  if (/inland|transport|truck|haul|genset|overnight|receipt|داخلي|نقل|برّي/.test(text)) return 'inland'
  if (/custom|clearance|declar|duty|جمرك|تخليص/.test(text)) return 'customs'
  if (/insur|premium|تأمين/.test(text)) return 'insurance'
  return 'additional'
}

export default function InvoiceDetailModal({ isOpen, invoiceId, onClose, onChanged, canManage = true }) {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [paymentOpen, setPaymentOpen] = useState(false)

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

  const formatDate = useCallback(
    (value) => {
      if (!value) return '—'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value
      return new Intl.DateTimeFormat(i18n.language || 'en', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date)
    },
    [i18n.language]
  )

  const totalsByCurrency = useMemo(() => {
    if (!invoice) return {}
    return groupByCurrency(invoice.items || [], 'line_total', 'currency_code', invoice.currency_code || 'USD')
  }, [invoice])
  const paidByCurrency = useMemo(() => groupByCurrency(invoice?.payments || [], 'amount', 'currency_code', invoice?.currency_code || 'USD'), [invoice])
  const remainingByCurrency = useMemo(() => {
    const allKeys = new Set([...Object.keys(totalsByCurrency), ...Object.keys(paidByCurrency)])
    const out = {}
    allKeys.forEach((cur) => {
      out[cur] = (Number(totalsByCurrency[cur]) || 0) - (Number(paidByCurrency[cur]) || 0)
    })
    return out
  }, [totalsByCurrency, paidByCurrency])

  const sectionedItems = useMemo(() => {
    const defs = [
      { id: 'shipping', labelKey: 'invoices.sections.shipping', fallback: 'Shipping' },
      { id: 'inland', labelKey: 'invoices.sections.inland', fallback: 'Inland Transport' },
      { id: 'customs', labelKey: 'invoices.sections.customs', fallback: 'Customs Clearance' },
      { id: 'insurance', labelKey: 'invoices.sections.insurance', fallback: 'Insurance' },
      { id: 'additional', labelKey: 'invoices.sections.additional', fallback: 'Additional Costs' },
    ]
    const map = Object.fromEntries(defs.map((d) => [d.id, []]))
    ;(invoice?.items || []).forEach((it) => {
      const sid = sectionIdForItem(it)
      if (!map[sid]) map[sid] = []
      map[sid].push(it)
    })
    return defs
      .map((d) => {
        const rows = map[d.id] || []
        const subtotal = groupByCurrency(rows, 'line_total', 'currency_code', invoice?.currency_code || 'USD')
        return { ...d, rows, subtotal }
      })
      .filter((s) => s.rows.length > 0)
  }, [invoice])

  const sectionAttachments = useMemo(() => {
    const out = {}
    ;(invoice?.sections || []).forEach((section) => {
      const key = String(section?.key || '').toLowerCase()
      if (!key) return
      out[key] = Array.isArray(section?.attachments) ? section.attachments : []
    })
    return out
  }, [invoice])

  const paymentsTimeline = useMemo(() => {
    if (!invoice) return []
    const rows = []
    if (invoice.issue_date) {
      rows.push({
        id: `inv-created-${invoice.id}`,
        date: invoice.issue_date,
        title: t('invoices.timeline.invoiceCreated', 'Invoice Created'),
        meta: invoice.invoice_number || `INV-${invoice.id}`,
      })
    }
    ;(invoice.payments || []).forEach((p, idx) => {
      rows.push({
        id: p.id || `p-${idx}`,
        date: p.paid_at || p.created_at,
        title: t('invoices.timeline.paymentAdded', 'Payment Added'),
        meta: `${p.method || '—'} • ${p.bank_name || p.bank_account_name || t('payments.bankAccountOptional', 'No bank account')}`,
        amount: `${String(p.currency_code || 'USD').toUpperCase()} ${Number(p.amount || 0).toFixed(2)}`,
      })
    })
    const paidSum = Object.values(paidByCurrency).reduce((acc, n) => acc + (Number(n) || 0), 0)
    const totalSum = Object.values(totalsByCurrency).reduce((acc, n) => acc + (Number(n) || 0), 0)
    if (paidSum > 0 && paidSum < totalSum) {
      rows.push({
        id: `inv-partial-${invoice.id}`,
        date: invoice.updated_at || invoice.issue_date,
        title: t('invoices.timeline.partialPayment', 'Partial Payment'),
        meta: renderCurrencyMap(remainingByCurrency),
      })
    }
    rows.push({
      id: `inv-status-${invoice.id}`,
      date: invoice.updated_at || invoice.issue_date,
      title: t('invoices.timeline.statusChange', 'Status Change'),
      meta: String(invoice.status || 'unpaid').toUpperCase(),
    })
    return rows.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
  }, [invoice, paidByCurrency, remainingByCurrency, t, totalsByCurrency])

  const handleDownloadPdf = useCallback(async () => {
    const token = getStoredToken()
    if (!token || !invoiceId) return
    try {
      const { blob, filename } = await downloadInvoicePdf(token, invoiceId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `invoice-${invoiceId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message || 'Failed to download invoice PDF')
    }
  }, [invoiceId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold">{t('invoices.detailsBySections', 'Invoice Details by Sections')}</h2>
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
                  <div className="text-xs text-gray-500">{t('invoices.invoiceDate', 'Invoice Date')}: {formatDate(invoice.issue_date)}</div>
                  <div className="text-xs text-gray-500">{t('invoices.dueDate', 'Due Date')}: {formatDate(invoice.due_date)}</div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/20">
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('invoices.customer', 'Customer')}</div>
                  <div className="text-lg font-bold">{invoice.client?.name || '—'}</div>
                  <div className="text-xs text-gray-500">{invoice.client?.phone || ''} {invoice.client?.email ? `• ${invoice.client.email}` : ''}</div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900/20">
                  <div className="text-xs font-bold text-gray-500 uppercase">{t('invoices.table.shipment', 'Shipment')}</div>
                  <div className="text-lg font-bold">{invoice.shipment?.bl_number || '—'}</div>
                  <div className="text-xs text-gray-500">{invoice.shipment?.route_text || ''}</div>
                </div>
              </div>

              {sectionedItems.map((section) => (
                <div key={section.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/20 text-sm font-bold uppercase tracking-wide">
                    {t(section.labelKey, section.fallback)}
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/20">
                      <tr>
                        <th className="p-3 text-left">#</th>
                        <th className="p-3 text-left">{t('invoices.item.description', 'Description')}</th>
                        <th className="p-3 text-right">{t('invoices.item.total', 'Total')}</th>
                        <th className="p-3 text-left">{t('invoices.table.currency', 'Currency')}</th>
                        <th className="p-3 text-center">{t('invoices.actions', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((it, idx) => (
                        <tr key={it.id || `${section.id}-${idx}`} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="p-3 text-left">{idx + 1}</td>
                          <td className="p-3 text-left font-semibold">{it.description}</td>
                          <td className="p-3 text-right font-bold">{money(it.line_total, it.currency_code || invoice.currency_code)}</td>
                          <td className="p-3 text-left">{it.currency_code || invoice.currency_code || '—'}</td>
                          <td className="p-3 text-center text-gray-400">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/10">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">{t('accountings.attachments', 'Attachments')}</div>
                    {(sectionAttachments[section.id] || []).length === 0 ? (
                      <div className="text-sm text-gray-500">—</div>
                    ) : (
                      <div className="space-y-2">
                        {(sectionAttachments[section.id] || []).map((att, idx) => (
                          <div key={att.id || `${section.id}-att-${idx}`} className="flex items-center justify-between text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                            <span className="truncate">{att.name || `attachment-${idx + 1}`}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700"
                                onClick={() => att.url && window.open(att.url, '_blank', 'noopener,noreferrer')}
                                disabled={!att.url}
                              >
                                {t('shipments.fin.viewReceipt', 'View')}
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700"
                                onClick={() => {
                                  if (!att.url) return
                                  const a = document.createElement('a')
                                  a.href = att.url
                                  a.download = att.name || 'attachment'
                                  a.click()
                                }}
                                disabled={!att.url}
                              >
                                {t('shipments.fin.downloadReceipt', 'Download')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {invoice && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{t('invoices.totalAmount', 'Total Amount')}</span>
                    <span className="text-lg font-extrabold">{renderCurrencyMap(totalsByCurrency)}</span>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold">{t('invoices.payments', 'Payments')}</div>
                  {canManage && canRecordPayment && (
                    <button onClick={() => setPaymentOpen(true)} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> {t('invoices.recordPayment', 'Record payment')}
                    </button>
                  )}
                </div>
                {(invoice.payments || []).length === 0 ? (
                  <div className="text-sm text-gray-500">{t('invoices.noPayments', 'No payments yet')}</div>
                ) : (
                  <div className="space-y-2">
                    {(invoice.payments || []).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
                        <div className="text-gray-600 dark:text-gray-300">
                          {formatDate(p.paid_at || p.created_at)} • {p.method || '—'} • {p.bank_name || p.bank_account_name || t('payments.bankAccountOptional', 'No bank account')}
                        </div>
                        <div className="font-bold">{money(p.amount, p.currency_code)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                <div className="text-sm font-bold">{t('invoices.timeline.title', 'Financial Timeline')}</div>
                <div className="space-y-2">
                  {paymentsTimeline.map((event) => (
                    <div key={event.id} className="flex items-start justify-between text-sm border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
                      <div>
                        <div className="font-semibold">{event.title}</div>
                        <div className="text-gray-500">{event.meta || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div>{formatDate(event.date)}</div>
                        {event.amount ? <div className="font-semibold">{event.amount}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-4">
                <div className="text-sm font-bold mb-2">{t('invoices.totalsByCurrency', 'Totals by Currency')}</div>
                <div className="text-sm">{t('invoices.totalAmount', 'Total Amount')}: <strong>{renderCurrencyMap(totalsByCurrency)}</strong></div>
                <div className="text-sm">{t('invoices.paidAmount', 'Paid Amount')}: <strong>{renderCurrencyMap(paidByCurrency)}</strong></div>
                <div className="text-sm">{t('invoices.remainingAmount', 'Remaining Amount')}: <strong>{renderCurrencyMap(remainingByCurrency)}</strong></div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 flex-wrap">
          <button onClick={handleDownloadPdf} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold inline-flex items-center gap-2">
            <Download className="h-4 w-4" /> {t('shipments.fin.downloadSalesInvoicePdf', 'Download PDF')}
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
      </div>
    </div>
  )
}

