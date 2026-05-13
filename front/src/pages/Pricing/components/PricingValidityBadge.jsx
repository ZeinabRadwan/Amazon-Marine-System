import { useTranslation } from 'react-i18next'
import { getPricingValidityState } from '../utils/pricingDisplay'

/**
 * Validity line for pricing list cards (sea + inland). Purely presentational.
 */
export default function PricingValidityBadge({ validTo, formattedDate }) {
  const { t } = useTranslation()
  const state = getPricingValidityState(validTo)

  const label =
    state === 'open'
      ? t('pricing.validityOpen', 'No end date')
      : `${t('pricing.validTo')}: ${formattedDate || ''}`.trim()

  const title =
    state === 'expired'
      ? t('pricing.validityExpiredHint', "This rate's validity period has ended.")
      : state === 'active' && formattedDate
        ? t('pricing.validityActiveHint', { date: formattedDate, defaultValue: 'Valid through {{date}}' })
        : state === 'open'
          ? t('pricing.validityOpenHint', 'Open-ended — no expiry date on file.')
          : undefined

  return (
    <span
      className={`pricing-rate-card__validity pricing-rate-card__validity--${state}`}
      title={title}
    >
      {label}
    </span>
  )
}
