import { useTranslation } from 'react-i18next'
import {
  formatReeferPowerFreeDaysEnglish,
  formatReeferPowerPerDayRate,
} from '../utils/reeferQuoteCharges'

/**
 * Deferred reefer port power — not in quotation totals; labels stay English (Power, Power Free Days).
 */
export default function QuoteReeferDeferredFootnote({ powerPerDay, freePowerDays, className = '' }) {
  const { t } = useTranslation()
  const rate = formatReeferPowerPerDayRate(powerPerDay)
  const freeDaysLabel = formatReeferPowerFreeDaysEnglish(freePowerDays)

  return (
    <div
      className={`pricing-quote-reefer-deferred-footnote ${className}`.trim()}
      role="note"
      title={t(
        'pricing.reeferDeferredPowerTooltip',
        'Port power is billed separately based on actual stay days after free power days.'
      )}
    >
      <p className="pricing-quote-reefer-deferred-footnote__line">
        <span className="pricing-quote-reefer-deferred-footnote__plus" aria-hidden>
          +{' '}
        </span>
        <span className="pricing-quote-reefer-deferred-footnote__power" lang="en">
          Power:
        </span>
        {rate ? (
          <span className="pricing-quote-reefer-deferred-footnote__rate" lang="en">
            {' '}
            {rate}
          </span>
        ) : null}
      </p>
      {freeDaysLabel ? (
        <p className="pricing-quote-reefer-deferred-footnote__line pricing-quote-reefer-deferred-footnote__line--free">
          <span className="pricing-quote-reefer-deferred-footnote__free-days" lang="en">
            {freeDaysLabel}
          </span>
        </p>
      ) : null}
    </div>
  )
}
