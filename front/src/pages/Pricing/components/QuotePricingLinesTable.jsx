import { HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { displayNumericInputValue } from '../utils/pricingFormNumeric'
import { formatPricingDecimal } from '../../../utils/dateUtils'

const CURRENCY_OPTIONS = ['EGP', 'USD', 'EUR']

function parseNum(v) {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function currencyCodePill(code) {
  const raw = String(code ?? '')
    .trim()
    .toUpperCase()
  const display = raw || '—'
  let variant = 'alt'
  if (display === 'EGP') variant = 'egp'
  else if (display === 'USD') variant = 'usd'
  else if (display === 'EUR') variant = 'eur'
  else if (display === '—') variant = 'muted'
  return <span className={`shipment-fin-cur-pill shipment-fin-cur-pill--${variant}`}>{display}</span>
}

function IncludeHeader({ t }) {
  const tip = t('pricing.includeInQuotationTooltip', 'Include in quotation / تضمين في عرض السعر')
  return (
    <span className="pricing-quote-line-include-head">
      <span className="sr-only">{tip}</span>
      <span
        className="pricing-quote-line-include-help"
        title={tip}
        aria-label={tip}
        role="img"
      >
        <HelpCircle size={14} aria-hidden />
      </span>
    </span>
  )
}

/**
 * @param {object} props
 * @param {Array} props.lines
 * @param {(idx: number, patch: object) => void} props.onUpdateLine
 * @param {boolean} [props.readOnlyCost]
 * @param {boolean} [props.readOnlyCurrency]
 * @param {boolean} [props.readOnlyName]
 * @param {'ocean'|'inland'} [props.variant]
 * @param {boolean} [props.allowOceanCodeEdit]
 * @param {(code: string) => string} [props.quoteCodeLabel]
 * @param {string[]} [props.quickSelectCodes]
 */
export default function QuotePricingLinesTable({
  lines,
  onUpdateLine,
  readOnlyCost = true,
  readOnlyCurrency = true,
  readOnlyName = true,
  variant = 'ocean',
  allowOceanCodeEdit = false,
  quoteCodeLabel,
  quickSelectCodes = [],
}) {
  const { t } = useTranslation()

  if (!lines?.length) return null

  return (
    <div className="shipment-fin-table-wrap pricing-quote-line-table-wrap">
      <table className="shipment-fin-line-table pricing-quote-line-table">
        <thead>
          <tr>
            <th className="pricing-quote-line-col-check">
              <IncludeHeader t={t} />
            </th>
            <th className="pricing-quote-line-col-name">{t('pricing.itemNameColumn', 'Item Name / اسم البند')}</th>
            <th className="pricing-quote-line-col-cost shipment-fin-num">{t('pricing.cost', 'Cost')}</th>
            <th className="pricing-quote-line-col-cur">{t('pricing.currency', 'Currency')}</th>
            <th className="pricing-quote-line-col-selling shipment-fin-num">
              {t('pricing.sellingPrice', 'Selling')}
            </th>
            <th className="pricing-quote-line-col-profit shipment-fin-num">{t('pricing.profit', 'Profit')}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => {
            const included = line.included !== false
            const profit = parseNum(line.selling_amount) - parseNum(line.cost_amount)
            const rowDisabled = !included

            return (
              <tr
                key={line.sourceKey || `${variant}-${idx}`}
                className={rowDisabled ? 'pricing-quote-line-row--excluded' : undefined}
              >
                <td className="pricing-quote-line-col-check">
                  <input
                    type="checkbox"
                    className="pricing-quote-line-check rounded border-gray-300 dark:border-gray-600"
                    checked={included}
                    onChange={(e) => onUpdateLine(idx, { included: e.target.checked })}
                    aria-label={t('pricing.includeInQuotationTooltip', 'Include in quotation / تضمين في عرض السعر')}
                  />
                </td>
                <td className="pricing-quote-line-col-name">
                  {readOnlyName ? (
                    <span className="pricing-quote-line-name" title={line.name}>
                      {line.name || '—'}
                    </span>
                  ) : allowOceanCodeEdit && quoteCodeLabel ? (
                    <div className="pricing-quote-line-name-edit space-y-1">
                      <select
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                        value={line.code}
                        disabled={rowDisabled}
                        onChange={(e) => {
                          const code = e.target.value
                          onUpdateLine(idx, {
                            code,
                            name: code === 'OTHER' ? line.name || '' : quoteCodeLabel(code),
                          })
                        }}
                      >
                        {quickSelectCodes.map((code) => (
                          <option key={code} value={code}>
                            {quoteCodeLabel(code)}
                          </option>
                        ))}
                        <option value="OTHER">{t('pricing.otherCharge', 'Other')}</option>
                      </select>
                      {line.code === 'OTHER' ? (
                        <input
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                          placeholder={t('pricing.itemName', 'Item name')}
                          value={line.name || ''}
                          disabled={rowDisabled}
                          onChange={(e) => onUpdateLine(idx, { name: e.target.value })}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <input
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                      value={line.name || ''}
                      disabled={rowDisabled}
                      onChange={(e) => onUpdateLine(idx, { name: e.target.value })}
                    />
                  )}
                </td>
                <td className="pricing-quote-line-col-cost shipment-fin-num">
                  <input
                    type="number"
                    readOnly={readOnlyCost || rowDisabled}
                    tabIndex={readOnlyCost || rowDisabled ? -1 : undefined}
                    disabled={rowDisabled}
                    className={`pricing-quote-line-input tabular-nums ${
                      readOnlyCost || rowDisabled
                        ? 'pricing-quote-line-input--readonly'
                        : 'pricing-quote-line-input--editable'
                    }`}
                    value={displayNumericInputValue(line.cost_amount)}
                    onChange={(e) => {
                      if (readOnlyCost || rowDisabled) return
                      onUpdateLine(idx, { cost_amount: e.target.value })
                    }}
                    placeholder="0"
                    aria-readonly={readOnlyCost || rowDisabled}
                  />
                </td>
                <td className="pricing-quote-line-col-cur">
                  {readOnlyCurrency ? (
                    currencyCodePill(line.currency)
                  ) : (
                    <select
                      value={line.currency}
                      disabled={rowDisabled}
                      onChange={(e) => onUpdateLine(idx, { currency: e.target.value })}
                      className="pricing-quote-line-cur-select"
                      aria-label={t('pricing.currency', 'Currency')}
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="pricing-quote-line-col-selling shipment-fin-num">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={rowDisabled}
                    className="pricing-quote-line-input pricing-quote-line-input--editable tabular-nums disabled:opacity-50"
                    value={displayNumericInputValue(line.selling_amount)}
                    onChange={(e) => onUpdateLine(idx, { selling_amount: e.target.value })}
                    placeholder="0"
                  />
                </td>
                <td
                  className={`pricing-quote-line-col-profit shipment-fin-num pricing-quote-line-profit ${
                    profit >= 0 ? 'is-positive' : 'is-negative'
                  }`}
                >
                  {formatPricingDecimal(profit)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
