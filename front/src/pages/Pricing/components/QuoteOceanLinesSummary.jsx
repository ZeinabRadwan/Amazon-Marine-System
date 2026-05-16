import { QuoteModuleLinesSummary } from './quoteSummaryUi'

/**
 * Compact ocean / inland freight lines totals: cost → profit → grand (selling).
 */
export default function QuoteOceanLinesSummary({
  costByCurrency,
  profitByCurrency,
  sellingByCurrency,
  summaryClassName = 'pricing-quote-module-summary',
  ariaLabelKey = 'pricing.oceanLinesSummaryTitle',
}) {
  return (
    <QuoteModuleLinesSummary
      costByCurrency={costByCurrency}
      profitByCurrency={profitByCurrency}
      sellingByCurrency={sellingByCurrency}
      className={summaryClassName}
      ariaLabelKey={ariaLabelKey}
    />
  )
}
