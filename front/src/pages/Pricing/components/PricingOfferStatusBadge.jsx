import { useTranslation } from 'react-i18next'
import { resolveOfferDisplayStatus } from '../utils/pricingOfferStatus'

export default function PricingOfferStatusBadge({ offer, className = '' }) {
  const { t } = useTranslation()
  const key = resolveOfferDisplayStatus(offer)

  const label =
    key === 'draft'
      ? t('pricing.offerStatusDraft', 'Draft')
      : key === 'expired'
        ? t('pricing.offerStatusExpired', 'Expired')
        : key === 'archived'
          ? t('pricing.offerStatusArchived', 'Archived')
          : t('pricing.offerStatusActive', 'Active')

  return (
    <span className={`pricing-rate-card__pill pricing-rate-card__pill--status pricing-rate-card__pill--status-${key} ${className}`.trim()}>
      {label}
    </span>
  )
}
