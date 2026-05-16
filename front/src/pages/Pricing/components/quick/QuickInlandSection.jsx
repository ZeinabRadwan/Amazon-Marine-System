import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PortNameAsyncSelect from '../PortNameAsyncSelect'
import QuotePricingLinesTable from '../QuotePricingLinesTable'
import QuoteOceanLinesSummary from '../QuoteOceanLinesSummary'
import { createQuickInlandStarterRows, isQuickReeferContainer, QUICK_INLAND_VEHICLE_OPTIONS } from '../../utils/quickQuoteConstants'

function parseNum(v) {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Quick quotation inland block: collapsed empty state → manual entry with structured table.
 */
export default function QuickInlandSection({
  open,
  onOpen,
  onClose,
  port,
  onPortChange,
  governorate,
  onGovernorateChange,
  zone,
  onZoneChange,
  vehicle,
  onVehicleChange,
  containerType,
  lines,
  onUpdateLine,
  onAddLine,
  costByCurrency,
  profitByCurrency,
  sellingByCurrency,
}) {
  const { t } = useTranslation()
  const [extraDraft, setExtraDraft] = useState({
    name: '',
    cost: '',
    selling: '',
    currency: 'EGP',
  })

  const showGenerator = isQuickReeferContainer(containerType) || String(vehicle || '').toLowerCase().includes('reefer')

  const hasLineData = useMemo(
    () => lines.some((row) => row.included !== false && parseNum(row.selling_amount) > 0),
    [lines]
  )

  const handleOpen = () => {
    onOpen(
      createQuickInlandStarterRows(t, {
        includeGenerator: showGenerator,
      })
    )
  }

  const handleAddExtra = () => {
    const name = extraDraft.name.trim()
    if (!name) return
    onAddLine({
      sourceKey: `inland-extra-${Date.now()}`,
      code: 'INLAND',
      name,
      description: '',
      cost_amount: extraDraft.cost,
      selling_amount: extraDraft.selling,
      currency: extraDraft.currency || 'EGP',
      included: true,
      quickCore: false,
    })
    setExtraDraft({ name: '', cost: '', selling: '', currency: 'EGP' })
  }

  if (!open) {
    return (
      <div className="pricing-quick-inland-empty">
        <p className="pricing-quick-inland-empty__text m-0">
          {t('pricing.quickInlandNotAdded', 'No inland transport added to this quotation')}
        </p>
        <button type="button" className="pricing-quick-inland-empty__btn" onClick={handleOpen}>
          {t('pricing.quickInlandManualEntry', 'Manual entry')}
        </button>
      </div>
    )
  }

  return (
    <div className="pricing-quick-inland-manual space-y-4">
      <div className="pricing-quick-section space-y-3">
        <div className="text-sm font-bold text-amber-950 dark:text-amber-100">
          {t('pricing.quickInlandManualHeading', 'Manual inland entry')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {t('pricing.quickInlandPortLabel', 'الميناء / Port')}
            </label>
            <PortNameAsyncSelect value={port} onChange={onPortChange} placeholder={t('pricing.port', 'Port')} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {t('pricing.quickInlandGovLabel', 'المحافظة / Governorate')}
            </label>
            <input
              value={governorate}
              onChange={(e) => onGovernorateChange(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {t('pricing.quickInlandZoneLabel', 'المنطقة / Zone (optional)')}
            </label>
            <input
              value={zone}
              onChange={(e) => onZoneChange(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {t('pricing.quickInlandVehicleLabel', 'نوع العربية / Vehicle')}
            </label>
            <select
              value={vehicle}
              onChange={(e) => onVehicleChange(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <option value="">{t('common.select', 'Select')}</option>
              {QUICK_INLAND_VEHICLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {lines.length > 0 ? (
        <>
          <QuotePricingLinesTable
            lines={lines}
            onUpdateLine={onUpdateLine}
            readOnlyCost={false}
            readOnlyCurrency={false}
            readOnlyName={false}
            separateCurrencyColumn
            variant="inland"
          />
          {hasLineData ? (
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

      <div className="pricing-quick-ocean-extras">
        <div className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200 mb-2">
          {t('pricing.quickAddAdditionalItem', 'Add Additional Item')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {t('pricing.itemName', 'Item name')}
            </label>
            <input
              value={extraDraft.name}
              onChange={(e) => setExtraDraft((d) => ({ ...d, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {t('pricing.costColumn', 'Cost')}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={extraDraft.cost}
              onChange={(e) => setExtraDraft((d) => ({ ...d, cost: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {t('pricing.salePriceColumn', 'Selling')}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={extraDraft.selling}
              onChange={(e) => setExtraDraft((d) => ({ ...d, selling: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {t('pricing.currency', 'Currency')}
            </label>
            <select
              value={extraDraft.currency}
              onChange={(e) => setExtraDraft((d) => ({ ...d, currency: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            >
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <button type="button" className="pricing-quote-section-empty__action md:col-span-5 md:w-auto" onClick={handleAddExtra}>
            {t('common.add', 'Add')}
          </button>
        </div>
      </div>

      <button type="button" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400" onClick={onClose}>
        {t('common.cancel', 'Cancel')}
      </button>
    </div>
  )
}
