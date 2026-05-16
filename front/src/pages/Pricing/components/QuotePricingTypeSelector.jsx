import { useTranslation } from 'react-i18next'
import { Ship, Truck } from 'lucide-react'
import { QUOTE_PRICING_TYPE_INLAND, QUOTE_PRICING_TYPE_SEA } from '../utils/quotePricingType'

/**
 * Step 1 — pick Ocean Freight or Inland Transport (mutually exclusive).
 */
export default function QuotePricingTypeSelector({ value, onChange, disabled = false }) {
  const { t } = useTranslation()

  const options = [
    {
      id: QUOTE_PRICING_TYPE_SEA,
      label: t('pricing.quotePricingTypeSea', 'Ocean Freight'),
      icon: Ship,
    },
    {
      id: QUOTE_PRICING_TYPE_INLAND,
      label: t('pricing.quotePricingTypeInland', 'Inland Transport'),
      icon: Truck,
    },
  ]

  return (
    <div className="pricing-quote-type-selector" role="radiogroup" aria-label={t('pricing.quoteSelectPricingType', 'Select pricing type')}>
      <p className="pricing-quote-type-selector__heading">{t('pricing.quoteSelectPricingType', 'Select pricing type')}</p>
      <div className="pricing-quote-type-selector__options">
        {options.map((opt) => {
          const Icon = opt.icon
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              className={`pricing-quote-type-selector__btn${active ? ' pricing-quote-type-selector__btn--active' : ''}`}
              onClick={() => onChange(opt.id)}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
