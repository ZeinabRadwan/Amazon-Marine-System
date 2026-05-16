import { HANDLING_FEE_DESCRIPTION } from './shipmentFinUtils'
import { resolveCostItemStyleFeeNameFromRow } from './shipmentFinFeeNames'

/**
 * Build API invoice line items from Tab B rows (optionally limited to section keys).
 * @param {{
 *   tabBRows: Array,
 *   handlingRow: object,
 *   shipment: object,
 *   deletedSellIds: Set,
 *   sectionKeys?: Set<string>|null,
 *   t: Function,
 * }} opts
 */
export function buildClientInvoiceItemsFromRows({
  tabBRows,
  handlingRow,
  shipment,
  deletedSellIds,
  sectionKeys = null,
  t,
}) {
  const items = []
  const isReefer = Boolean(shipment?.is_reefer)
  const includeSection = (key) => !sectionKeys || sectionKeys.has(key)

  tabBRows.forEach((row, idx) => {
    const bucket = row.bucket_id || 'other'
    if (!includeSection(bucket)) return
    if (String(row.expenseId || '').startsWith('tmp-')) return
    if (deletedSellIds.has(row.expenseId)) return
    if (!row.include) return
    if (row.is_manual_invoice_line && !String(row.description || '').trim()) return

    const sell = Number(row.unit_price)
    const qty =
      bucket === 'insurance'
        ? 1
        : row.is_manual_invoice_line
          ? 1
          : Math.max(1, Number(row.quantity || 1))
    if (Number.isNaN(sell) || sell < 0) return

    const cost = Number(row.cost) || 0
    const feeName = resolveCostItemStyleFeeNameFromRow(row, t, isReefer)
    items.push({
      description: feeName,
      title: feeName,
      quantity: qty,
      unit_price: sell,
      currency_code: (row.currency || 'USD').toUpperCase(),
      section_key: bucket,
      order_index: idx,
      source_key: row.source_key || `expense:${row.expenseId}`,
      cost_unit_price: qty > 0 ? cost / qty : cost,
      cost_line_total: cost,
    })
  })

  if (includeSection('handling') && handlingRow?.include) {
    const qty = Math.max(1, Number(handlingRow.number_of_containers) || 1)
    const h = Number(handlingRow.handling_fee_per_container)
    if (!Number.isNaN(h) && h >= 0) {
      items.push({
        description: HANDLING_FEE_DESCRIPTION,
        title: HANDLING_FEE_DESCRIPTION,
        quantity: qty,
        unit_price: h,
        currency_code: (handlingRow.currency || 'USD').toUpperCase(),
        section_key: 'handling',
        order_index: tabBRows.length + 1,
        source_key: 'handling-fee',
        cost_unit_price: 0,
        cost_line_total: 0,
      })
    }
  }

  return items
}

export const CLIENT_INVOICE_DRAFT_SECTIONS = {
  META: 'meta',
  HANDLING: 'handling',
}
