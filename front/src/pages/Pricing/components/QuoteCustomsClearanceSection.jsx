import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import { formatPricingDecimal } from '../../../utils/dateUtils'
import { displayNumericInputValue } from '../utils/pricingFormNumeric'
import { QuoteSummaryCurrencyText, QuoteSummaryRow } from './quoteSummaryUi'

const CURRENCY_OPTIONS = ['USD', 'EUR', 'EGP']

function parseAmount(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function CostAmountLabel({ amount, currency }) {
  const cur = String(currency ?? '')
    .trim()
    .toUpperCase() || 'EGP'
  const num = Number(amount)
  const displayAmount = Number.isFinite(num) ? formatPricingDecimal(num) : '0'
  return (
    <span
      className={`pricing-quote-cost-label pricing-quote-cost-label--${cur === 'EGP' ? 'egp' : cur === 'USD' ? 'usd' : cur === 'EUR' ? 'eur' : 'alt'}`}
    >
      {displayAmount} {cur}
    </span>
  )
}

/** Plain-text note sent on the quotation when customs clearance is enabled. */
export function buildCustomsOfficialReceiptsNote(t) {
  return [
    t('pricing.customsOfficialReceiptsTitle', 'Note for the client — official receipts:'),
    t(
      'pricing.customsOfficialReceiptsBodyPlain',
      'Official receipts are determined after they are received from port authorities and government agencies, and original official receipts are provided to the client. The clearance price stated does not include official receipts.'
    ),
    t(
      'pricing.customsOfficialReceiptsFootnote',
      'This note is added automatically to the quotation sent to the client'
    ),
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Customs clearance block for Create Quote — enable/remove, fixed fee row, optional extra rows, total cost.
 */
export default function QuoteCustomsClearanceSection({
  customsActive,
  onEnable,
  onRemove,
  clearanceFee,
  extraItems = [],
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  totalCostByCurrency = {},
}) {
  const { t } = useTranslation()
  const amount = Number(clearanceFee?.amount) || 0
  const currency = String(clearanceFee?.currency || 'EGP').toUpperCase()
  const fixedNote = t('pricing.customsFeeFixedNote', 'Fixed by pricing team, not editable')

  const [draftName, setDraftName] = useState('')
  const [draftAmount, setDraftAmount] = useState('')
  const [draftCurrency, setDraftCurrency] = useState('EGP')

  const handleAddItem = () => {
    const name = draftName.trim()
    const amt = parseAmount(draftAmount)
    if (!name || amt <= 0) return
    onAddItem({
      id: `customs-${Date.now()}`,
      name,
      amount: String(amt),
      currency: draftCurrency,
      notes: '',
    })
    setDraftName('')
    setDraftAmount('')
    setDraftCurrency('EGP')
  }

  return (
    <div className="pricing-quote-customs-block">
      {!customsActive ? (
        <div className="pricing-quote-customs-empty space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
            {t('pricing.customsNoneAdded', 'No customs clearance has been added to this quotation')}
          </p>
          <button type="button" className="pricing-quote-customs-enable-btn" onClick={onEnable}>
            {t('pricing.customsEnableBtn', 'Enable Customs Clearance')}
          </button>
        </div>
      ) : (
        <div className="pricing-quote-customs-active space-y-4">
          <div className="pricing-quote-customs-table-block">
            <table className="pricing-quote-customs-table">
              <thead>
                <tr>
                  <th>{t('pricing.customsColItem', 'Item')}</th>
                  <th className="pricing-quote-customs-table__col-cost">{t('pricing.customsColCost', 'Cost')}</th>
                  <th>{t('pricing.customsColNotes', 'Notes')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="pricing-quote-customs-table__row--fixed">
                  <td className="pricing-quote-customs-table__item">
                    {t('pricing.customsClearanceFeeRow', 'Customs clearance fee')}
                  </td>
                  <td className="pricing-quote-customs-table__col-cost">
                    <CostAmountLabel amount={amount} currency={currency} />
                  </td>
                  <td className="pricing-quote-customs-table__notes text-gray-600 dark:text-gray-400">
                    {fixedNote}
                  </td>
                </tr>
                {extraItems.map((row) => (
                  <tr key={row.id} className="pricing-quote-customs-table__row--extra">
                    <td className="pricing-quote-customs-table__item">
                      <input
                        type="text"
                        className="pricing-quote-customs-input"
                        value={row.name}
                        onChange={(e) => onUpdateItem(row.id, { name: e.target.value })}
                        placeholder={t('pricing.customsAddItemName', 'Item name')}
                      />
                    </td>
                    <td className="pricing-quote-customs-table__col-cost">
                      <div className="pricing-quote-customs-cost-inputs">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="pricing-quote-customs-input pricing-quote-customs-input--amount tabular-nums"
                          value={displayNumericInputValue(row.amount)}
                          onChange={(e) => onUpdateItem(row.id, { amount: e.target.value })}
                          placeholder="0"
                          aria-label={t('pricing.customsColCost', 'Cost')}
                        />
                        <select
                          value={row.currency || 'EGP'}
                          onChange={(e) => onUpdateItem(row.id, { currency: e.target.value })}
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
                    </td>
                    <td className="pricing-quote-customs-table__notes">
                      <div className="pricing-quote-customs-notes-cell">
                        <input
                          type="text"
                          className="pricing-quote-customs-input"
                          value={row.notes ?? ''}
                          onChange={(e) => onUpdateItem(row.id, { notes: e.target.value })}
                          placeholder={t('pricing.customsExtraNotePlaceholder', 'Notes (optional)')}
                        />
                        <button
                          type="button"
                          className="pricing-quote-customs-row-remove"
                          onClick={() => onRemoveItem(row.id)}
                          aria-label={t('pricing.customsRemoveRow', 'Remove item')}
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="pricing-quote-customs-info-note"
            role="note"
            aria-label={t('pricing.customsOfficialReceiptsTitle', 'Note for the client — official receipts')}
          >
            <div className="pricing-quote-customs-info-note__title">
              {t('pricing.customsOfficialReceiptsTitle', 'Note for the client — official receipts:')}
            </div>
            <div className="pricing-quote-customs-info-note__body">
              <Trans
                i18nKey="pricing.customsOfficialReceiptsBody"
                components={{ strong: <strong /> }}
                defaults="Official receipts are determined after they are received from port authorities and government agencies, and original official receipts are provided to the client. <strong>The clearance price stated does not include official receipts.</strong>"
              />
            </div>
            <div className="pricing-quote-customs-info-note__footnote">
              {t(
                'pricing.customsOfficialReceiptsFootnote',
                'This note is added automatically to the quotation sent to the client'
              )}
            </div>
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
                aria-label={t('pricing.customsColCost', 'Cost')}
              />
              <select
                value={draftCurrency}
                onChange={(e) => setDraftCurrency(e.target.value)}
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

          <div className="pricing-quote-module-summary pricing-quote-module-summary--customs">
            <QuoteSummaryRow label={t('pricing.customsSectionTotalCost', 'Total customs clearance cost')}>
              <QuoteSummaryCurrencyText amounts={totalCostByCurrency} dash={t('common.dash', '—')} />
            </QuoteSummaryRow>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline"
              onClick={onRemove}
            >
              {t('pricing.customsRemoveBtn', 'Remove Customs Clearance')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
