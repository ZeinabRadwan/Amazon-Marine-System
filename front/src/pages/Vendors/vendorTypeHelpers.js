/**
 * Maps vendor.type to clients-status-badge variant (same pill styles as Clients page).
 */
export function getVendorTypeBadgeVariant(type) {
  const s = String(type || '')
    .toLowerCase()
    .trim()
  if (s === 'shipping') return 'lead'
  if (s === 'transport') return 'prospect'
  if (s === 'customs') return 'new'
  if (s === 'other') return 'inactive'
  return 'default'
}
