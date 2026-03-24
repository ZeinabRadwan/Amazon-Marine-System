/**
 * Canonical visit status values (API: nullable string, max 30).
 * Dropdown uses these; unknown legacy values are preserved as a custom <option>.
 */

export const VISIT_STATUS_ORDERED = [
  'planned',
  'pending',
  'in_progress',
  'completed',
  'successful',
  'cancelled',
  'no_show',
]

export function normalizeVisitStatusKey(status) {
  if (status == null || status === '') return ''
  return String(status)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

export function isPredefinedVisitStatus(status) {
  if (status == null || String(status).trim() === '') return true
  return VISIT_STATUS_ORDERED.includes(normalizeVisitStatusKey(status))
}

/**
 * Maps to existing clients-status-badge--* classes (Clients.css).
 */
export function getVisitStatusBadgeVariant(status) {
  const key = normalizeVisitStatusKey(status)
  if (!key) return 'default'
  if (key === 'completed' || key === 'successful') return 'active'
  if (key === 'planned' || key === 'scheduled') return 'prospect'
  if (key === 'pending') return 'pending'
  if (key === 'in_progress' || key === 'inprogress') return 'lead'
  if (key === 'cancelled' || key === 'canceled') return 'inactive'
  if (key === 'no_show' || key === 'noshow') return 'inactive'

  const raw = String(status).trim()
  if (/مكتمل|ناجح|نجاح/.test(raw)) return 'active'
  if (/معلق|قيد|انتظار/.test(raw)) return 'pending'
  if (/ملغي|إلغاء|ملغى/.test(raw)) return 'inactive'
  if (/مجدول|مخطط/.test(raw)) return 'prospect'

  return 'default'
}

export function getVisitStatusLabel(status, t) {
  const raw = String(status ?? '').trim()
  if (!raw) return t('visits.statusEmpty', '—')
  const key = normalizeVisitStatusKey(raw)
  if (VISIT_STATUS_ORDERED.includes(key)) {
    return t(`visits.statusValues.${key}`, { defaultValue: raw })
  }
  return raw
}
