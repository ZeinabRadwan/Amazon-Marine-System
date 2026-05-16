import { useTranslation } from 'react-i18next'
import { formatPricingDecimal } from '../../../utils/dateUtils'
import { displayNumericInputValue } from '../utils/pricingFormNumeric'
import QuotePricingLinesTable from './QuotePricingLinesTable'
import QuoteOceanLinesSummary from './QuoteOceanLinesSummary'

function ReadOnlyField({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{label}</div>
      <div className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-sm">
        {value || '—'}
      </div>
    </div>
  )
}

function ReadOnlyAmountField({ label, amount, currency }) {
  const cur = String(currency || 'EGP').toUpperCase()
  const n = Number(amount)
  const display = Number.isFinite(n) ? formatPricingDecimal(n) : '0'
  return <ReadOnlyField label={label} value={`${display} ${cur}`} />
}

/**
 * Inland transport block for Create Quote (pricing sheet select + table, or quick manual entry).
 */
export default function QuoteInlandTransportSection({
  isQuick,
  inlandOffers,
  inlandOfferId,
  onInlandOfferIdChange,
  inlandLineRows,
  onUpdateInlandRow,
  costByCurrency,
  profitByCurrency,
  sellingByCurrency,
  quickInlandPort,
  onQuickInlandPortChange,
  quickInlandGov,
  onQuickInlandGovChange,
  quickInlandZone,
  onQuickInlandZoneChange,
  quickInlandVehicle,
  onQuickInlandVehicleChange,
  inlandCost,
  onInlandCostChange,
  inlandSelling,
  onInlandSellingChange,
  inlandCurrency,
  onInlandCurrencyChange,
  showQuickInlandGenerator,
  inlandGenCost,
  onInlandGenCostChange,
  inlandGenSelling,
  onInlandGenSellingChange,
  inlandGenCurrency,
  onInlandGenCurrencyChange,
  readOnly = false,
  inlandOfferLabel = '',
  initialOffer = null,
}) {
  const { t } = useTranslation()
  const noop = () => {}

  const hasQuickInlandAmount =
    Number(inlandSelling) > 0 || Number(inlandGenSelling) > 0

  if (isQuick && readOnly) {
    return (
      <div className="pricing-quote-inland-block space-y-4">
        <div className="pricing-quick-section space-y-3">
          <div className="text-sm font-bold text-amber-950 dark:text-amber-100">
            {t('pricing.quickInlandManualHeading', 'Manual inland entry')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ReadOnlyField label={t('pricing.port', 'Port')} value={quickInlandPort} />
            <ReadOnlyField label={t('pricing.governorate', 'Governorate')} value={quickInlandGov} />
            <ReadOnlyField label={t('pricing.inlandAreaField', 'Zone')} value={quickInlandZone} />
            <ReadOnlyField label={t('pricing.inlandVehicleTypeAria', 'Vehicle')} value={quickInlandVehicle} />
            <ReadOnlyAmountField label={t('pricing.inlandCost', 'Cost')} amount={inlandCost} currency={inlandCurrency} />
            <ReadOnlyAmountField label={t('pricing.inlandSelling', 'Selling')} amount={inlandSelling} currency={inlandCurrency} />
          </div>
          {showQuickInlandGenerator ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 mt-1 border-t border-amber-200/70 dark:border-amber-800/50">
              <div className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                {t('pricing.inlandGeneratorLine', 'Generator (inland)')}
              </div>
              <ReadOnlyAmountField
                label={t('pricing.inlandGeneratorCost', 'Generator cost')}
                amount={inlandGenCost}
                currency={inlandGenCurrency}
              />
              <ReadOnlyAmountField label={t('pricing.inlandSelling', 'Selling')} amount={inlandGenSelling} currency={inlandGenCurrency} />
            </div>
          ) : null}
        </div>
        {hasQuickInlandAmount ? (
          <QuoteOceanLinesSummary
            costByCurrency={costByCurrency}
            profitByCurrency={profitByCurrency}
            sellingByCurrency={sellingByCurrency}
            summaryClassName="pricing-quote-module-summary"
            ariaLabelKey="pricing.inlandLinesSummaryTitle"
          />
        ) : null}
      </div>
    )
  }

  if (isQuick) {
    return (
      <div className="pricing-quote-inland-block space-y-4">
        <div className="pricing-quick-section space-y-3">
          <div className="text-sm font-bold text-amber-950 dark:text-amber-100">
            {t('pricing.quickInlandManualHeading', 'Manual inland entry')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.port', 'Port')}</label>
              <input
                value={quickInlandPort}
                onChange={(e) => onQuickInlandPortChange(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                placeholder={t('pricing.inlandPortPlaceholder', 'Select port')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.governorate', 'Governorate')}</label>
              <input
                value={quickInlandGov}
                onChange={(e) => onQuickInlandGovChange(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                placeholder={t('pricing.inlandGovPlaceholder', 'Select governorate')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.inlandAreaField', 'Zone')}</label>
              <input
                value={quickInlandZone}
                onChange={(e) => onQuickInlandZoneChange(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                placeholder={t('pricing.inlandAreaPlaceholder', 'Zone')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">{t('pricing.inlandVehicleTypeAria', 'Vehicle')}</label>
              <input
                value={quickInlandVehicle}
                onChange={(e) => onQuickInlandVehicleChange(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                placeholder={t('pricing.inlandTruckRate', 'Truck')}
              />
            </div>
            <input
              type="number"
              min="0"
              step="0.01"
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              placeholder="0"
              value={displayNumericInputValue(inlandCost)}
              onChange={(e) => onInlandCostChange(e.target.value)}
              aria-label={t('pricing.inlandCost', 'Cost')}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              placeholder="0"
              value={displayNumericInputValue(inlandSelling)}
              onChange={(e) => onInlandSellingChange(e.target.value)}
              aria-label={t('pricing.inlandSelling', 'Selling')}
            />
            <select
              value={inlandCurrency}
              onChange={(e) => onInlandCurrencyChange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 md:col-span-2 max-w-xs"
              aria-label={t('pricing.currency', 'Currency')}
            >
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          {showQuickInlandGenerator ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 mt-1 border-t border-amber-200/70 dark:border-amber-800/50">
              <div className="md:col-span-2 text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                {t('pricing.inlandGeneratorLine', 'Generator (inland)')}
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                placeholder="0"
                value={displayNumericInputValue(inlandGenCost)}
                onChange={(e) => onInlandGenCostChange(e.target.value)}
                aria-label={t('pricing.inlandGeneratorCost', 'Generator cost')}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                placeholder="0"
                value={displayNumericInputValue(inlandGenSelling)}
                onChange={(e) => onInlandGenSellingChange(e.target.value)}
                aria-label={t('pricing.inlandSelling', 'Selling')}
              />
              <select
                value={inlandGenCurrency}
                onChange={(e) => onInlandGenCurrencyChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                aria-label={t('pricing.currency', 'Currency')}
              >
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          ) : null}
        </div>
        {hasQuickInlandAmount ? (
          <QuoteOceanLinesSummary
            costByCurrency={costByCurrency}
            profitByCurrency={profitByCurrency}
            sellingByCurrency={sellingByCurrency}
            summaryClassName="pricing-quote-module-summary"
            ariaLabelKey="pricing.inlandLinesSummaryTitle"
          />
        ) : null}
      </div>
    )
  }

  const hasSheet = Boolean(inlandOfferId)
  const hasLines = inlandLineRows.length > 0
  const showPricingContent = readOnly ? hasLines : hasSheet && hasLines

  return (
    <div className="pricing-quote-inland-block space-y-4">
      <div className="space-y-2">
        {readOnly ? (
          hasSheet || inlandOfferLabel ? (
            <ReadOnlyField
              label={t('pricing.inlandPriceSheet', 'Inland price sheet')}
              value={inlandOfferLabel || inlandOfferId || '—'}
            />
          ) : null
        ) : (
          <>
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {t('pricing.inlandPriceSheet', 'Inland price sheet')}
            </label>
            <select
              value={inlandOfferId}
              onChange={(e) => onInlandOfferIdChange(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <option value="">{t('pricing.quoteNoneSelected', 'None selected / لا يوجد اختيار')}</option>
              {initialOffer &&
              initialOffer.pricing_type === 'inland' &&
              !inlandOffers.some((o) => String(o.id) === String(initialOffer.id)) ? (
                <option value={initialOffer.id}>
                  {initialOffer.inland_port || '—'} → {initialOffer.destination || initialOffer.region || '—'}
                </option>
              ) : null}
              {inlandOffers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.inland_port || '—'} → {o.destination || o.region || '—'}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {showPricingContent ? (
        <>
          <div className="pricing-quote-inland-table-block">
            <QuotePricingLinesTable
              lines={inlandLineRows}
              onUpdateLine={readOnly ? noop : onUpdateInlandRow}
              readOnlyCost
              readOnlyCurrency
              readOnlyName
              readOnly={readOnly}
              variant="inland"
            />
          </div>
          {Object.values(sellingByCurrency || {}).some((v) => Math.abs(Number(v) || 0) > 1e-9) ? (
            <QuoteOceanLinesSummary
              costByCurrency={costByCurrency}
              profitByCurrency={profitByCurrency}
              sellingByCurrency={sellingByCurrency}
              summaryClassName="pricing-quote-module-summary"
              ariaLabelKey="pricing.inlandLinesSummaryTitle"
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
