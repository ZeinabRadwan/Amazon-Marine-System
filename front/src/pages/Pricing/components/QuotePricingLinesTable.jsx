import { HelpCircle } from 'lucide-react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { displayNumericInputValue } from '../utils/pricingFormNumeric'
import { formatPricingDecimal } from '../../../utils/dateUtils'

const CURRENCY_OPTIONS = ['EGP', 'USD', 'EUR']

/** Column order must match <thead> / <tbody> cell order */
const TABLE_COLUMNS = [
  { id: 'check', className: 'pricing-quote-line-col-check' },
  { id: 'name', className: 'pricing-quote-line-col-name' },
  { id: 'cost', className: 'pricing-quote-line-col-cost shipment-fin-num' },
  { id: 'selling', className: 'pricing-quote-line-col-selling shipment-fin-num' },
  { id: 'profit', className: 'pricing-quote-line-col-profit shipment-fin-num' },
]

const OCEAN_COLUMN_FLOOR_PX = {
  check: 52,
  name: 140,
  cost: 96,
  selling: 96,
  profit: 80,
}

function parseNum(v) {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function currencyVariant(code) {
  const raw = String(code ?? '')
    .trim()
    .toUpperCase()
  if (raw === 'EGP') return 'egp'
  if (raw === 'USD') return 'usd'
  if (raw === 'EUR') return 'eur'
  if (!raw || raw === '—') return 'muted'
  return 'alt'
}

function CostAmountLabel({ amount, currency }) {
  const cur = String(currency ?? '')
    .trim()
    .toUpperCase() || '—'
  const variant = currencyVariant(cur)
  const num = parseNum(amount)
  const displayAmount = num !== 0 || String(amount ?? '').trim() !== '' ? formatPricingDecimal(num) : '0'
  return (
    <span className={`pricing-quote-cost-label pricing-quote-cost-label--${variant}`}>
      {displayAmount} {cur}
    </span>
  )
}

function IncludeHeader({ t }) {
  const label = t('pricing.visibleColumn', 'Visible')
  const tip = t('pricing.includeInQuotationTooltip', 'Include in quotation')
  return (
    <span className="pricing-quote-line-visible-head">
      <span className="pricing-quote-line-visible-head__label">{label}</span>
      <span className="pricing-quote-line-include-help" title={tip} aria-label={tip} role="img">
        <HelpCircle size={13} aria-hidden />
      </span>
    </span>
  )
}

function measureTableColumns(table, { useCompactLayout }) {
  if (!table) return null

  const prevLayout = table.style.tableLayout
  table.style.tableLayout = 'auto'

  const measured = {}
  TABLE_COLUMNS.forEach((col, index) => {
    let maxW = 0
    table.querySelectorAll(`thead th:nth-child(${index + 1}), tbody td:nth-child(${index + 1})`).forEach((cell) => {
      maxW = Math.max(maxW, Math.ceil(cell.getBoundingClientRect().width))
    })
    const floor = useCompactLayout ? OCEAN_COLUMN_FLOOR_PX[col.id] ?? 48 : 48
    measured[col.id] = Math.max(floor, maxW)
  })

  if (useCompactLayout) {
    const tableW = Math.ceil(table.getBoundingClientRect().width)
    const others =
      (measured.check || 0) + (measured.cost || 0) + (measured.selling || 0) + (measured.profit || 0)
    const nameSpace = tableW - others - 8
    measured.name = Math.max(OCEAN_COLUMN_FLOOR_PX.name, nameSpace)
  }

  table.style.tableLayout = prevLayout
  return measured
}

function useMeasuredColumnWidths(tableRef, measureKey, useCompactLayout) {
  const [columnWidths, setColumnWidths] = useState(null)

  const measure = useCallback(() => {
    const table = tableRef.current
    if (!table) return
    setColumnWidths(measureTableColumns(table, { useCompactLayout }))
  }, [tableRef, useCompactLayout])

  useLayoutEffect(() => {
    measure()
    const table = tableRef.current
    if (!table) return undefined

    const ro = new ResizeObserver(() => measure())
    ro.observe(table)
    const wrap = table.closest('.pricing-quote-line-table-wrap')
    if (wrap && wrap !== table) ro.observe(wrap)

    return () => ro.disconnect()
  }, [measure, measureKey])

  return columnWidths
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
 * @param {boolean} [props.readOnly] — disable all inputs (quote details view)
 */
export default function QuotePricingLinesTable({
  lines,
  onUpdateLine,
  readOnlyCost = true,
  readOnlyCurrency = true,
  readOnlyName = true,
  readOnly = false,
  variant = 'ocean',
  allowOceanCodeEdit = false,
  quoteCodeLabel,
  quickSelectCodes = [],
}) {
  const { t } = useTranslation()
  const tableRef = useRef(null)
  const isOcean = variant === 'ocean'
  const isInland = variant === 'inland'
  const useCompactLayout = isOcean || isInland
  const readOnlySelling = readOnly
  const readOnlyCheck = readOnly
  const variantClass = isOcean ? 'ocean' : isInland ? 'inland' : ''
  const measureKey = `${variant}-${lines.length}-${lines.map((l) => `${l.name}|${l.cost_amount}|${l.selling_amount}|${l.currency}|${l.included}`).join(';')}`

  const columnWidths = useMeasuredColumnWidths(tableRef, measureKey, useCompactLayout)

  if (!lines?.length) return null

  return (
    <div
      className={`shipment-fin-table-wrap pricing-quote-line-table-wrap${variantClass ? ` pricing-quote-line-table-wrap--${variantClass}` : ''}`}
    >
      <table
        ref={tableRef}
        className={`shipment-fin-line-table pricing-quote-line-table${variantClass ? ` pricing-quote-line-table--${variantClass}` : ''}`}
      >
        {columnWidths ? (
          <colgroup>
            {TABLE_COLUMNS.map((col) => (
              <col key={col.id} style={{ width: `${columnWidths[col.id]}px` }} />
            ))}
          </colgroup>
        ) : null}
        <thead>
          <tr>
            {TABLE_COLUMNS.map((col) => {
              const labels = {
                check: null,
                name: t('pricing.itemNameColumn', 'Item Name'),
                cost: t('pricing.costColumn', 'Cost'),
                selling: t('pricing.salePriceColumn', 'Sale Price'),
                profit: t('pricing.profit', 'Profit'),
              }
              const widthPx = columnWidths?.[col.id]
              return (
                <th
                  key={col.id}
                  className={col.className}
                  data-col={col.id}
                  data-col-width-px={widthPx != null ? String(widthPx) : undefined}
                >
                  {col.id === 'check' ? <IncludeHeader t={t} /> : labels[col.id]}
                </th>
              )
            })}
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
                <td className="pricing-quote-line-col-check" data-col="check">
                  <input
                    type="checkbox"
                    className="pricing-quote-line-check"
                    checked={included}
                    disabled={readOnlyCheck}
                    readOnly={readOnlyCheck}
                    onChange={(e) => {
                      if (readOnlyCheck) return
                      onUpdateLine(idx, { included: e.target.checked })
                    }}
                    aria-label={t('pricing.includeInQuotationTooltip', 'Include in quotation')}
                  />
                </td>
                <td className="pricing-quote-line-col-name" data-col="name">
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
                <td className="pricing-quote-line-col-cost shipment-fin-num" data-col="cost">
                  {readOnlyCost && readOnlyCurrency ? (
                    <CostAmountLabel amount={line.cost_amount} currency={line.currency} />
                  ) : (
                    <div className="pricing-quote-line-cost-cell">
                      {readOnlyCost ? (
                        <CostAmountLabel amount={line.cost_amount} currency={line.currency} />
                      ) : (
                        <input
                          type="number"
                          readOnly={rowDisabled}
                          tabIndex={rowDisabled ? -1 : undefined}
                          disabled={rowDisabled}
                          className="pricing-quote-line-input pricing-quote-line-input--editable tabular-nums pricing-quote-line-cost-input"
                          value={displayNumericInputValue(line.cost_amount)}
                          onChange={(e) => {
                            if (rowDisabled) return
                            onUpdateLine(idx, { cost_amount: e.target.value })
                          }}
                          placeholder="0"
                        />
                      )}
                      {!readOnlyCurrency ? (
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
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="pricing-quote-line-col-selling shipment-fin-num" data-col="selling">
                  {readOnlySelling ? (
                    <CostAmountLabel amount={line.selling_amount} currency={line.currency} />
                  ) : (
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
                  )}
                </td>
                <td
                  className={`pricing-quote-line-col-profit shipment-fin-num pricing-quote-line-profit ${
                    profit >= 0 ? 'is-positive' : 'is-negative'
                  }`}
                  data-col="profit"
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
