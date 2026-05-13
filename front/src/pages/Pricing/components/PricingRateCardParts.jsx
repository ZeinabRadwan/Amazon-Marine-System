import { ArrowRight, ArrowLeft } from 'lucide-react'

/** @returns {'open' | 'active' | 'expired'} */
export function getPricingRateValidityKind(offer) {
  if (!offer?.valid_to) return 'open'
  const end = new Date(offer.valid_to)
  if (Number.isNaN(end.getTime())) return 'open'
  const today = new Date()
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (todayDay > endDay) return 'expired'
  return 'active'
}

/**
 * Shared route strip for sea + inland pricing cards.
 * @param {{ title: string, fromBadge: string, from: string, toBadge: string, to: string, rtl?: boolean }} props
 */
export function PricingRateCardRouteBlock({ title, fromBadge, from, toBadge, to, rtl = false }) {
  const Arrow = rtl ? ArrowLeft : ArrowRight
  return (
    <div className="pricing-rate-card__route-wrap">
      <div className="pricing-rate-card__section-cap">{title}</div>
      <div className="pricing-rate-card__route-visual" role="group" aria-label={title}>
        <div className="pricing-rate-card__route-node">
          <span className="pricing-rate-card__route-badge pricing-rate-card__route-badge--from">{fromBadge}</span>
          <span className="pricing-rate-card__route-text">{from}</span>
        </div>
        <span className="pricing-rate-card__route-arrow" aria-hidden>
          <Arrow className="pricing-rate-card__route-arrow-svg" />
        </span>
        <div className="pricing-rate-card__route-node pricing-rate-card__route-node--end">
          <span className="pricing-rate-card__route-badge pricing-rate-card__route-badge--to">{toBadge}</span>
          <span className="pricing-rate-card__route-text">{to}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Colored validity pill for metric tiles (no duplicate “Valid until” prefix when a label is shown above).
 * @param {{ kind: 'open' | 'active' | 'expired', validStr: string, t: (key: string, defaultValue?: string) => string }} props
 */
export function PricingRateCardValidityPill({ kind, validStr, t }) {
  if (kind === 'open') {
    return <span className="pricing-rate-card__validity pricing-rate-card__validity--open">{t('pricing.validityOpen', 'No end date')}</span>
  }
  if (kind === 'expired') {
    return (
      <span className="pricing-rate-card__validity pricing-rate-card__validity--expired">
        <span className="pricing-rate-card__validity__status">{t('pricing.rateValidityExpired', 'Expired')}</span>
        <span className="pricing-rate-card__validity__date">{validStr}</span>
      </span>
    )
  }
  return <span className="pricing-rate-card__validity pricing-rate-card__validity--active">{validStr}</span>
}

/**
 * @param {{ label: string, children: import('react').ReactNode, title?: string }} props
 */
export function PricingRateCardMetricTile({ label, children, title }) {
  return (
    <div className="pricing-rate-card__metric-tile" title={title}>
      <span className="pricing-rate-card__metric-tile__lbl">{label}</span>
      <span className="pricing-rate-card__metric-tile__val">{children}</span>
    </div>
  )
}
