/**
 * Display label for bilingual CRM / ticket lookups based on active UI language.
 * Supports shipment & client rows (name_ar / name_en), ticket-style rows (label_ar / label_en + name or key).
 *
 * @param {Record<string, unknown>|null|undefined} row
 * @param {string} [lang] i18n language code, e.g. 'ar' or 'en'
 * @returns {string}
 */
export function localizedStatusLabel(row, lang = 'en') {
  if (!row || typeof row !== 'object') return ''
  const isAr = lang === 'ar'

  const nameAr = row.name_ar != null ? String(row.name_ar).trim() : ''
  const nameEn = row.name_en != null ? String(row.name_en).trim() : ''
  if (nameAr !== '' || nameEn !== '') {
    if (isAr) return nameAr || nameEn || ''
    return nameEn || nameAr || ''
  }

  const key = row.key != null ? String(row.key).trim() : ''
  const internal = row.name != null ? String(row.name).trim() : ''
  const fallback = key || internal

  const labelAr = row.label_ar != null ? String(row.label_ar).trim() : ''
  const labelEn = row.label_en != null ? String(row.label_en).trim() : ''
  if (labelAr !== '' || labelEn !== '') {
    if (isAr) return labelAr || labelEn || fallback || ''
    return labelEn || labelAr || fallback || ''
  }

  return fallback || ''
}
