/**
 * Canonical Ocean Side Pricing display order (sea freight rate + quotation lines).
 * OF → THC → B/L → Telex → PTI → Power → other charges.
 */

export const SEA_PRICING_CODE_ORDER = [
  'of20',
  'of20rf',
  'of40',
  'of40rf',
  'thc20',
  'thc20rf',
  'thc40',
  'thcRf',
  'thcrf',
  'blFee',
  'bl',
  'bl_fee',
  'telex',
  'pti',
  'powerDay',
  'power_day',
]

/** Quotation item codes derived from sea rate pricing keys. */
export const SEA_QUOTE_CODE_ORDER = ['OF', 'THC', 'BL', 'TELEX', 'ISPS', 'PTI', 'POWER']

const codeIndexMap = (() => {
  const m = new Map()
  SEA_PRICING_CODE_ORDER.forEach((code, idx) => {
    m.set(String(code).toLowerCase(), idx)
  })
  return m
})()

const quoteCodeIndexMap = (() => {
  const m = new Map()
  SEA_QUOTE_CODE_ORDER.forEach((code, idx) => {
    m.set(String(code).toUpperCase(), idx)
  })
  return m
})()

export function seaPricingCodeSortIndex(code) {
  const c = String(code || '').trim().toLowerCase()
  if (codeIndexMap.has(c)) return codeIndexMap.get(c)
  const other = /^othercharge(\d+)$/i.exec(c)
  if (other) return SEA_PRICING_CODE_ORDER.length + parseInt(other[1], 10)
  return SEA_PRICING_CODE_ORDER.length + 999
}

export function seaQuoteCodeSortIndex(code) {
  const c = String(code || '').trim().toUpperCase()
  if (quoteCodeIndexMap.has(c)) return quoteCodeIndexMap.get(c)
  if (c === 'OTHER') return SEA_QUOTE_CODE_ORDER.length + 50
  return SEA_QUOTE_CODE_ORDER.length + 999
}

export function compareSeaPricingCodes(a, b) {
  return seaPricingCodeSortIndex(a) - seaPricingCodeSortIndex(b)
}

export function compareSeaQuoteCodes(a, b) {
  return seaQuoteCodeSortIndex(a) - seaQuoteCodeSortIndex(b)
}

/** Sort pricing_items rows or { code, ... } objects. */
export function sortSeaPricingItems(items) {
  if (!Array.isArray(items)) return []
  return [...items].sort((a, b) => compareSeaPricingCodes(a?.code ?? a?.key, b?.code ?? b?.key))
}

/** Sort [code, item] tuples from offer.pricing. */
export function sortSeaPricingCodeEntries(entries) {
  if (!Array.isArray(entries)) return []
  return [...entries].sort(([codeA], [codeB]) => compareSeaPricingCodes(codeA, codeB))
}

/** Sort ocean quotation line rows (code or sourceKey). */
export function sortSeaOceanQuoteLines(lines) {
  if (!Array.isArray(lines)) return []
  return [...lines].sort((a, b) => {
    const ia = seaQuoteCodeSortIndex(a?.code)
    const ib = seaQuoteCodeSortIndex(b?.code)
    if (ia !== ib) return ia - ib
    return compareSeaPricingCodes(a?.sourceKey, b?.sourceKey)
  })
}

/** Ordered keys for sea rate detail fallback when iterating offer.pricing. */
export const SEA_PRICING_DETAIL_FALLBACK_KEYS = [...SEA_PRICING_CODE_ORDER]
