/**
 * Normalize invoice payloads from the API for UI (list + detail summaries).
 * Adds `totalsByCurrency`: Record<uppercase ISO code, number>.
 */

/** @typedef {Record<string, number>} CurrencyTotals */

/** Same ordering as InvoiceDetailModal / ShipmentFinancialsModal breakdowns. */
export const INVOICE_DISPLAY_CURRENCY_ORDER = ['EGP', 'USD', 'EUR']

function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

/**
 * @param {unknown} raw
 * @returns {CurrencyTotals}
 */
export function normalizeTotalsRecord(raw) {
  /** @type {CurrencyTotals} */
  const out = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw)) {
    const code = String(k ?? '')
      .trim()
      .toUpperCase()
    if (!code || code.length !== 3) continue
    const n = Number(v)
    if (!Number.isFinite(n)) continue
    out[code] = round2((Number(out[code]) || 0) + n)
  }
  return out
}

/**
 * @param {unknown} lines
 * @returns {CurrencyTotals}
 */
export function sumAmountCurrencyLines(lines) {
  /** @type {CurrencyTotals} */
  const out = {}
  if (!Array.isArray(lines)) return out
  for (const row of lines) {
    if (!row || typeof row !== 'object') continue
    const amt = Number(row.amount ?? row.line_total ?? 0)
    if (!Number.isFinite(amt) || Math.abs(amt) < 1e-12) continue
    const cur = String(row.currency_code || row.currency || 'USD')
      .trim()
      .toUpperCase()
    if (!cur || cur.length !== 3) continue
    out[cur] = round2((Number(out[cur]) || 0) + amt)
  }
  return out
}

/**
 * @param {unknown} items
 * @param {string} [fallbackCurrency]
 * @returns {CurrencyTotals}
 */
export function totalsFromInvoiceItems(items, fallbackCurrency = 'USD') {
  const fb = String(fallbackCurrency || 'USD')
    .trim()
    .toUpperCase()
  /** @type {CurrencyTotals} */
  const out = {}
  if (!Array.isArray(items)) return out
  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    const lt = Number(it.line_total ?? 0)
    if (!Number.isFinite(lt)) continue
    const cur = String(it.currency_code || fb)
      .trim()
      .toUpperCase()
    out[cur] = round2((Number(out[cur]) || 0) + lt)
  }
  return out
}

/**
 * @param {CurrencyTotals | null | undefined} totalsByCurrency
 * @returns {Array<[string, number]>}
 */
export function orderInvoiceCurrencyEntries(totalsByCurrency) {
  const map = totalsByCurrency || {}
  const entries = Object.entries(map).filter(([, v]) => Math.abs(Number(v) || 0) > 1e-9)
  const primary = new Set(INVOICE_DISPLAY_CURRENCY_ORDER)
  /** @type {Array<[string, number]>} */
  const out = []
  for (const code of INVOICE_DISPLAY_CURRENCY_ORDER) {
    const hit = entries.find(([c]) => c === code)
    if (hit) out.push(hit)
  }
  entries
    .filter(([c]) => !primary.has(c))
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach((e) => out.push(e))
  return out
}

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
export function mapInvoiceResponse(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return /** @type {Record<string, unknown>} */ (raw)
  }

  /** @type {CurrencyTotals} */
  let totals = {}

  if (
    'totals_by_currency' in raw &&
    raw.totals_by_currency &&
    typeof raw.totals_by_currency === 'object' &&
    !Array.isArray(raw.totals_by_currency)
  ) {
    totals = normalizeTotalsRecord(raw.totals_by_currency)
  } else if (
    'totalsByCurrency' in raw &&
    raw.totalsByCurrency &&
    typeof raw.totalsByCurrency === 'object' &&
    !Array.isArray(raw.totalsByCurrency)
  ) {
    totals = normalizeTotalsRecord(raw.totalsByCurrency)
  }

  if (Object.keys(totals).length === 0 && 'amount' in raw && Array.isArray(raw.amount)) {
    const first = raw.amount[0]
    if (first != null && typeof first === 'object') {
      totals = sumAmountCurrencyLines(raw.amount)
    }
  }

  if (Object.keys(totals).length === 0 && 'currency_lines' in raw && Array.isArray(raw.currency_lines)) {
    totals = sumAmountCurrencyLines(raw.currency_lines)
  }

  if (Object.keys(totals).length === 0 && 'items' in raw && Array.isArray(raw.items) && raw.items.length) {
    totals = totalsFromInvoiceItems(raw.items, raw.currency_code)
  }

  if (Object.keys(totals).length === 0) {
    let amtRaw
    if ('amount' in raw && raw.amount != null && !Array.isArray(raw.amount)) {
      amtRaw = raw.amount
    } else if ('net_amount' in raw && raw.net_amount != null) {
      amtRaw = raw.net_amount
    }
    const amt = Number(amtRaw ?? 0)
    const cur = String(raw.currency_code || 'USD')
      .trim()
      .toUpperCase()
    const safeAmt = Number.isFinite(amt) ? amt : 0
    if (safeAmt !== 0 || raw.currency_code) {
      totals[cur] = round2(safeAmt)
    }
  }

  return {
    ...raw,
    totalsByCurrency: totals,
  }
}

/**
 * @param {unknown[]} rows
 */
export function mapInvoiceListResponse(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map((r) => mapInvoiceResponse(r))
}
