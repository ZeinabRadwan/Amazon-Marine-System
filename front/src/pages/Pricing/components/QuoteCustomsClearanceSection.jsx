import { Trans, useTranslation } from 'react-i18next'
import { formatPricingDecimal } from '../../../utils/dateUtils'
import { QuoteSummaryCurrencyText, QuoteSummaryRow } from './quoteSummaryUi'
import { QuoteAddItemPanel } from './quoteAddItemsUi'

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
 * Customs clearance block for Create Quote — fixed fee table, separate added-items table, total cost.
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
  readOnly = false,
}) {
  const { t } = useTranslation()
  const amount = Number(clearanceFee?.amount) || 0
  const currency = String(clearanceFee?.currency || 'EGP').toUpperCase()
  const fixedNote = t('pricing.customsFeeFixedNote', 'Fixed by pricing team, not editable')

  return (
    <div className="pricing-quote-customs-block">
      {!customsActive ? (
        readOnly ? null : (
          <div className="pricing-quote-customs-empty space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
              {t('pricing.customsNoneAdded', 'No customs clearance has been added to this quotation')}
            </p>
            <button type="button" className="pricing-quote-customs-enable-btn" onClick={onEnable}>
              {t('pricing.customsEnableBtn', 'Enable Customs Clearance')}
            </button>
          </div>
        )
      ) : (
        <div className="pricing-quote-customs-active space-y-4">
          <div className="pricing-quote-customs-table-block pricing-quote-customs-table-block--base">
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

          <QuoteAddItemPanel
            items={extraItems}
            onAddItem={onAddItem}
            onUpdateItem={onUpdateItem}
            onRemoveItem={onRemoveItem}
            readOnly={readOnly}
          />

          <div className="pricing-quote-module-summary pricing-quote-module-summary--customs">
            <QuoteSummaryRow label={t('pricing.customsSectionTotalCost', 'Total customs clearance cost')}>
              <QuoteSummaryCurrencyText amounts={totalCostByCurrency} dash={t('common.dash', '—')} />
            </QuoteSummaryRow>
          </div>

          {!readOnly ? (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline"
                onClick={onRemove}
              >
                {t('pricing.customsRemoveBtn', 'Remove Customs Clearance')}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
