import { displayNumericInputValue } from '../utils/pricingFormNumeric'

export const SEA_PRICING_CURRENCIES = ['EGP', 'USD', 'EUR']

/**
 * Shared horizontal row for sea custom charge add + editable line items.
 * Matches `.sea-rate-custom-entry` layout in Pricing.css.
 */
export default function SeaCustomChargeEntry({
  name = '',
  amount = '',
  currency = 'USD',
  onNameChange,
  onAmountChange,
  onCurrencyChange,
  onAction,
  actionLabel,
  actionAriaLabel,
  actionVariant = 'add',
  currencies = SEA_PRICING_CURRENCIES,
  nameLabel = 'اسم البند / Charge Name',
  amountLabel = 'المبلغ / Amount',
  currencyLabel = 'العملة',
  namePlaceholder = 'e.g. ISPS, EBS, BAF...',
  className = '',
}) {
  const actionClass =
    actionVariant === 'remove' ? 'sea-rate-btn sea-rate-btn--row-remove' : 'sea-rate-btn'

  return (
    <div className={`sea-rate-custom-entry ${className}`.trim()}>
      <div className="sea-rate-custom-name">
        <label className="sea-rate-label">{nameLabel}</label>
        <input
          type="text"
          className="sea-rate-input"
          placeholder={namePlaceholder}
          value={name}
          onChange={(e) => onNameChange?.(e.target.value)}
        />
      </div>
      <div className="sea-rate-custom-amount">
        <label className="sea-rate-label">{amountLabel}</label>
        <input
          type="number"
          min={0}
          step="0.01"
          className="sea-rate-input"
          placeholder="0"
          value={displayNumericInputValue(amount)}
          onChange={(e) => onAmountChange?.(e.target.value)}
        />
      </div>
      <div className="sea-rate-custom-currency">
        <label className="sea-rate-label">{currencyLabel}</label>
        <select
          className="sea-rate-select"
          value={currency || 'USD'}
          onChange={(e) => onCurrencyChange?.(e.target.value)}
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {onAction ? (
        <button type="button" className={actionClass} onClick={onAction} aria-label={actionAriaLabel}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
