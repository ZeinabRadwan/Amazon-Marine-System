import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { displayNumericInputValue } from '../utils/pricingFormNumeric'
import { QuoteSummaryCurrencyText, QuoteSummaryRow } from './quoteSummaryUi'

const CURRENCY_OPTIONS = ['USD', 'EUR', 'EGP']

function parseAmount(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/**
 * Handling fees block — single section currency, dynamic line items, total summary.
 */
export default function QuoteHandlingFeesSection({
  lines = [],
  currency = 'USD',
  onCurrencyChange,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  totalByCurrency = {},
}) {
  const { t } = useTranslation()
  const [draftName, setDraftName] = useState('')
  const [draftAmount, setDraftAmount] = useState('')

  const handleAddItem = () => {
    const name = draftName.trim()
    const amt = parseAmount(draftAmount)
    if (!name || amt <= 0) return
    onAddItem({
      id: `handling-${Date.now()}`,
      name,
      amount: String(amt),
    })
    setDraftName('')
    setDraftAmount('')
  }

  return (
    <div className="pricing-quote-handling-block space-y-4">
      <div className="pricing-quote-handling-currency-row">
        <label className="pricing-quote-handling-currency-row__label" htmlFor="quote-handling-currency">
          {t('pricing.handlingSectionCurrency', 'Currency')}
        </label>
        <select
          id="quote-handling-currency"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          className="pricing-quote-customs-input pricing-quote-customs-input--currency"
          aria-label={t('pricing.currency', 'Currency')}
        >
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="pricing-quote-customs-table-block">
        <table className="pricing-quote-customs-table pricing-quote-handling-table">
          <thead>
            <tr>
              <th>{t('pricing.item', 'Item')}</th>
              <th className="pricing-quote-customs-table__col-cost">{t('shipments.expColAmount', 'Amount')}</th>
              <th className="pricing-quote-handling-table__col-actions">{t('pricing.rowActions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((row) => (
              <tr key={row.id} className={row.isDefault ? 'pricing-quote-handling-table__row--default' : ''}>
                <td className="pricing-quote-customs-table__item">
                  <input
                    type="text"
                    className="pricing-quote-customs-input"
                    value={row.name}
                    onChange={(e) => onUpdateItem(row.id, { name: e.target.value })}
                    placeholder={t('pricing.quoteHandlingLineDefault', 'Handling Fees')}
                  />
                </td>
                <td className="pricing-quote-customs-table__col-cost">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="pricing-quote-customs-input pricing-quote-customs-input--amount tabular-nums"
                    value={displayNumericInputValue(row.amount)}
                    onChange={(e) => onUpdateItem(row.id, { amount: e.target.value })}
                    placeholder="0"
                    aria-label={t('shipments.expColAmount', 'Amount')}
                  />
                </td>
                <td className="pricing-quote-handling-table__col-actions">
                  {row.isDefault ? (
                    <span className="pricing-quote-handling-default-tag text-xs text-gray-500 dark:text-gray-400">
                      {t('pricing.handlingDefaultRowTag', 'Default')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="pricing-quote-customs-row-remove"
                      onClick={() => onRemoveItem(row.id)}
                      aria-label={t('pricing.handlingRemoveRow', 'Remove item')}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pricing-quote-customs-add-form">
        <div className="pricing-quote-customs-add-form__fields">
          <input
            type="text"
            className="pricing-quote-customs-input"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder={t('pricing.customsAddItemName', 'Item name')}
          />
          <input
            type="number"
            min="0"
            step="0.01"
            className="pricing-quote-customs-input pricing-quote-customs-input--amount tabular-nums"
            value={displayNumericInputValue(draftAmount)}
            onChange={(e) => setDraftAmount(e.target.value)}
            placeholder="0"
            aria-label={t('shipments.expColAmount', 'Amount')}
          />
        </div>
        <button
          type="button"
          className="pricing-quote-customs-add-btn"
          onClick={handleAddItem}
          disabled={!draftName.trim() || parseAmount(draftAmount) <= 0}
        >
          <Plus size={16} aria-hidden />
          {t('pricing.customsAddItem', 'Add Item')}
        </button>
      </div>

      <div className="pricing-quote-module-summary pricing-quote-module-summary--handling">
        <QuoteSummaryRow label={t('pricing.handlingSectionTotal', 'Total handling fees')}>
          <QuoteSummaryCurrencyText amounts={totalByCurrency} dash={t('common.dash', '—')} />
        </QuoteSummaryRow>
      </div>
    </div>
  )
}
