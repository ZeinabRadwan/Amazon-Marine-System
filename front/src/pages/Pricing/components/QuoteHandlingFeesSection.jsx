import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { formatPricingDecimal } from '../../../utils/dateUtils'
import { displayNumericInputValue } from '../utils/pricingFormNumeric'
import { QuoteSummaryCurrencyText, QuoteSummaryRow } from './quoteSummaryUi'
import {
  QuoteAmountCurrencyField,
  QUOTE_ADD_CURRENCY_OPTIONS,
  parseQuoteAddAmount,
} from './quoteAddItemsUi'

/**
 * Handling fees — single table for default + added rows; per-row currency.
 */
export default function QuoteHandlingFeesSection({
  lines = [],
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  totalByCurrency = {},
  readOnly = false,
}) {
  const { t } = useTranslation()
  const [draftName, setDraftName] = useState('')
  const [draftAmount, setDraftAmount] = useState('')
  const [draftCurrency, setDraftCurrency] = useState('USD')

  const formatAmountCurrency = (amount, currency) => {
    const cur = String(currency || 'USD').toUpperCase()
    const n = Number(amount)
    const display = Number.isFinite(n) ? formatPricingDecimal(n) : '0'
    return `${display} ${cur}`
  }

  const handleAdd = () => {
    const name = draftName.trim()
    const amt = parseQuoteAddAmount(draftAmount)
    if (!name || amt <= 0) return
    onAddItem({
      id: `handling-${Date.now()}`,
      name,
      amount: String(amt),
      currency: draftCurrency,
    })
    setDraftName('')
    setDraftAmount('')
    setDraftCurrency('USD')
  }

  return (
    <div className="pricing-quote-handling-block space-y-4">
      <div className="pricing-quote-customs-table-block pricing-quote-handling-table-block">
        <table className="pricing-quote-customs-table pricing-quote-handling-table">
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
            {lines.map((row) => (
              <tr
                key={row.id}
                className={row.isDefault ? 'pricing-quote-handling-table__row--default' : undefined}
              >
                <td className="pricing-quote-customs-table__item">
                  {readOnly ? (
                    <span className="pricing-quote-line-name">
                      {row.name || t('pricing.quoteHandlingLineDefault', 'Handling Fees')}
                    </span>
                  ) : (
                    <input
                      type="text"
                      className="pricing-quote-customs-input"
                      value={row.name}
                      onChange={(e) => onUpdateItem(row.id, { name: e.target.value })}
                      placeholder={t('pricing.quoteHandlingLineDefault', 'Handling Fees')}
                    />
                  )}
                </td>
                <td className="pricing-quote-customs-table__col-amount">
                  {readOnly ? (
                    <span className="tabular-nums">{formatAmountCurrency(row.amount, row.currency)}</span>
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
                    <span className="pricing-quote-customs-currency-readonly">
                      {String(row.currency || 'USD').toUpperCase()}
                    </span>
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
                    {row.isDefault ? null : (
                      <button
                        type="button"
                        className="pricing-quote-customs-row-remove"
                        onClick={() => onRemoveItem(row.id)}
                        aria-label={t('pricing.customsRemoveRow', 'Remove item')}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
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
      ) : null}

      <div className="pricing-quote-module-summary pricing-quote-module-summary--handling">
        <QuoteSummaryRow label={t('pricing.handlingSectionTotal', 'Total handling fees')}>
          <QuoteSummaryCurrencyText amounts={totalByCurrency} dash={t('common.dash', '—')} />
        </QuoteSummaryRow>
      </div>
    </div>
  )
}
