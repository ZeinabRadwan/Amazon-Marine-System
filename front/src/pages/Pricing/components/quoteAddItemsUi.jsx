import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { displayNumericInputValue } from '../utils/pricingFormNumeric'
import { formatPricingDecimal } from '../../../utils/dateUtils'

export const QUOTE_ADD_CURRENCY_OPTIONS = ['USD', 'EUR', 'EGP']

export function parseQuoteAddAmount(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Inline amount (wide) + currency select for forms and table cells. */
export function QuoteAmountCurrencyField({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  amountAriaLabel,
  currencyAriaLabel,
}) {
  const { t } = useTranslation()
  return (
    <div className="pricing-quote-amount-currency-field">
      <input
        type="number"
        min="0"
        step="0.01"
        className="pricing-quote-customs-input pricing-quote-customs-input--amount-wide tabular-nums"
        dir="ltr"
        value={displayNumericInputValue(amount)}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder="0"
        aria-label={amountAriaLabel || t('shipments.expColAmount', 'Amount')}
      />
      <select
        value={currency || 'USD'}
        onChange={(e) => onCurrencyChange(e.target.value)}
        className="pricing-quote-customs-input pricing-quote-customs-input--currency"
        aria-label={currencyAriaLabel || t('pricing.currency', 'Currency')}
      >
        {QUOTE_ADD_CURRENCY_OPTIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  )
}

function ReadOnlyAmountCell({ amount, currency }) {
  const cur = String(currency || 'USD').toUpperCase()
  const num = Number(amount)
  const display = Number.isFinite(num) ? formatPricingDecimal(num) : '0'
  return <span className="pricing-quote-cost-label tabular-nums">{display} {cur}</span>
}

/** Separate table for user-added line items only. */
export function QuoteAddedItemsTable({ items, onUpdateItem, onRemoveItem, tableClassName = '', readOnly = false }) {
  const { t } = useTranslation()
  if (!items?.length) return null

  const tableClass = ['pricing-quote-customs-table', 'pricing-quote-added-items-table', tableClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="pricing-quote-added-items-block">
      <table className={tableClass}>
        <thead>
          <tr>
            <th>{t('pricing.item', 'Item')}</th>
            <th className="pricing-quote-customs-table__col-amount">{t('shipments.expColAmount', 'Amount')}</th>
            <th className="pricing-quote-customs-table__col-currency">{t('pricing.currency', 'Currency')}</th>
            {!readOnly ? (
              <th className="pricing-quote-added-items-table__col-actions">{t('pricing.colActions', 'Actions')}</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td className="pricing-quote-customs-table__item">
                {readOnly ? (
                  <span className="pricing-quote-line-name">{row.name || '—'}</span>
                ) : (
                  <input
                    type="text"
                    className="pricing-quote-customs-input"
                    value={row.name}
                    onChange={(e) => onUpdateItem(row.id, { name: e.target.value })}
                    placeholder={t('pricing.customsAddItemName', 'Item name')}
                  />
                )}
              </td>
              <td className="pricing-quote-customs-table__col-amount">
                {readOnly ? (
                  <ReadOnlyAmountCell amount={row.amount} currency={row.currency} />
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="pricing-quote-customs-input pricing-quote-customs-input--amount-wide tabular-nums"
                    dir="ltr"
                    value={displayNumericInputValue(row.amount)}
                    onChange={(e) => onUpdateItem(row.id, { amount: e.target.value })}
                    placeholder="0"
                    aria-label={t('shipments.expColAmount', 'Amount')}
                  />
                )}
              </td>
              <td className="pricing-quote-customs-table__col-currency">
                {readOnly ? (
                  <span className="pricing-quote-customs-currency-readonly">{String(row.currency || 'USD').toUpperCase()}</span>
                ) : (
                  <select
                    value={row.currency || 'USD'}
                    onChange={(e) => onUpdateItem(row.id, { currency: e.target.value })}
                    className="pricing-quote-customs-input pricing-quote-customs-input--currency"
                    aria-label={t('pricing.currency', 'Currency')}
                  >
                    {QUOTE_ADD_CURRENCY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              {!readOnly ? (
                <td className="pricing-quote-added-items-table__col-actions">
                  <button
                    type="button"
                    className="pricing-quote-customs-row-remove"
                    onClick={() => onRemoveItem(row.id)}
                    aria-label={t('pricing.customsRemoveRow', 'Remove item')}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Add-item form (name, amount, currency) + Add button — place above module summary.
 */
export function QuoteAddItemPanel({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  addedItemsTableClassName = '',
  readOnly = false,
}) {
  const { t } = useTranslation()
  const [draftName, setDraftName] = useState('')
  const [draftAmount, setDraftAmount] = useState('')
  const [draftCurrency, setDraftCurrency] = useState('USD')

  if (readOnly) {
    return (
      <QuoteAddedItemsTable
        items={items}
        onUpdateItem={onUpdateItem}
        onRemoveItem={onRemoveItem}
        tableClassName={addedItemsTableClassName}
        readOnly
      />
    )
  }

  const handleAdd = () => {
    const name = draftName.trim()
    const amt = parseQuoteAddAmount(draftAmount)
    if (!name || amt <= 0) return
    onAddItem({
      id: `add-${Date.now()}`,
      name,
      amount: String(amt),
      currency: draftCurrency,
    })
    setDraftName('')
    setDraftAmount('')
    setDraftCurrency('USD')
  }

  return (
    <div className="pricing-quote-add-item-panel">
      <QuoteAddedItemsTable
        items={items}
        onUpdateItem={onUpdateItem}
        onRemoveItem={onRemoveItem}
        tableClassName={addedItemsTableClassName}
      />
      <div className="pricing-quote-customs-add-form pricing-quote-add-item-form">
        <div className="pricing-quote-add-item-form__fields">
          <input
            type="text"
            className="pricing-quote-customs-input pricing-quote-add-item-form__name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={t('pricing.customsAddItemName', 'Item name')}
          />
          <QuoteAmountCurrencyField
            amount={draftAmount}
            currency={draftCurrency}
            onAmountChange={setDraftAmount}
            onCurrencyChange={setDraftCurrency}
          />
        </div>
        <button
          type="button"
          className="pricing-quote-customs-add-btn"
          onClick={handleAdd}
          disabled={!draftName.trim() || parseQuoteAddAmount(draftAmount) <= 0}
        >
          <Plus size={16} aria-hidden />
          {t('pricing.customsAddItem', 'Add Item')}
        </button>
      </div>
    </div>
  )
}
