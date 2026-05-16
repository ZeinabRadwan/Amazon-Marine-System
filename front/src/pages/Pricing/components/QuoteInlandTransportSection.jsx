import { useTranslation } from 'react-i18next'
import { displayNumericInputValue } from '../utils/pricingFormNumeric'
import QuotePricingLinesTable from './QuotePricingLinesTable'
import QuoteOceanLinesSummary from './QuoteOceanLinesSummary'

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
}) {
  const { t } = useTranslation()

  const hasQuickInlandAmount =
    Number(inlandSelling) > 0 || Number(inlandGenSelling) > 0

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
  const showPricingContent = hasSheet && hasLines

  return (
    <div className="pricing-quote-inland-block space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
          {t('pricing.inlandPriceSheet', 'Inland price sheet')}
        </label>
        <select
          value={inlandOfferId}
          onChange={(e) => onInlandOfferIdChange(e.target.value)}
          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        >
          <option value="">{t('pricing.selectInlandOffer', 'Select an inland price sheet…')}</option>
          {inlandOffers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.inland_port || '—'} → {o.destination || o.region || '—'}
            </option>
          ))}
        </select>
      </div>

      {showPricingContent ? (
        <>
          <div className="pricing-quote-inland-table-block">
            <QuotePricingLinesTable
              lines={inlandLineRows}
              onUpdateLine={onUpdateInlandRow}
              readOnlyCost
              readOnlyCurrency
              readOnlyName
              variant="inland"
            />
          </div>
          <QuoteOceanLinesSummary
            costByCurrency={costByCurrency}
            profitByCurrency={profitByCurrency}
            sellingByCurrency={sellingByCurrency}
            summaryClassName="pricing-quote-module-summary"
            ariaLabelKey="pricing.inlandLinesSummaryTitle"
          />
        </>
      ) : null}
    </div>
  )
}
