import { useTranslation } from 'react-i18next'
import { formatPricingDecimal, sortCurrencyCodes } from '../../../utils/dateUtils'

function currencyBadgeClass(code, amount) {
  const c = String(code ?? '').toUpperCase()
  if (Number(amount) < 0) return 'shipment-fin-currency-badge--red'
  if (c === 'EGP') return 'shipment-fin-currency-badge--orange'
  if (c === 'USD') return 'shipment-fin-currency-badge--green'
  if (c === 'EUR') return 'shipment-fin-currency-badge--blue'
  return 'shipment-fin-currency-badge--blue'
}

function CurrencyAmountBadges({ amountsByCurrency, dash, allowNegative = false }) {
  const keys = sortCurrencyCodes(
    Object.keys(amountsByCurrency || {}).filter((c) => {
      const n = Number(amountsByCurrency[c] || 0)
      return allowNegative ? Math.abs(n) > 1e-9 : n > 1e-9
    })
  )
  if (!keys.length) {
    return <span className="shipment-fin-currency-badge shipment-fin-currency-badge--blue">{dash}</span>
  }
  return keys.map((cur) => {
    const amt = amountsByCurrency[cur]
    const code = String(cur ?? '')
      .trim()
      .toUpperCase() || 'USD'
    return (
      <span key={cur} className={`shipment-fin-currency-badge ${currencyBadgeClass(cur, amt)}`}>
        {formatPricingDecimal(amt)} {code}
      </span>
    )
  })
}

function SummaryRow({ label, amountsByCurrency, dash, rowClass = '', allowNegative = false }) {
  return (
    <div className={`shipment-fin-draft-sec-total pricing-quote-ocean-summary__row ${rowClass}`.trim()}>
      <span className="shipment-fin-draft-sec-total__label">{label}</span>
      <span className="shipment-fin-draft-sec-total__tv">
        <span className="shipment-fin-draft-sec-total__badges">
          <CurrencyAmountBadges
            amountsByCurrency={amountsByCurrency}
            dash={dash}
            allowNegative={allowNegative}
          />
        </span>
      </span>
    </div>
  )
}

/**
 * Compact ocean freight lines totals: cost → profit → grand (selling).
 */
export default function QuoteOceanLinesSummary({ costByCurrency, profitByCurrency, sellingByCurrency }) {
  const { t } = useTranslation()
  const dash = t('common.dash', '—')

  return (
    <div className="pricing-quote-ocean-summary" role="region" aria-label={t('pricing.oceanLinesSummaryTitle', 'Ocean freight totals')}>
      <SummaryRow
        label={t('pricing.oceanSectionTotalCost', 'Total cost')}
        amountsByCurrency={costByCurrency}
        dash={dash}
        rowClass="pricing-quote-ocean-summary__row--cost"
      />
      <SummaryRow
        label={t('pricing.oceanSectionTotalProfit', 'Total profit')}
        amountsByCurrency={profitByCurrency}
        dash={dash}
        rowClass="pricing-quote-ocean-summary__row--profit"
        allowNegative
      />
      <SummaryRow
        label={t('pricing.oceanSectionGrandTotal', 'Grand total')}
        amountsByCurrency={sellingByCurrency}
        dash={dash}
        rowClass="pricing-quote-ocean-summary__row--grand"
      />
    </div>
  )
}
