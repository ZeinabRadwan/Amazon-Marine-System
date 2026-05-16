import { useTranslation } from 'react-i18next'
import { formatPricingDecimal, sortCurrencyCodes } from '../../../utils/dateUtils'

const CURRENCY_ORDER = ['USD', 'EUR', 'EGP']

function sortedAmountKeys(amounts) {
  return sortCurrencyCodes(
    Object.keys(amounts || {}).filter((c) => Math.abs(Number(amounts[c]) || 0) > 1e-9)
  ).sort((a, b) => {
    const ia = CURRENCY_ORDER.indexOf(a)
    const ib = CURRENCY_ORDER.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    return a.localeCompare(b)
  })
}

/** Multi-currency totals as text codes only: "298 USD · 172 EUR" */
export function QuoteSummaryCurrencyText({ amounts, dash = '—', allowNegative = false, className = '' }) {
  const keys = sortedAmountKeys(amounts).filter((c) => {
    const n = Number(amounts[c] || 0)
    return allowNegative ? Math.abs(n) > 1e-9 : n > 1e-9
  })
  if (!keys.length) {
    return <span className={`pricing-quote-summary-currency ${className}`.trim()}>{dash}</span>
  }
  return (
    <span className={`pricing-quote-summary-currency ${className}`.trim()}>
      {keys.map((cur, i) => {
        const code = String(cur ?? '')
          .trim()
          .toUpperCase() || 'USD'
        const amt = Number(amounts[cur] || 0)
        return (
          <span key={cur} className="pricing-quote-summary-currency__part">
            {i > 0 ? <span className="pricing-quote-summary-currency__sep"> · </span> : null}
            <span className="tabular-nums">
              {formatPricingDecimal(amt)} {code}
            </span>
          </span>
        )
      })}
    </span>
  )
}

/** Single summary row: value (left), label (right). */
export function QuoteSummaryRow({ label, children, rowClass = '', valueClassName = '' }) {
  return (
    <div className={`pricing-quote-summary-row ${rowClass}`.trim()}>
      <span className={`pricing-quote-summary-row__value ${valueClassName}`.trim()}>{children}</span>
      <span className="pricing-quote-summary-row__label">{label}</span>
    </div>
  )
}

function ModuleSummaryRow({ label, amountsByCurrency, dash, allowNegative = false, rowClass = '' }) {
  return (
    <QuoteSummaryRow label={label} rowClass={rowClass}>
      <QuoteSummaryCurrencyText amounts={amountsByCurrency} dash={dash} allowNegative={allowNegative} />
    </QuoteSummaryRow>
  )
}

/**
 * Per-module lines summary (cost → profit → grand) with unified dark styling.
 */
export function QuoteModuleLinesSummary({
  costByCurrency,
  profitByCurrency,
  sellingByCurrency,
  className = 'pricing-quote-module-summary',
  ariaLabelKey = 'pricing.oceanLinesSummaryTitle',
}) {
  const { t } = useTranslation()
  const dash = t('common.dash', '—')

  return (
    <div className={className} role="region" aria-label={t(ariaLabelKey, 'Module totals')}>
      <ModuleSummaryRow
        label={t('pricing.oceanSectionTotalCost', 'Total cost')}
        amountsByCurrency={costByCurrency}
        dash={dash}
        rowClass="pricing-quote-module-summary__row--cost"
      />
      <ModuleSummaryRow
        label={t('pricing.oceanSectionTotalProfit', 'Total profit')}
        amountsByCurrency={profitByCurrency}
        dash={dash}
        allowNegative
        rowClass="pricing-quote-module-summary__row--profit"
      />
      <ModuleSummaryRow
        label={t('pricing.oceanSectionGrandTotal', 'Grand total')}
        amountsByCurrency={sellingByCurrency}
        dash={dash}
        rowClass="pricing-quote-module-summary__row--grand"
      />
    </div>
  )
}

/**
 * Fixed grand quotation summary panel (non-collapsible).
 */
export function QuoteGrandSummaryPanel({ title, children }) {
  return (
    <section className="pricing-quote-grand-summary" aria-label={title}>
      {title ? <h3 className="pricing-quote-grand-summary__title">{title}</h3> : null}
      <div className="pricing-quote-grand-summary__body">{children}</div>
    </section>
  )
}
