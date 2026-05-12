/** Normalize API date/datetime to YYYY-MM-DD (date part only). */
export function isoDatePart(value) {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

/** Display as DD/MM/YYYY (no ISO in UI). */
export function isoToDdMmYyyy(value) {
  const iso = isoDatePart(value)
  if (!iso) return ''
  const [, y, mo, d] = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/) || []
  if (!y) return ''
  return `${d}/${mo}/${y}`
}

/**
 * Parse DD/MM/YYYY or DD-MM-YYYY → YYYY-MM-DD, or '' if empty.
 * Returns null if non-empty but invalid.
 */
export function parseDdMmYyyyToIso(input) {
  const raw = String(input ?? '').trim()
  if (raw === '') return ''
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!m) return null
  const dd = Number(m[1])
  const mm = Number(m[2])
  const yyyy = Number(m[3])
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null
  const d = new Date(Date.UTC(yyyy, mm - 1, dd))
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null
  const pad = (n) => String(n).padStart(2, '0')
  return `${yyyy}-${pad(mm)}-${pad(dd)}`
}
