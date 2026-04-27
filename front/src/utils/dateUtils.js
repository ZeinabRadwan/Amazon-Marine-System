export const SITE_DATE_FORMAT = 'd-m-Y'
export const UI_DATE_FORMAT = 'DD/MM/YYYY'
export const API_DATE_FORMAT = 'YYYY-MM-DD'

function pad(num) {
  return String(num).padStart(2, '0')
}

export function getDateLocale(language) {
  return String(language || '').startsWith('ar') ? 'ar-EG' : 'en-GB'
}

function toDate(value) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Formats any date-like value for UI.
 * Pass `locale` (i18n language code) for locale-aware formatting; omit for legacy DD/MM/YYYY.
 */
export function formatDate(value, options = {}) {
  const { includeTime = false, divider = ' - ', locale } = options
  const d = toDate(value)
  if (!d) return '—'
  if (locale) {
    const loc = getDateLocale(locale)
    let result = new Intl.DateTimeFormat(loc, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
    if (includeTime) {
      result += divider + new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' }).format(d)
    }
    return result
  }
  let result = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  if (includeTime) result += `${divider}${pad(d.getHours())}:${pad(d.getMinutes())}`
  return result
}

export function formatLocaleNumber(value, language, options = {}) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const loc = getDateLocale(language)
  const { minimumFractionDigits = 0, maximumFractionDigits = 2 } = options
  return new Intl.NumberFormat(loc, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number(value))
}

export function formatLocaleMoney(value, currency, language) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const loc = getDateLocale(language)
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(value))
  } catch {
    return `${value} ${currency || ''}`.trim()
  }
}

/** Stable order for displaying multiple currency buckets (extend as needed). */
const PREFERRED_CURRENCY_ORDER = ['USD', 'EUR', 'EGP']

/**
 * @param {string[]} codes
 * @returns {string[]}
 */
export function sortCurrencyCodes(codes) {
  return [...codes].sort((a, b) => {
    const ia = PREFERRED_CURRENCY_ORDER.indexOf(a)
    const ib = PREFERRED_CURRENCY_ORDER.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return String(a).localeCompare(String(b))
  })
}

/**
 * Sum quote-like line items into { [currencyCode]: amount }.
 * @param {Array<{ amount?: unknown, selling_amount?: unknown, currency?: string, currency_code?: string }>} items
 * @returns {Record<string, number>}
 */
export function sumAmountsByCurrencyFromItems(items) {
  const map = {}
  if (!Array.isArray(items)) return map
  for (const it of items) {
    const cur = String(it.currency || it.currency_code || 'USD')
    const n = Number(it.amount ?? it.selling_amount ?? 0)
    if (!Number.isFinite(n) || Math.abs(n) < 1e-12) continue
    map[cur] = (map[cur] || 0) + n
  }
  return map
}

/**
 * Sum `offer.pricing[key].price` buckets by `offer.pricing[key].currency`.
 * @param {Record<string, { price?: unknown, currency?: string }>|null|undefined} pricing
 * @param {string[]} keys
 * @returns {Record<string, number>}
 */
export function sumPricingObjectByCurrency(pricing, keys) {
  const map = {}
  if (!pricing) return map
  for (const k of keys) {
    const item = pricing[k]
    if (item == null || item.price == null || item.price === '') continue
    const n = Number(item.price)
    if (!Number.isFinite(n) || Math.abs(n) < 1e-12) continue
    const cur = String(item.currency || 'USD')
    map[cur] = (map[cur] || 0) + n
  }
  return map
}

/** Add several { [currency]: amount } maps (skips non-finite / ~zero). */
export function mergeCurrencyAmountMaps(...maps) {
  const out = {}
  for (const m of maps) {
    if (!m || typeof m !== 'object') continue
    for (const [c, v] of Object.entries(m)) {
      const n = Number(v)
      if (!Number.isFinite(n) || Math.abs(n) < 1e-12) continue
      out[c] = (out[c] || 0) + n
    }
  }
  return out
}

export function formatDateTime(value) {
  return formatDate(value, { includeTime: true })
}

/**
 * Native <input type="date"> requires YYYY-MM-DD; keep API-safe payload.
 */
export function toApiDate(value) {
  if (!value) return ''
  const normalized = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized
  const ddmmyyyy = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
  const d = toDate(normalized)
  if (!d) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromApiDate(value) {
  if (!value) return ''
  const normalized = String(value).trim()
  const ymd = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!ymd) return formatDate(normalized)
  return `${ymd[3]}/${ymd[2]}/${ymd[1]}`
}
