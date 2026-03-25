/**
 * Shipment status helpers – align with GET /shipment-statuses (name_ar, name_en, color).
 * Shipments store `status` as a string that should match name_en/name_ar or optional `key` if present.
 */

/**
 * Value used for filters and API `status` query (must match DB `shipments.status`).
 * @param {Record<string, unknown>} s
 * @returns {string}
 */
export function shipmentStatusFilterValue(s) {
  if (!s || typeof s !== 'object') return ''
  if (s.key != null && String(s.key).trim() !== '') return String(s.key).trim()
  if (s.name_en != null && String(s.name_en).trim() !== '') return String(s.name_en).trim()
  if (s.name_ar != null && String(s.name_ar).trim() !== '') return String(s.name_ar).trim()
  return s.id != null ? String(s.id) : ''
}

/**
 * @param {Array<Record<string, unknown>>|null|undefined} options
 * @param {unknown} rawStatus
 * @returns {Record<string, unknown>|null}
 */
export function findShipmentStatusOption(options, rawStatus) {
  if (rawStatus == null || rawStatus === '') return null
  if (!Array.isArray(options) || options.length === 0) return null
  const str = String(rawStatus).trim()
  const lower = str.toLowerCase()

  for (const s of options) {
    const fv = shipmentStatusFilterValue(s)
    if (fv && fv === str) return s
  }
  for (const s of options) {
    const en = s.name_en != null ? String(s.name_en).trim() : ''
    const ar = s.name_ar != null ? String(s.name_ar).trim() : ''
    if (en && (en === str || en.toLowerCase() === lower)) return s
    if (ar && (ar === str || ar.toLowerCase() === lower)) return s
  }
  for (const s of options) {
    if (s.key == null) continue
    const k = String(s.key).trim()
    if (k && k.toLowerCase() === lower) return s
  }
  return null
}

/**
 * @param {Record<string, unknown>|null|undefined} option
 * @param {string} [lang]
 * @returns {string}
 */
export function shipmentStatusLocalizedLabel(option, lang = 'en') {
  if (!option || typeof option !== 'object') return ''
  const isAr = String(lang || '').toLowerCase().startsWith('ar')
  const ar = option.name_ar != null ? String(option.name_ar).trim() : ''
  const en = option.name_en != null ? String(option.name_en).trim() : ''
  const key = option.key != null ? String(option.key).trim() : ''
  if (isAr) return ar || en || key || ''
  return en || ar || key || ''
}

/**
 * When no row matches /shipment-statuses, map legacy slugs via i18n (e.g. booked).
 * @param {(key: string) => string} t - i18n t()
 * @param {unknown} raw
 * @returns {string}
 */
export function shipmentStatusLegacyLabel(raw, t) {
  if (raw == null || raw === '') return '—'
  const slug = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  if (!slug) return String(raw)
  const path = `shipments.statusLegacy.${slug}`
  const out = t(path)
  return out === path ? String(raw) : out
}

/**
 * @param {string|undefined|null} hex
 * @param {number} alpha
 * @returns {string|null}
 */
export function shipmentStatusHexToRgba(hex, alpha) {
  if (typeof hex !== 'string') return null
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return null
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Seeded / default English labels → Clients.css badge variant (same keys as client statuses). */
const SHIPMENT_VARIANT_BY_NAME_EN = {
  'Booking Confirmed': 'new',
  'Container Allocation': 'pending',
  'Loading in Progress': 'pending',
  'Vessel Departed': 'pending',
  'In Transit': 'pending',
  'Customs Clearance': 'prospect',
  'Ready for Delivery': 'pending',
  Delivered: 'active',
}

const SHIPMENT_LEGACY_SLUG_VARIANT = {
  booked: 'new',
  in_transit: 'pending',
  customs_clearance: 'prospect',
  delivered: 'active',
  unknown: 'default',
  draft: 'inactive',
}

function shipmentStatusSlug(raw) {
  if (raw == null || raw === '') return ''
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function inferShipmentVariantFromText(text) {
  const x = String(text).toLowerCase()
  if (!x.trim()) return 'default'
  if ((/\bdelivered\b|تم التسليم/.test(x)) && !/ready\s*for|جاهز\s*للتسليم/.test(x)) {
    return 'active'
  }
  if (/ready\s*for\s*delivery|جاهز\s*للتسليم/.test(x)) return 'pending'
  if (/customs|clearance|تخليص|جمركي/.test(x)) return 'prospect'
  if (/\bbooking\b|confirmed|حجز|تأكيد/.test(x)) return 'new'
  if (/transit|loading|vessel|allocation|طريق|تحميل|غادرت|تخصيص/.test(x)) return 'pending'
  return 'default'
}

/**
 * Badge style variant for `clients-status-badge--{variant}` (matches Clients page).
 * @param {Record<string, unknown>|null|undefined} option
 * @param {unknown} rawStatus
 * @returns {'new'|'active'|'inactive'|'pending'|'prospect'|'lead'|'default'}
 */
export function getShipmentStatusBadgeVariant(option, rawStatus) {
  const en = option?.name_en != null ? String(option.name_en).trim() : ''
  if (en && SHIPMENT_VARIANT_BY_NAME_EN[en]) return SHIPMENT_VARIANT_BY_NAME_EN[en]

  const blob = [option?.name_en, option?.name_ar].filter(Boolean).join(' ')
  if (blob.trim()) {
    const inferred = inferShipmentVariantFromText(blob)
    if (inferred !== 'default') return inferred
  }

  const slug = shipmentStatusSlug(rawStatus)
  if (slug && SHIPMENT_LEGACY_SLUG_VARIANT[slug]) return SHIPMENT_LEGACY_SLUG_VARIANT[slug]

  if (rawStatus != null && String(rawStatus).trim() !== '') {
    const fromRaw = inferShipmentVariantFromText(String(rawStatus))
    if (fromRaw !== 'default') return fromRaw
  }

  return 'default'
}
