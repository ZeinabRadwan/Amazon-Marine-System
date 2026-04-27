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
 * Formats any date-like value into DD/MM/YYYY for UI.
 */
export function formatDate(value, options = {}) {
  const { includeTime = false, divider = ' - ' } = options
  const d = toDate(value)
  if (!d) return '—'
  let result = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  if (includeTime) result += `${divider}${pad(d.getHours())}:${pad(d.getMinutes())}`
  return result
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
