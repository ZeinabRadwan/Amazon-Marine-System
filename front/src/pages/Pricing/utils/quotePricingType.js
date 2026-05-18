export const QUOTE_PRICING_TYPE_SEA = 'sea'
export const QUOTE_PRICING_TYPE_INLAND = 'inland'

const OCEAN_ITEM_CODES = new Set(['OF', 'THC', 'BL', 'TELEX', 'ISPS', 'PTI', 'POWER'])

/**
 * Single source of truth for quotation module (sea vs inland).
 * Falls back to item/offer inference for legacy rows without pricing_type.
 */
export function resolveQuotePricingType(quote) {
  const stored = String(quote?.pricing_type || '').toLowerCase()
  if (stored === QUOTE_PRICING_TYPE_INLAND || stored === QUOTE_PRICING_TYPE_SEA) {
    return stored
  }

  const items = Array.isArray(quote?.items) ? quote.items : []
  const hasInland = items.some((i) => String(i.code || '').toUpperCase() === 'INLAND')
  const hasOcean = items.some((i) => {
    const code = String(i.code || '').toUpperCase()
    if (!code || code === 'INLAND' || code === 'HANDLING') return false
    if (code === 'OTHER' && quote?.official_receipts_note) return false
    return OCEAN_ITEM_CODES.has(code) || code === 'OTHER'
  })

  if (hasInland && !hasOcean) return QUOTE_PRICING_TYPE_INLAND
  if (quote?.offer?.pricing_type === QUOTE_PRICING_TYPE_INLAND) return QUOTE_PRICING_TYPE_INLAND

  return QUOTE_PRICING_TYPE_SEA
}

export function isSeaQuote(quote) {
  return resolveQuotePricingType(quote) === QUOTE_PRICING_TYPE_SEA
}

export function isInlandQuote(quote) {
  return resolveQuotePricingType(quote) === QUOTE_PRICING_TYPE_INLAND
}

/**
 * Create-quotation UI: show sea route summary (POL/POD, carrier, sailing) only when sea freight is involved.
 * Standard mode: requires a selected sea rate sheet. Quick mode: requires ocean line items started.
 */
export function shouldShowQuoteRouteSummary({
  isQuick = false,
  seaOfferId = '',
  hasOceanLines = false,
  hasBillableOceanLines = false,
} = {}) {
  if (isQuick) {
    return Boolean(hasOceanLines || hasBillableOceanLines)
  }
  return Boolean(String(seaOfferId ?? '').trim())
}

/** Derived route label — not user-selectable. */
export function buildQuoteRouteSummary(quote, dash = '—') {
  if (!quote) return dash
  if (isInlandQuote(quote)) {
    const gov = String(quote.municipality || '').trim()
    const addr = String(quote.inland_address || '').trim()
    if (gov && addr) return `${gov} → ${addr}`
    return gov || addr || dash
  }
  const pol = String(quote.pol || '').trim()
  const pod = String(quote.pod || '').trim()
  if (pol && pod) return `${pol} → ${pod}`
  return pol || pod || dash
}

export function inlandRouteFromOffer(offer) {
  if (!offer) return { port: '', governorate: '', address: '' }
  return {
    port: String(offer.inland_port || '').trim(),
    governorate: String(offer.region || offer.inland_gov || '').trim(),
    address: String(offer.destination || offer.inland_city || '').trim(),
  }
}
