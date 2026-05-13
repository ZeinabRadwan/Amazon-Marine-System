import { useTranslation } from 'react-i18next'
import { Anchor, ChevronRight, MapPin, MapPinned, Navigation2, Ship, Truck } from 'lucide-react'

/**
 * Compact origin → destination strip for pricing list cards (sea + inland).
 */
export default function PricingRateCardRoute({ variant, origin, destination, dash }) {
  const { t } = useTranslation()

  const fromText = origin?.trim() ? origin : dash
  const toText = destination?.trim() ? destination : dash
  const routeAria = `${fromText} → ${toText}`

  const isSea = variant === 'sea'
  const originLabel = isSea ? t('pricing.pol', 'POL') : t('pricing.inlandColPort', 'Port')
  const destLabel = isSea ? t('pricing.podShort', 'POD') : t('pricing.offerDetailGovAreaLabel', 'Governorate / area')

  const OriginIcon = isSea ? Anchor : Truck
  const DestIcon = isSea ? MapPinned : MapPin
  const AccentIcon = isSea ? Ship : Navigation2

  return (
    <div
      className={`pricing-rate-card__route-block pricing-rate-card__route-block--${variant}`}
      dir="ltr"
      role="group"
      aria-label={routeAria}
    >
      <div className="pricing-rate-card__route-end pricing-rate-card__route-end--origin">
        <div className="pricing-rate-card__route-end-head">
          <span className="pricing-rate-card__route-end-icon" aria-hidden>
            <OriginIcon className="pricing-rate-card__route-svg" strokeWidth={2.25} />
          </span>
          <span className="pricing-rate-card__route-end-eyebrow">{originLabel}</span>
        </div>
        <div className="pricing-rate-card__route-end-place" title={fromText}>
          {fromText}
        </div>
      </div>

      <div className="pricing-rate-card__route-flow" aria-hidden>
        <span className="pricing-rate-card__route-flow-line" />
        <span className="pricing-rate-card__route-flow-node">
          <AccentIcon className="pricing-rate-card__route-flow-accent" strokeWidth={2} />
        </span>
        <ChevronRight className="pricing-rate-card__route-flow-chev" strokeWidth={2.5} />
        <span className="pricing-rate-card__route-flow-line" />
      </div>

      <div className="pricing-rate-card__route-end pricing-rate-card__route-end--dest">
        <div className="pricing-rate-card__route-end-head">
          <span className="pricing-rate-card__route-end-icon" aria-hidden>
            <DestIcon className="pricing-rate-card__route-svg" strokeWidth={2.25} />
          </span>
          <span className="pricing-rate-card__route-end-eyebrow">{destLabel}</span>
        </div>
        <div className="pricing-rate-card__route-end-place" title={toText}>
          {toText}
        </div>
      </div>
    </div>
  )
}
