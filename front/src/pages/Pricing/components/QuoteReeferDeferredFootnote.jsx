import { useTranslation } from 'react-i18next'

/**
 * Shown below ocean pricing totals when reefer power is deferred (not in grand total).
 */
export default function QuoteReeferDeferredFootnote({ className = '' }) {
  const { t } = useTranslation()

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
    </p>
  )
}
