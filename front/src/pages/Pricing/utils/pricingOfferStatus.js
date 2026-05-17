/** @param {string} isoDate YYYY-MM-DD */
function isPastDate(isoDate) {
  if (!isoDate) return false
  const end = new Date(`${String(isoDate).slice(0, 10)}T23:59:59`)
  if (Number.isNaN(end.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return end < today
}

/**
 * Lifecycle for price sheets: draft | active | expired | archived
 * @param {{ status?: string, display_status?: string, valid_to?: string|null }} offer
 */
export function resolveOfferDisplayStatus(offer) {
  if (!offer) return 'active'
  if (offer.display_status) return offer.display_status
  if (offer.status === 'draft') return 'draft'
  if (offer.status === 'archived') return 'archived'
  if (offer.status === 'active' && isPastDate(offer.valid_to)) return 'expired'
  return offer.status === 'active' ? 'active' : offer.status || 'active'
}

export function isOfferQuotable(offer) {
  if (offer?.is_quotable != null) return Boolean(offer.is_quotable)
  return resolveOfferDisplayStatus(offer) === 'active'
}
