import { useTranslation } from 'react-i18next'
import { formatReeferPowerPerDayRate } from '../utils/reeferQuoteCharges'

/**
 * Shown below ocean pricing totals when reefer power is deferred (not in grand total).
 */
export default function QuoteReeferDeferredFootnote({ powerPerDay, className = '' }) {
  const { t } = useTranslation()
  const rate = formatReeferPowerPerDayRate(powerPerDay)

  return (
    <p
      className={`pricing-quote-reefer-deferred-footnote ${className}`.trim()}
      role="note"
      title={t(
        'pricing.reeferDeferredPowerTooltip',
        'Port power is billed separately based on actual stay days after free power days.'
      )}
    >
      <span className="pricing-quote-reefer-deferred-footnote__plus" aria-hidden>
        +{' '}
      </span>
      <span className="pricing-quote-reefer-deferred-footnote__power" lang="en">
        Power
      </span>
      {rate ? (
        <span className="pricing-quote-reefer-deferred-footnote__rate" lang="en">
          {' '}
          {rate}
        </span>
      ) : null}
    </p>
  )
}
