import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDownLeft, ChevronDown, ChevronUp, DollarSign, Download, FileDown, X } from 'lucide-react'
import { getStoredToken } from '../../Login'
import { downloadInvoicePdf, getInvoice } from '../../../api/invoices'
import Tabs from '../../../components/Tabs'
import RecordPaymentModal from './RecordPaymentModal'
import { resolveInvoiceItemFeeDisplayName } from '../../Shipments/shipmentFinUtils'
import '../../Clients/ClientDetailModal.css'
import '../../Shipments/Shipments.css'
import '../Invoices.css'

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

/** Mixed-currency totals: same ordering & formatting as ShipmentFinancialsModal `formatCurrencyBreakdown`. */
function formatGrandMoney(amount) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)
}

const DISPLAY_CURRENCY_ORDER = ['EGP', 'USD', 'EUR']

function orderCurrencyMapEntries(map) {
  const entries = Object.entries(map || {}).filter(([, v]) => Number(v) !== 0)
  const primary = new Set(DISPLAY_CURRENCY_ORDER)
  const out = []
  for (const code of DISPLAY_CURRENCY_ORDER) {
    const hit = entries.find(([c]) => c === code)
    if (hit) out.push(hit)
  }
  entries
    .filter(([c]) => !primary.has(c))
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach((e) => out.push(e))
  return out
}

function formatOrderedCurrencyMap(map, formatMoneyFn = formatGrandMoney) {
  const ordered = orderCurrencyMapEntries(map)
  return ordered.length ? ordered.map(([c, v]) => `${c} ${formatMoneyFn(Number(v))}`).join(' · ') : '—'
}

/** Pipe + colon format for timeline meta (matches earlier invoice UI). */
function renderCurrencyMap(map) {
  const ordered = orderCurrencyMapEntries(map)
  if (!ordered.length) return '—'
  return ordered.map(([c, v]) => `${c}: ${formatGrandMoney(Number(v))}`).join(' | ')
}

function sectionIdForItem(item) {
  const text = `${item?.description || ''}`.toLowerCase()
  if (/ship|line|ocean|freight|thc|b\/?l|telex|courier|dhl|container|of\b|بحري|ملاحي|شحن/.test(text)) return 'shipping'
  if (/inland|transport|truck|haul|genset|overnight|receipt|داخلي|نقل|برّي/.test(text)) return 'inland'
  if (/custom|clearance|declar|duty|جمرك|تخليص/.test(text)) return 'customs'
  if (/insur|premium|تأمين/.test(text)) return 'insurance'
  return 'additional'
}

/** Same pill styling as ShipmentFinancialsModal `currencyCodePill`. */
function currencyCodePill(code) {
  const raw = String(code ?? '').trim().toUpperCase()
  const display = raw || '—'
  let variant = 'alt'
  if (display === 'EGP') variant = 'egp'
  else if (display === 'USD') variant = 'usd'
  else if (display === 'EUR') variant = 'eur'
  else if (display === '—') variant = 'muted'
  return <span className={`shipment-fin-cur-pill shipment-fin-cur-pill--${variant}`}>{display}</span>
}

function sectionBucketEmoji(secId) {
  if (secId === 'shipping') return '🚢'
  if (secId === 'inland') return '🚛'
  if (secId === 'customs') return '🏛️'
  if (secId === 'insurance') return '🛡️'
  return '📦'
}

function sectionIconClass(secId) {
  if (secId === 'inland') return 'shipment-fin-cost-sec-icon--inland'
  if (secId === 'customs') return 'shipment-fin-cost-sec-icon--customs'
  if (secId === 'insurance') return 'shipment-fin-cost-sec-icon--insurance'
  if (secId === 'additional') return 'shipment-fin-cost-sec-icon--other'
  return ''
}

function clientInvoiceSecTotalLabelKey(secId) {
  const k = String(secId || '')
  if (k === 'shipping') return 'shipments.fin.secTotalShipping'
  if (k === 'inland') return 'shipments.fin.secTotalInland'
  if (k === 'customs') return 'shipments.fin.secTotalCustoms'
  if (k === 'insurance') return 'shipments.fin.secTotalInsurance'
  if (k === 'additional') return 'shipments.fin.secTotalOther'
  return 'shipments.fin.secTotalGeneric'
}

/** Multi-currency breakdown string for orange badge (matches shipments.fin selling totals tone). */
function formatCurrencyMapBadge(map) {
  const entries = Object.entries(map || {}).filter(([, value]) => Number(value) !== 0)
  if (!entries.length) return '—'
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, value]) => `${currency} ${Number(value).toFixed(2)}`)
    .join(' · ')
}

/** Line total cost from API (`cost_line_total` or `cost_unit_price` × qty). */
function effectiveCostLine(it) {
  const qty = Math.max(Number(it.quantity) || 1, 1e-9)
  const cl = Number(it.cost_line_total)
  if (Number.isFinite(cl) && cl > 0) return cl
  const cu = Number(it.cost_unit_price)
  if (Number.isFinite(cu) && cu > 0) return cu * qty
  return 0
}

function hasCostData(it) {
  return effectiveCostLine(it) > 0
}

/** Per-unit original cost — matches ShipmentFinancials “Original Cost” column. */
function originalUnitCost(it) {
  const qty = Math.max(Number(it.quantity) || 1, 1e-9)
  const cu = Number(it.cost_unit_price)
  if (Number.isFinite(cu) && cu > 0) return cu
  const cl = Number(it.cost_line_total)
  if (Number.isFinite(cl) && cl > 0) return cl / qty
  return null
}

/** Per-unit client selling price. */
function clientSellUnit(it) {
  const qty = Math.max(Number(it.quantity) || 1, 1e-9)
  const up = Number(it.unit_price)
  if (Number.isFinite(up) && up > 0) return up
  const lt = Number(it.line_total)
  if (Number.isFinite(lt) && lt > 0) return lt / qty
  return null
}

/** Profit for line when cost exists; else null (show —). */
function lineProfit(it) {
  if (!hasCostData(it)) return null
  const sell = Number(it.line_total) || 0
  return sell - effectiveCostLine(it)
}

function profitTone(profit) {
  if (profit == null || Number.isNaN(profit)) return 'zero'
  if (profit > 0) return 'pos'
  if (profit < 0) return 'neg'
  return 'zero'
}

function groupCostSubtotalByCurrency(rows, fallbackCurrency = 'USD') {
  const out = {}
  ;(rows || []).forEach((row) => {
    const amt = effectiveCostLine(row)
    if (!Number.isFinite(amt) || amt === 0) return
    const cur = String(row?.currency_code || fallbackCurrency).toUpperCase()
    out[cur] = (Number(out[cur]) || 0) + amt
  })
  return out
}

function groupProfitSubtotalByCurrency(rows, fallbackCurrency = 'USD') {
  const out = {}
  ;(rows || []).forEach((row) => {
    const p = lineProfit(row)
    if (p == null || !Number.isFinite(p)) return
    const cur = String(row?.currency_code || fallbackCurrency).toUpperCase()
    out[cur] = (Number(out[cur]) || 0) + p
  })
  return out
}

function sectionAttachmentsFor(attachmentsMap, sectionId) {
  const k = String(sectionId || '')
  return attachmentsMap[k] || (k === 'additional' ? attachmentsMap.other : null) || []
}

export default function InvoiceDetailModal({ isOpen, invoiceId, onClose, onChanged, canManage = true }) {
  const { t, i18n } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [detailTab, setDetailTab] = useState('invoice')

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

  const totalCostByCurrency = useMemo(
    () => groupCostSubtotalByCurrency(invoice?.items || [], invoice?.currency_code || 'USD'),
    [invoice]
  )

  const profitByCurrency = useMemo(() => {
    const ts = totalsByCurrency
    const tc = totalCostByCurrency
    const keys = new Set([...Object.keys(ts), ...Object.keys(tc)])
    const out = {}
    keys.forEach((k) => {
      out[k] = (Number(ts[k]) || 0) - (Number(tc[k]) || 0)
    })
    return out
  }, [totalsByCurrency, totalCostByCurrency])

  const invoiceGrandProfitNet = useMemo(
    () => Object.values(profitByCurrency).reduce((s, v) => s + (Number(v) || 0), 0),
    [profitByCurrency]
  )

  const grandBreakdownSections = useMemo(() => {
    const fb = invoice?.currency_code || 'USD'
    const ids = ['shipping', 'inland', 'customs', 'insurance', 'additional']
    const map = Object.fromEntries(ids.map((id) => [id, []]))
    ;(invoice?.items || []).forEach((it) => {
      const sid = sectionIdForItem(it)
      if (map[sid] != null) map[sid].push(it)
    })
    return ids.map((id) => ({
      id,
      sell: groupByCurrency(map[id], 'line_total', 'currency_code', fb),
    }))
  }, [invoice])

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
    const fb = invoice?.currency_code || 'USD'
    return defs
      .map((d) => {
        const rows = map[d.id] || []
        const subtotal = groupByCurrency(rows, 'line_total', 'currency_code', fb)
        const costSubtotal = groupCostSubtotalByCurrency(rows, fb)
        const profitSubtotal = groupProfitSubtotalByCurrency(rows, fb)
        return { ...d, rows, subtotal, costSubtotal, profitSubtotal }
      })
      .filter((s) => s.rows.length > 0)
  }, [invoice])

  const sectionIdsKey = useMemo(() => (sectionedItems || []).map((s) => s.id).join('|'), [sectionedItems])
  const [openSections, setOpenSections] = useState(() => new Set())
  useEffect(() => {
    if (!invoice?.id || !sectionIdsKey) return
    setOpenSections(new Set(sectionIdsKey.split('|').filter(Boolean)))
  }, [invoice?.id, sectionIdsKey])

  const toggleSection = useCallback((id) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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

  const invoiceDetailTabs = useMemo(
    () => [
      { id: 'invoice', label: t('invoices.detailModal.tabInvoice', 'Invoice data') },
      { id: 'payments', label: t('invoices.detailModal.tabPayments', 'Invoice payments') },
    ],
    [t]
  )

  const formatCurrencyBreakdown = useCallback((map) => formatOrderedCurrencyMap(map), [])

  const grandCardBreakdownLabel = useCallback((sectionId) => {
    const id = String(sectionId || '')
    if (id === 'additional') return t('shipments.fin.breakdown.other')
    return t(`shipments.fin.breakdown.${id}`)
  }, [t])

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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="shrink-0 border-b border-gray-100 dark:border-gray-700">
          <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-4">
            <h2 id="invoice-detail-modal-title" className="text-xl font-bold">
              {t('invoices.detailsTitle', 'Invoice details')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-full transition-colors shrink-0"
              aria-label={t('common.close', 'Close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {invoice && !loading ? (
            <div className="px-6 pb-4 shipment-fin-modal-root">
              <div className="ship-bar">
                <div>
                  <div className="ship-ref">{invoice.invoice_number || '—'}</div>
                  <div className="ship-client">{invoice.client?.name || '—'}</div>
                </div>
                <div className="ship-metas">
                  <div>
                    <div className="ship-meta-val">{formatDate(invoice.issue_date)}</div>
                    <div className="ship-meta-lbl">{t('invoices.issueDate', 'Issue date')}</div>
                  </div>
                  <div className="ship-meta-divider" aria-hidden />
                  {invoice.due_date ? (
                    <>
                      <div>
                        <div className="ship-meta-val">{formatDate(invoice.due_date)}</div>
                        <div className="ship-meta-lbl">{t('invoices.dueDate', 'Due date')}</div>
                      </div>
                      <div className="ship-meta-divider" aria-hidden />
                    </>
                  ) : null}
                  <div>
                    <div className="ship-meta-val">{invoice.shipment?.bl_number || '—'}</div>
                    <div className="ship-meta-lbl">{t('invoices.table.shipment', 'Shipment')}</div>
                  </div>
                  <div className="ship-meta-divider" aria-hidden />
                  <div>
                    <div
                      className="ship-meta-val max-w-[14rem] truncate"
                      title={invoice.client?.phone?.trim() || undefined}
                    >
                      {invoice.client?.phone?.trim() ? invoice.client.phone.trim() : '—'}
                    </div>
                    <div className="ship-meta-lbl">{t('invoices.shipBarPhone', '📞 Phone')}</div>
                  </div>
                  <div className="ship-meta-divider" aria-hidden />
                  <div>
                    <div
                      className="ship-meta-val max-w-[14rem] truncate break-all"
                      title={invoice.client?.email?.trim() || undefined}
                    >
                      {invoice.client?.email?.trim() ? invoice.client.email.trim() : '—'}
                    </div>
                    <div className="ship-meta-lbl">{t('invoices.shipBarEmail', '✉️ Email')}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {error && (
          <div className="px-6 pt-4">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          </div>
        )}

        {loading || !invoice ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-sm text-gray-500">{t('common.loading', 'Loading...')}</div>
          </div>
        ) : (
          <>
            <Tabs tabs={invoiceDetailTabs} activeTab={detailTab} onChange={setDetailTab} className="client-detail-modal__tabs" />
            <div
              className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6"
              role="tabpanel"
              id={`invoice-detail-panel-${detailTab}`}
              aria-labelledby={`tab-${detailTab}`}
            >
              <>
              {detailTab === 'invoice' ? (
              <div className="shipment-fin-panel shipment-fin-panel--expenses shipment-fin-panel--client-invoice invoice-detail-modal__fin-client">
                {sectionedItems.map((section) => {
                  const isOpen = openSections.has(section.id)
                  const iconCls = sectionIconClass(section.id).trim()
                  const subtotalStr = formatCurrencyMapBadge(section.subtotal)
                  const costStr = formatCurrencyMapBadge(section.costSubtotal)
                  const profitStr = formatCurrencyMapBadge(section.profitSubtotal)
                  const profitNet = Object.values(section.profitSubtotal || {}).reduce((s, v) => s + (Number(v) || 0), 0)
                  const profitBadgeCls =
                    profitNet > 0
                      ? 'shipment-fin-currency-badge--green'
                      : profitNet < 0
                        ? 'shipment-fin-currency-badge--red'
                        : 'shipment-fin-currency-badge--blue'
                  const attList = sectionAttachmentsFor(sectionAttachments, section.id)
                  return (
                    <div key={section.id} className="shipment-fin-card">
                      <button type="button" className="shipment-fin-card__head" onClick={() => toggleSection(section.id)}>
                        <div className="shipment-fin-card__head-main">
                          <span className={`shipment-fin-cost-sec-icon ${iconCls}`.trim()} aria-hidden>
                            {sectionBucketEmoji(section.id)}
                          </span>
                          <div>
                            <div className="shipment-fin-card__title">{t(section.labelKey, section.fallback)}</div>
                          </div>
                        </div>
                        <div className="shipment-fin-card__head-meta">
                          <span className="shipment-fin-card__subtotal shipment-fin-card__subtotal--badges">
                            <span className="shipment-fin-currency-badge shipment-fin-currency-badge--blue">
                              {t('shipments.fin.cliBadgeCost', { defaultValue: 'تكلفة:' })}{' '}
                              {costStr}
                            </span>
                            <span className="shipment-fin-currency-badge shipment-fin-currency-badge--orange">
                              {t('shipments.fin.cliBadgeSell', { defaultValue: 'سعر:' })}{' '}
                              {subtotalStr}
                            </span>
                            <span className={`shipment-fin-currency-badge ${profitBadgeCls}`}>
                              {t('shipments.fin.cliBadgeProfit', { defaultValue: 'ربح:' })}{' '}
                              {profitStr}
                            </span>
                          </span>
                          {isOpen ? <ChevronUp className="shipment-fin-chevron" aria-hidden /> : <ChevronDown className="shipment-fin-chevron" aria-hidden />}
                        </div>
                      </button>
                      {isOpen ? (
                        <div className="shipment-fin-card__body">
                          <div className="shipment-fin-table-wrap shipment-fin-draft-table-wrap">
                            <table className="shipment-fin-line-table shipment-fin-line-table--client-invoice invoice-detail-sec-table">
                              <thead>
                                <tr>
                                  <th>{t('shipments.fin.cliColFeeName', { defaultValue: 'Fee Name' })}</th>
                                  <th>{t('shipments.fin.cliColOriginalCost', { defaultValue: 'Original Cost' })}</th>
                                  <th>{t('shipments.fin.cliColClientPrice', { defaultValue: 'Client Price' })}</th>
                                  <th>{t('shipments.fin.cliColProfitCalculated', { defaultValue: 'Profit' })}</th>
                                  <th>{t('shipments.fin.colCurrency')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section.rows.map((it, idx) => {
                                  const rowCurrency = String(it.currency_code || invoice.currency_code || 'USD').toUpperCase()
                                  const lineTotal = Number(it.line_total) || 0
                                  const origUnit = originalUnitCost(it)
                                  const sellUnit = clientSellUnit(it)
                                  const pr = lineProfit(it)
                                  const pt = profitTone(pr)
                                  return (
                                    <tr key={it.id || `${section.id}-${idx}`}>
                                      <td>
                                        <div className="shipment-fin-line-label-wrap shipment-fin-fee-name-readonly">
                                          <span className="shipment-fin-line-label">
                                            {resolveInvoiceItemFeeDisplayName(
                                              { ...it, section_key: it.section_key || section.id },
                                              t,
                                              Boolean(invoice?.shipment?.is_reefer)
                                            )}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="shipment-fin-num">
                                        {origUnit != null ? money(origUnit, rowCurrency) : '—'}
                                      </td>
                                      <td className="shipment-fin-num">
                                        {sellUnit != null ? money(sellUnit, rowCurrency) : money(lineTotal, rowCurrency)}
                                      </td>
                                      <td className={`shipment-fin-num shipment-fin-profit-cell shipment-fin-profit-cell--${pt}`}>
                                        {pr == null ? '—' : money(pr, rowCurrency)}
                                      </td>
                                      <td className="shipment-fin-cur-cell">{currencyCodePill(rowCurrency)}</td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="shipment-fin-draft-sec-total shipment-fin-draft-sec-total--client-invoice">
                            <span className="shipment-fin-draft-sec-total__label">{t(clientInvoiceSecTotalLabelKey(section.id))}</span>
                            <span className="shipment-fin-draft-sec-total__tv">
                              <span className="shipment-fin-draft-sec-total__badges shipment-fin-draft-sec-total__badges--cli-stack">
                                <span className="shipment-fin-currency-badge shipment-fin-currency-badge--blue">
                                  {t('shipments.fin.cliBadgeCost', { defaultValue: 'تكلفة:' })}{' '}
                                  {costStr}
                                </span>
                                <span className="shipment-fin-currency-badge shipment-fin-currency-badge--orange">
                                  {t('shipments.fin.cliBadgeSell', { defaultValue: 'سعر:' })}{' '}
                                  {subtotalStr}
                                </span>
                                <span className={`shipment-fin-currency-badge ${profitBadgeCls}`}>
                                  {t('shipments.fin.cliBadgeProfit', { defaultValue: 'ربح:' })}{' '}
                                  {profitStr}
                                </span>
                              </span>
                            </span>
                          </div>
                          <div className="shipment-fin-client-meta-strip">
                            <span className="shipment-fin-client-meta-strip__lbl">{t('shipments.fin.attachmentsLabel')}</span>
                            <div className="shipment-fin-client-meta-strip__inner">
                              {attList.length === 0 ? (
                                <span className="shipment-fin-client-meta-strip__empty">—</span>
                              ) : (
                                attList.map((att, idx) => {
                                  const canOpen = Boolean(att.url)
                                  return (
                                    <span key={att.id || `${section.id}-att-${idx}`} className="shipment-fin-client-mini-att">
                                      <button
                                        type="button"
                                        className="shipment-fin-client-att-name"
                                        onClick={() => att.url && window.open(att.url, '_blank', 'noopener,noreferrer')}
                                        disabled={!canOpen}
                                        title={canOpen ? t('shipments.fin.viewReceipt') : undefined}
                                      >
                                        {att.name || 'PDF'}
                                      </button>
                                      {canOpen ? (
                                        <button
                                          type="button"
                                          className="shipment-fin-client-att-ico"
                                          onClick={() => {
                                            if (!att.url) return
                                            const a = document.createElement('a')
                                            a.href = att.url
                                            a.download = att.name || 'attachment'
                                            a.click()
                                          }}
                                          title={t('shipments.fin.downloadReceipt')}
                                          aria-label={t('shipments.fin.downloadReceipt')}
                                        >
                                          <FileDown size={12} />
                                        </button>
                                      ) : null}
                                    </span>
                                  )
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
              ) : (
                <>
                  <section className="invoice-payment-tx-card" aria-label={t('invoices.payments', 'Payments')}>
                    <div className="invoice-payment-tx-card__head">
                      <div className="invoice-payment-tx-card__title">{t('invoices.payments', 'Payments')}</div>
                      {canManage && canRecordPayment && (
                        <button
                          type="button"
                          onClick={() => setPaymentOpen(true)}
                          className="client-detail-modal__btn client-detail-modal__btn--primary client-detail-modal__btn--sm"
                        >
                          <DollarSign className="h-4 w-4" aria-hidden /> {t('invoices.recordPayment', 'Record payment')}
                        </button>
                      )}
                    </div>
                    {(invoice.payments || []).length === 0 ? (
                      <div className="invoice-payment-tx-card__empty">{t('invoices.noPayments', 'No payments yet')}</div>
                    ) : (
                      <ul className="invoice-payment-tx-list">
                        {(invoice.payments || []).map((p) => {
                          const rowCur = String(p.currency_code || invoice?.currency_code || 'USD').toUpperCase()
                          const bankLine = p.bank_name || p.bank_account_name || t('payments.bankAccountOptional', 'No bank account')
                          const primary = (p.method && String(p.method).trim()) || t('invoices.paymentTx.received', 'Payment received')
                          return (
                            <li key={p.id} className="invoice-payment-tx">
                              <div className="invoice-payment-tx__icon-wrap" aria-hidden>
                                <ArrowDownLeft className="invoice-payment-tx__icon" strokeWidth={2.25} />
                              </div>
                              <div className="invoice-payment-tx__body">
                                <div className="invoice-payment-tx__title">{primary}</div>
                                <div className="invoice-payment-tx__meta">
                                  <time dateTime={p.paid_at || p.created_at || undefined} className="invoice-payment-tx__date">
                                    {formatDate(p.paid_at || p.created_at)}
                                  </time>
                                  <span className="invoice-payment-tx__dot" aria-hidden>
                                    ·
                                  </span>
                                  <span className="invoice-payment-tx__bank">{bankLine}</span>
                                </div>
                              </div>
                              <div className="invoice-payment-tx__amount-col">
                                <span className="invoice-payment-tx__amount">{money(p.amount, p.currency_code)}</span>
                                {currencyCodePill(rowCur)}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>

                  <section className="invoice-fin-timeline-card" aria-label={t('invoices.timeline.title', 'Financial Timeline')}>
                    <div className="invoice-fin-timeline-card__head">{t('invoices.timeline.title', 'Financial Timeline')}</div>
                    <ul className="invoice-fin-timeline">
                      {paymentsTimeline.map((event) => (
                        <li key={event.id} className="invoice-fin-timeline__item">
                          <div className="invoice-fin-timeline__dot" aria-hidden />
                          <div className="invoice-fin-timeline__panel">
                            <div className="invoice-fin-timeline__row">
                              <div className="invoice-fin-timeline__main">
                                <div className="invoice-fin-timeline__title">{event.title}</div>
                                <div className="invoice-fin-timeline__meta">{event.meta || '—'}</div>
                              </div>
                              <div className="invoice-fin-timeline__side">
                                <time dateTime={event.date || undefined} className="invoice-fin-timeline__date">
                                  {formatDate(event.date)}
                                </time>
                                {event.amount ? <div className="invoice-fin-timeline__amt">{event.amount}</div> : null}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              )}
              <div className="shipment-fin-draft-grand-total invoice-detail-modal__grand-totals">
                <div className="shipment-fin-draft-grand-top">
                  <div className="shipment-fin-draft-grand-main">
                    <div className="shipment-fin-draft-grand-gl">
                      {t('shipments.fin.clientInvoiceGrandHeading', { defaultValue: 'إجمالي الفاتورة للعميل' })}
                    </div>
                    <div className="shipment-fin-draft-grand-gv">{formatCurrencyBreakdown(totalsByCurrency)}</div>
                    <div className="shipment-fin-draft-grand-gs">{t('shipments.fin.clientInvoiceGrandHint')}</div>
                  </div>
                  <div className="shipment-fin-draft-grand-breakdown">
                    {grandBreakdownSections.map((sec) => (
                      <div key={sec.id} className="shipment-fin-draft-grand-gb-row">
                        <span className="shipment-fin-draft-grand-gb-lbl">
                          {sectionBucketEmoji(sec.id)} {grandCardBreakdownLabel(sec.id)}
                        </span>
                        <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--sell">
                          {formatCurrencyBreakdown(sec.sell)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="shipment-fin-draft-grand-divider" aria-hidden />
                <div className="shipment-fin-draft-grand-profit-summary">
                  <div className="shipment-fin-draft-grand-ps-item">
                    <div className="shipment-fin-draft-grand-ps-lbl">{t('shipments.fin.grandCardHiddenCost')}</div>
                    <div className="shipment-fin-draft-grand-ps-val shipment-fin-draft-grand-ps-val--muted">
                      {formatCurrencyBreakdown(totalCostByCurrency)}
                    </div>
                  </div>
                  <div className="shipment-fin-draft-grand-ps-sep" aria-hidden />
                  <div className="shipment-fin-draft-grand-ps-item">
                    <div className="shipment-fin-draft-grand-ps-lbl">{t('shipments.fin.grandCardSellingTotal')}</div>
                    <div className="shipment-fin-draft-grand-ps-val shipment-fin-draft-grand-ps-val--orange">
                      {formatCurrencyBreakdown(totalsByCurrency)}
                    </div>
                  </div>
                  <div className="shipment-fin-draft-grand-ps-sep" aria-hidden />
                  <div className="shipment-fin-draft-grand-ps-item">
                    <div className="shipment-fin-draft-grand-ps-lbl">{t('shipments.fin.grandCardHiddenProfit')}</div>
                    <div
                      className={
                        invoiceGrandProfitNet > 0
                          ? 'shipment-fin-draft-grand-ps-val shipment-fin-draft-grand-ps-val--profit-pos'
                          : invoiceGrandProfitNet < 0
                            ? 'shipment-fin-draft-grand-ps-val shipment-fin-draft-grand-ps-val--profit-neg'
                            : 'shipment-fin-draft-grand-ps-val shipment-fin-draft-grand-ps-val--muted'
                      }
                    >
                      {formatCurrencyBreakdown(profitByCurrency)}
                    </div>
                  </div>
                </div>
                <div className="shipment-fin-draft-grand-divider" aria-hidden />
                <div className="shipment-fin-draft-grand-meta">
                  <div className="shipment-fin-draft-grand-gb-row">
                    <span className="shipment-fin-draft-grand-gb-lbl">
                      {t('shipments.fin.paidAmount', { defaultValue: 'Paid Amount' })}
                    </span>
                    <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--sell">
                      {formatCurrencyBreakdown(paidByCurrency)}
                    </span>
                  </div>
                  <div className="shipment-fin-draft-grand-gb-row">
                    <span className="shipment-fin-draft-grand-gb-lbl">
                      {t('shipments.fin.remainingAmount', { defaultValue: 'Remaining Balance' })}
                    </span>
                    <span className="shipment-fin-draft-grand-gb-val shipment-fin-draft-grand-gb-val--sell">
                      {formatCurrencyBreakdown(remainingByCurrency)}
                    </span>
                  </div>
                </div>
              </div>
              </>
            </div>
          </>
        )}

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="client-detail-modal__btn client-detail-modal__btn--secondary inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden /> {t('shipments.fin.downloadSalesInvoicePdf', 'Download PDF')}
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
            const token = getStoredToken()
            if (token && invoiceId) {
              getInvoice(token, invoiceId).then(setInvoice).catch(() => {})
            }
          }}
        />
      </div>
    </div>
  )
}

