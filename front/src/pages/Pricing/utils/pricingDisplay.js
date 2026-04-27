/** Shared keys for approx. totals (must match PricingCard). */
export const SEA_PRICE_KEYS = ['of20', 'of20rf', 'of40', 'thc20', 'thc20rf', 'thc40', 'of40rf', 'thcRf', 'powerDay', 'pti']
export const INLAND_PRICE_KEYS = ['p20x1', 'p20x2', 'p40hq', 'p40rf', 'generator', 't20d', 't40hq', 't40d', 't40r', 't20r']

/** Outer shell + table classes — Ocean and Inland rate tables use the same layout rules. */
export const PRICING_RATES_TABLE_WRAP_CLASS =
  'pricing-offer-cards pricing-rates-table-wrap rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden'

export const PRICING_RATES_TABLE_CLASS = 'pricing-rates-table w-full text-left text-sm'

export function formatSailingDates(dates, locale) {
  if (!dates?.length) return '—'
  const loc = locale === 'ar' ? 'ar-EG' : 'en-US'
  const sep = locale === 'ar' ? ' ، ' : ', '
  return dates
    .map((d) => {
      try {
        const dt = typeof d === 'string' ? new Date(d) : d
        return dt.toLocaleDateString(loc, { day: '2-digit', month: 'short' })
      } catch {
        return String(d)
      }
    })
    .join(sep)
}

export function seaContainerSummary(pricing, t) {
  const dash = t('common.dash')
  if (!pricing) return dash
  const parts = []
  if (pricing.of20?.price != null) parts.push(t('pricing.cardContainerOf20'))
  if (pricing.of20rf?.price != null) parts.push(t('pricing.cardContainerOf20Rf'))
  if (pricing.of40?.price != null) parts.push(t('pricing.cardContainerOf40'))
  if (pricing.of40rf?.price != null) parts.push(t('pricing.cardContainerOf40Rf'))
  return parts.length ? parts.join(t('pricing.cardContainerSep')) : dash
}

export function inlandContainerSummary(pricing, t) {
  const dash = t('common.dash')
  if (!pricing) return dash
  const parts = []
  if (pricing.p20x1?.price != null || pricing.t20d?.price != null) parts.push(t('pricing.detailContainer20'))
  if (pricing.p40hq?.price != null || pricing.t40hq?.price != null || pricing.t40d?.price != null) {
    parts.push(t('pricing.detailContainer40'))
  }
  if (pricing.p40rf?.price != null) parts.push(t('pricing.detailContainerRf'))
  return parts.length ? parts.join(t('pricing.cardContainerSep')) : dash
}
