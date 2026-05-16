import { mergeCurrencyMaps } from '../Shipments/shipmentFinancialAggregation'

/** Aggregate invoice rows into multi-currency totals (same rules as AccountsOverview detail). */
export function computeCustomerStatementDetailTotals(customerDetail) {
  const invoices = customerDetail?.invoices
  const prepaidMap = customerDetail?.prepaid_balance_by_currency || {}
  if (!Array.isArray(invoices) || !invoices.length) {
    return { invoiceCount: 0, totalMap: {}, paidMap: {}, remainingMap: {}, prepaidMap }
  }
  let totalMap = {}
  let paidMap = {}
  let remainingMap = {}
  for (const inv of invoices) {
    totalMap = mergeCurrencyMaps(totalMap, inv.total_amount || {})
    paidMap = mergeCurrencyMaps(paidMap, inv.paid_amount || {})
    remainingMap = mergeCurrencyMaps(remainingMap, inv.remaining_amount || {})
  }
  return { invoiceCount: invoices.length, totalMap, paidMap, remainingMap, prepaidMap }
}

/** Flatten payment_history across invoices, newest first (same shape as statement detail page). */
export function flattenCustomerStatementPayments(customerDetail) {
  const rows = []
  for (const inv of customerDetail?.invoices || []) {
    const invRef = inv.invoice_reference
    const shipRef = inv.shipment_reference
    for (const p of inv.payment_history || []) {
      rows.push({
        ...p,
        _fallback_shipment_reference: p.shipment_reference || shipRef,
        _invoice_reference: invRef,
        _invoice_shipment_id: inv.shipment_id,
        _fallback_shipment_type: inv.shipment_type,
        _fallback_booking_number: inv.booking_number,
        _invoice_status: inv.status,
        invoice_currency_code: p.invoice_currency_code || inv.currency_code,
      })
    }
  }
  for (const p of customerDetail?.advance_payments || []) {
    rows.push({
      ...p,
      is_advance: true,
      _fallback_shipment_reference: p.shipment_reference,
      _invoice_reference: null,
      invoice_currency_code: p.currency_code,
    })
  }
  rows.sort((a, b) => String(b.paid_at || '').localeCompare(String(a.paid_at || '')))
  return rows
}
