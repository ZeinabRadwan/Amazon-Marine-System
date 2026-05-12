/**
 * Force Western (Latin) digits 0–9 in UI, including when interface language is Arabic.
 * Arabic-Indic (٠–٩) and Eastern Arabic–Indic (۰–۹) are normalized to ASCII.
 */

/**
 * Replace Arabic-Indic / Persian digit characters with ASCII 0–9.
 * @param {unknown} input
 * @returns {string}
 */
export function toWesternDigitString(input) {
  if (input == null) return ''
  return String(input).replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => {
    const c = d.charCodeAt(0)
    if (c >= 0x0660 && c < 0x066a) return String(c - 0x0660)
    if (c >= 0x06f0 && c < 0x06fa) return String(c - 0x06f0)
    return d
  })
}

/** BCP-47 locale for Intl while keeping Latin numbering. */
export function getLatinNumberLocale(language) {
  return String(language || '').toLowerCase().startsWith('ar') ? 'ar-EG' : 'en-US'
}

/**
 * @param {string|undefined} language i18n language code
 * @param {Intl.NumberFormatOptions} [options]
 */
export function latinNumberFormat(language, options = {}) {
  const loc = getLatinNumberLocale(language)
  return new Intl.NumberFormat(loc, { numberingSystem: 'latn', ...options })
}

/**
 * Format integers / decimals for Shipments & Operations UI (counts, KPIs, stats).
 * @param {unknown} value
 * @param {string|undefined} language
 * @param {Intl.NumberFormatOptions} [options]
 */
export function formatShipmentsNumber(value, language, options = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return latinNumberFormat(language, options).format(n)
}

/**
 * @param {Date} date
 * @param {string|undefined} language
 * @param {Intl.DateTimeFormatOptions} options
 */
export function latinDateTimeFormat(language, options) {
  const loc = getLatinNumberLocale(language)
  return new Intl.DateTimeFormat(loc, { numberingSystem: 'latn', ...options })
}
