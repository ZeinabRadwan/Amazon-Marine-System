/**
 * Canonical expense category definitions (Arabic labels + emoji).
 * Stored in API as expense_categories with matching `code`.
 */

export const CANONICAL_EXPENSE_CATEGORY_CODES = new Set([
  'rent',
  'salaries',
  'marketing',
  'telecom',
  'transport',
  'print',
  'shipment_expenses',
  'misc',
])

/** Fixed display order for filters and modal */
export const CANONICAL_EXPENSE_CATEGORIES = [
  { code: 'rent', label: '🏢 إيجارات' },
  { code: 'salaries', label: '👥 رواتب' },
  { code: 'marketing', label: '📣 تسويق' },
  { code: 'telecom', label: '📞 اتصالات' },
  { code: 'transport', label: '🚗 مواصلات وسفر' },
  { code: 'print', label: '🖨️ طباعة ومستلزمات' },
  { code: 'shipment_expenses', label: '📦 مصاريف شحنات' },
  { code: 'misc', label: '➕ متفرقات' },
]

/**
 * Marketing subcategory options in the expense form (searchable dropdown).
 * Legacy rows may still carry older free-text values.
 */
export const FORM_MARKETING_SUBCATEGORIES = [
  'منتج',
  'فيديو',
  'تصميم جرافيك',
  'Google Ads',
  'Meta Ads',
  'محتوى وكتابة',
  'تصوير',
  'أخرى',
]

const EXTRA_SUBS_KEY = 'ams.marketingSubcategories.extra.v1'

export function loadExtraMarketingSubs() {
  try {
    const raw = localStorage.getItem(EXTRA_SUBS_KEY)
    const a = raw ? JSON.parse(raw) : []
    return Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.trim()) : []
  } catch {
    return []
  }
}

export function saveExtraMarketingSubs(list) {
  try {
    localStorage.setItem(EXTRA_SUBS_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
}

export function isMarketingCategoryRecord(cat) {
  if (!cat) return false
  if (String(cat.code || '').toLowerCase() === 'marketing') return true
  const n = (cat.name || '').toLowerCase()
  return n.includes('تسويق') || n.includes('marketing')
}
