import { expenseBucket } from './shipmentFinUtils'

/** Display label resolved via i18n when shipment expenses have no linked vendor. */
export const UNASSIGNED_PARTNER_SENTINEL = '__UNASSIGNED_PARTNER__'

/**
 * Aggregation helpers aligned with ShipmentFinancialsModal cost/expense handling.
 * Used by Accounting overview to summarize shipment-linked expenses by partner (vendor)
 * without importing the modal bundle.
 */

/**
 * @param {Array<{ currency_code?: string, amount?: number }>} rows
 * @returns {Record<string, number>}
 */
export function sumExpenseAmountsByCurrency(rows) {
  const safeRows = Array.isArray(rows) ? rows : []
  const map = {}
  for (const r of safeRows) {
    const curRaw = String(r.currency_code || '').trim().toUpperCase()
    const amt = Number(r.amount)
    if (!Number.isFinite(amt) || amt <= 0) continue
    if (!curRaw || curRaw === '—') continue
    map[curRaw] = (map[curRaw] || 0) + amt
  }
  return map
}

/**
 * @param {Record<string, number>} target
 * @param {Record<string, number>} source
 * @returns {Record<string, number>}
 */
export function mergeCurrencyMaps(target, source) {
  const out = { ...(target || {}) }
  for (const [currency, amount] of Object.entries(source || {})) {
    out[currency] = (Number(out[currency]) || 0) + (Number(amount) || 0)
  }
  return out
}

/**
 * Remaining balance per currency: shipment-cost payable minus vendor payments recorded for that partner.
 *
 * @param {Record<string, number>} payableMap
 * @param {Record<string, number>} paidMap
 * @returns {Record<string, number>}
 */
export function remainingBalanceAfterPaid(payableMap, paidMap) {
  const out = {}
  const currencies = new Set([
    ...Object.keys(payableMap || {}),
    ...Object.keys(paidMap || {}),
  ])
  for (const c of currencies) {
    out[c] = (Number(payableMap?.[c]) || 0) - (Number(paidMap?.[c]) || 0)
  }
  return out
}

/**
 * Resolve partner same rules as ShipmentFinancialsModal: explicit expense vendor wins;
 * else shipping → shipment line vendor; inland/customs/insurance → section_meta on cost invoice;
 * custom section buckets → matching section_meta block with *_vendor_id.
 *
 * @param {{
 *   vendor_id?: number|null,
 *   vendor_name?: string,
 *   description?: string,
 *   category_name?: string,
 *   bucket_id?: string,
 *   shipment_id?: number|null,
 * }} row
 * @param {{
 *   line_vendor_id?: number|null,
 *   line_vendor_name?: string|null,
 *   section_meta?: Record<string, unknown>,
 * } | null | undefined} shipmentCtx
 * @returns {{ vendor_id: number, vendor_name: string | null } | null}
 */
export function resolveResponsibleVendorForShipmentExpense(row, shipmentCtx) {
  const direct = Number(row.vendor_id)
  if (Number.isFinite(direct) && direct > 0) {
    return {
      vendor_id: direct,
      vendor_name: String(row.vendor_name || '').trim() || null,
    }
  }

  const sid = Number(row.shipment_id)
  if (!Number.isFinite(sid) || sid <= 0 || !shipmentCtx) {
    return null
  }

  const synthetic = {
    description: row.description,
    category_name: row.category_name,
    bucket_id: row.bucket_id,
  }

  const bucket = expenseBucket(synthetic)
  const meta =
    shipmentCtx.section_meta && typeof shipmentCtx.section_meta === 'object'
      ? shipmentCtx.section_meta
      : {}

  if (bucket === 'shipping') {
    const vid = Number(shipmentCtx.line_vendor_id)
    if (Number.isFinite(vid) && vid > 0) {
      const nm =
        String(shipmentCtx.line_vendor_name || '').trim() ||
        null
      return { vendor_id: vid, vendor_name: nm }
    }
    return null
  }

  if (bucket === 'inland') {
    const block = meta.inland && typeof meta.inland === 'object' ? meta.inland : {}
    const vid = Number(block.contractor_vendor_id)
    if (Number.isFinite(vid) && vid > 0) {
      const nm = String(block.contractor_name || '').trim() || null
      return { vendor_id: vid, vendor_name: nm }
    }
    return null
  }

  if (bucket === 'customs') {
    const block = meta.customs && typeof meta.customs === 'object' ? meta.customs : {}
    const vid = Number(block.customs_broker_vendor_id)
    if (Number.isFinite(vid) && vid > 0) {
      const nm = String(block.customs_broker_name || '').trim() || null
      return { vendor_id: vid, vendor_name: nm }
    }
    return null
  }

  if (bucket === 'insurance') {
    const block = meta.insurance && typeof meta.insurance === 'object' ? meta.insurance : {}
    const vid = Number(block.insurance_company_vendor_id)
    if (Number.isFinite(vid) && vid > 0) {
      const nm = String(block.insurance_company_name || '').trim() || null
      return { vendor_id: vid, vendor_name: nm }
    }
    return null
  }

  /** Dynamic section id (same id keys as saved cost-invoice section_meta). */
  if (bucket !== 'other' && meta[bucket] && typeof meta[bucket] === 'object') {
    const block = meta[bucket]
    for (const [k, v] of Object.entries(block)) {
      if (k === 'vendor_id' || (typeof k === 'string' && k.endsWith('_vendor_id'))) {
        const vid = Number(v)
        if (Number.isFinite(vid) && vid > 0) {
          const nameKey = k.replace(/_vendor_id$/i, '_name')
          const nm =
            block[nameKey] != null && String(block[nameKey]).trim() !== ''
              ? String(block[nameKey]).trim()
              : null
          return { vendor_id: vid, vendor_name: nm }
        }
      }
    }
  }

  return null
}

function partnerDisplayLabel(resolved, row, vendorNamesMap) {
  const vid = resolved.vendor_id
  const fromExpense = String(row.vendor_name || '').trim()
  const expenseVid = Number(row.vendor_id)
  if (fromExpense && Number.isFinite(expenseVid) && expenseVid === vid) {
    return fromExpense
  }
  const fromResolved = String(resolved.vendor_name || '').trim()
  if (fromResolved) {
    return fromResolved
  }
  const mapName = vendorNamesMap[String(vid)] ?? vendorNamesMap[vid]
  if (mapName) {
    return String(mapName)
  }
  return `#${vid}`
}

/**
 * Group shipment expense rows by responsible partner (vendor).
 * Rows without a resolvable partner are omitted (no synthetic partners).
 *
 * @param {Array<Record<string, unknown>>} expenseRows
 * @param {Record<string, { line_vendor_id?: number|null, line_vendor_name?: string|null, section_meta?: Record<string, unknown> }>} shipmentContextById
 * @param {Record<string, string>} vendorNamesMap id -> name from API
 */
export function aggregateShipmentCostsByPartner(
  expenseRows,
  shipmentContextById = {},
  vendorNamesMap = {},
) {
  const list = Array.isArray(expenseRows) ? expenseRows : []
  const groups = new Map()

  for (const row of list) {
    const sid = row.shipment_id != null ? String(row.shipment_id) : ''
    const ctx = sid ? shipmentContextById[sid] : null
    const resolved = resolveResponsibleVendorForShipmentExpense(row, ctx)
    if (!resolved?.vendor_id) {
      continue
    }

    const vid = resolved.vendor_id
    const key = `id:${vid}`
    const partnerName = partnerDisplayLabel(resolved, row, vendorNamesMap)
    const rowMap = sumExpenseAmountsByCurrency([row])

    const prev = groups.get(key)
    if (!prev) {
      groups.set(key, {
        key,
        partner_id: vid,
        partner_name: partnerName,
        payable_by_currency: { ...rowMap },
        expense_line_count: 1,
        lines: [row],
      })
    } else {
      prev.payable_by_currency = mergeCurrencyMaps(prev.payable_by_currency, rowMap)
      prev.expense_line_count += 1
      prev.lines.push(row)
      if (!prev.partner_name || prev.partner_name.startsWith('#')) {
        prev.partner_name = partnerName
      }
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    String(a.partner_name).localeCompare(String(b.partner_name), undefined, { sensitivity: 'base' }),
  )
}
