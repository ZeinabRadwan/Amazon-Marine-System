import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import AsyncSelect from '../../../../components/AsyncSelect'
import DatePicker from '../../../../components/DatePicker'
import { formatDate, UI_DATE_FORMAT } from '../../../../utils/dateUtils'
import PortNameAsyncSelect from '../PortNameAsyncSelect'
import ShippingLineNameAsyncSelect from '../ShippingLineNameAsyncSelect'
import QuoteFinCard from '../quoteFinCard'
import QuotePricingLinesTable from '../QuotePricingLinesTable'
import QuoteOceanLinesSummary from '../QuoteOceanLinesSummary'
import QuoteReeferDeferredFootnote from '../QuoteReeferDeferredFootnote'
import QuoteCustomsClearanceSection from '../QuoteCustomsClearanceSection'
import QuoteHandlingFeesSection from '../QuoteHandlingFeesSection'
import {
  QuoteGrandSummaryPanel,
  QuoteSummaryCurrencyText,
  QuoteSummaryRow,
} from '../quoteSummaryUi'
import { User, MapPin, Ship, Truck, Package, DollarSign } from 'lucide-react'
import QuickInlandSection from './QuickInlandSection'
import { QUICK_CONTAINER_OPTIONS } from '../../utils/quickQuoteConstants'

function parseNum(v) {
  const n = parseFloat(String(v ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function formatIsoDateDisplay(iso, locale) {
  if (!iso || typeof iso !== 'string') return ''
  const s = iso.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return iso
  const [y, m, d] = s.split('-').map(Number)
  return formatDate(new Date(y, m - 1, d), { locale })
}

/**
 * Fully manual quick quotation builder (independent from CRM price sheets).
 */
export default function QuickQuoteForm({
  form,
  setField,
  quickSailingDates = [],
  onQuickSailingDatesChange,
  oceanLines,
  updateOceanLine,
  onAddOceanLine,
  oceanCostByCurrency,
  pricingLinesProfitByCurrency,
  oceanSellingByCurrency,
  hasOceanLineData,
  inlandManualOpen,
  onInlandManualOpen,
  onInlandManualClose,
  quickInlandPort,
  onQuickInlandPortChange,
  quickInlandGov,
  onQuickInlandGovChange,
  quickInlandZone,
  onQuickInlandZoneChange,
  quickInlandVehicle,
  onQuickInlandVehicleChange,
  inlandLineRows,
  updateInlandRow,
  onAddInlandLine,
  inlandSectionCostByCurrency,
  inlandSectionProfitByCurrency,
  inlandSectionSellingByCurrency,
  hasInlandLineData,
  clientAsync,
  setClientAsync,
  loadClientOptions,
  onShowAddClient,
  customsEnabled,
  onEnableCustoms,
  onRemoveCustoms,
  customsClearanceFee,
  customsExtraItems,
  onAddCustomsItem,
  onUpdateCustomsItem,
  onRemoveCustomsItem,
  customsSellingByCurrency,
  officialReceiptsNoteEnabled,
  handlingLines,
  onAddHandlingItem,
  onUpdateHandlingLine,
  onRemoveHandlingItem,
  handlingSellingByCurrency,
  hasAnySectionPricing,
  hasCustomsPricing,
  quoteProfitByCurrency,
  grandSellingByCurrency,
  showReeferDeferredPowerFootnote = false,
  reeferPowerPerDay = null,
  reeferFreePowerDays = null,
  showRouteSummary = false,
}) {
  const { t, i18n } = useTranslation()
  const [draftSailingDate, setDraftSailingDate] = useState('')

  const canAddDraftSailingDate = useMemo(() => {
    const d = String(draftSailingDate || '').trim()
    return Boolean(d) && !quickSailingDates.includes(d)
  }, [draftSailingDate, quickSailingDates])

  const addDraftSailingDate = useCallback(() => {
    const d = String(draftSailingDate || '').trim()
    if (!d || quickSailingDates.includes(d)) return
    onQuickSailingDatesChange?.([...quickSailingDates, d].sort())
    setDraftSailingDate('')
  }, [draftSailingDate, quickSailingDates, onQuickSailingDatesChange])

  const removeSailingDate = useCallback(
    (dateStr) => {
      onQuickSailingDatesChange?.(quickSailingDates.filter((d) => d !== dateStr))
    },
    [quickSailingDates, onQuickSailingDatesChange]
  )
  const [oceanExtraDraft, setOceanExtraDraft] = useState({
    name: '',
    cost: '',
    selling: '',
    currency: 'USD',
  })

  const oceanHasTable = oceanLines.length > 0

  const handleAddOceanExtra = () => {
    const name = oceanExtraDraft.name.trim()
    if (!name) return
    onAddOceanLine({
      sourceKey: `ocean-extra-${Date.now()}`,
      code: 'OTHER',
      name,
      description: '',
      cost_amount: oceanExtraDraft.cost,
      selling_amount: oceanExtraDraft.selling,
      currency: oceanExtraDraft.currency || 'USD',
      included: true,
      quickCore: false,
    })
    setOceanExtraDraft({ name: '', cost: '', selling: '', currency: 'USD' })
  }

  const extraProfitPreview = useMemo(() => {
    const sell = parseNum(oceanExtraDraft.selling)
    const cost = parseNum(oceanExtraDraft.cost)
    return sell - cost
  }, [oceanExtraDraft.selling, oceanExtraDraft.cost])

  return (
    <div className="quick-quote-form space-y-6">
      <div className="pricing-quick-banner" role="status">
        <strong>{t('pricing.quickQuotation', 'Quick Quotation')}:</strong>{' '}
        {t(
          'pricing.quickQuotationBanner',
          'Rates are not linked to a CRM price sheet — enter all figures manually. This quotation is stored as a Quick Quotation only.'
        )}
      </div>

      <QuoteFinCard icon={User} title={t('pricing.quoteSectionClient', 'بيانات العميل / Client Info')}>
        <div className="pricing-quote-client-block">
          <div className="pricing-quote-client-search-line">
            <span className="pricing-quote-inline-item__label">{t('pricing.client', 'Client')}</span>
            <span className="pricing-quote-inline-item__sep" aria-hidden>
              :
            </span>
            <div className="pricing-quote-client-row">
              <AsyncSelect
                loadOptions={loadClientOptions}
                value={clientAsync}
                onChange={(opt) => setClientAsync(opt || null)}
                placeholder={t('pricing.searchClient', 'Search client...')}
                isClearable
                className="pricing-quote-async-select"
              />
              <button
                type="button"
                className="pricing-quote-add-client-btn"
                onClick={onShowAddClient}
                aria-label={t('pricing.addClient', 'إضافة عميل / Add Client')}
                title={t('pricing.addClient', 'إضافة عميل / Add Client')}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </QuoteFinCard>

      {showRouteSummary ? (
      <QuoteFinCard icon={MapPin} title={t('pricing.quickRouteSectionTitle', 'ملخص المسار / Route summary — إدخال يدوي')}>
        <div className="pricing-quick-section space-y-3">
          <div className="pricing-quick-section-label">
            {t('pricing.quickRouteManualHint', '⚡ أدخل بيانات المسار يدوياً:')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {t('pricing.quickPolLabel', 'ميناء التحميل / POL')}
              </label>
              <PortNameAsyncSelect value={form.pol} onChange={(v) => setField('pol', v)} placeholder={t('pricing.pol', 'POL')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {t('pricing.quickPodLabel', 'POD / POD')}
              </label>
              <PortNameAsyncSelect value={form.pod} onChange={(v) => setField('pod', v)} placeholder={t('pricing.podShort', 'POD')} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {t('pricing.quickLineLabel', 'الخط الملاحي / Line')}
              </label>
              <ShippingLineNameAsyncSelect
                serviceScope="ocean"
                value={form.shipping_line}
                onChange={(v) => setField('shipping_line', v)}
                preloadOnMount
                placeholder={t('pricing.filterAllShippingLines', 'All shipping lines')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {t('pricing.quickContainerLabel', 'نوع الحاوية / Container')}
              </label>
              <select
                id="container-type"
                value={form.container_type}
                onChange={(e) => setField('container_type', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                {QUICK_CONTAINER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {t('pricing.transitTimeLabel', 'Transit Time')}
              </label>
              <input
                value={form.transit_time}
                onChange={(e) => setField('transit_time', e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                placeholder="0"
              />
            </div>
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                {t('pricing.quickSailingDateLabel', 'تاريخ الإبحار / Sailing date')}
              </label>
              <div className="pricing-quick-sailing-dates">
                <div className="pricing-quick-sailing-dates__picker">
                  <DatePicker
                    id="quick-quote-sailing-draft"
                    className="pricing-quick-sailing-dates__input"
                    value={draftSailingDate}
                    onChange={setDraftSailingDate}
                    locale={i18n.language}
                    placeholder={UI_DATE_FORMAT}
                  />
                  <button
                    type="button"
                    className="pricing-quick-sailing-dates__add"
                    disabled={!canAddDraftSailingDate}
                    title={
                      draftSailingDate && quickSailingDates.includes(String(draftSailingDate).trim())
                        ? t('pricing.sailingDateAlreadyAdded', 'This date is already listed')
                        : undefined
                    }
                    onClick={addDraftSailingDate}
                  >
                    {t('pricing.quickAddSailingDate', 'Add date')}
                  </button>
                </div>
                {quickSailingDates.length > 0 ? (
                  <div className="pricing-quick-sailing-dates__list">
                    <span className="pricing-quick-sailing-dates__list-label">
                      {t('pricing.seaSelectedSailingDatesTitle', 'Selected sailing dates / التواريخ المحددة')}
                    </span>
                    <div className="sea-rate-tags sea-rate-tags--in-block">
                      {quickSailingDates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          className="sea-rate-tag sea-rate-tag-blue"
                          onClick={() => removeSailingDate(d)}
                          aria-label={t('pricing.removeFixedDateAria', 'Remove {{date}}', {
                            date: formatIsoDateDisplay(d, i18n.language),
                          })}
                        >
                          {formatIsoDateDisplay(d, i18n.language)} ×
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </QuoteFinCard>
      ) : null}

      <QuoteFinCard icon={Ship} title={t('pricing.quoteSectionOcean', 'القسم 1: الشحن البحري / Ocean freight')}>
        <div className="pricing-quick-ocean-hint text-[11px] font-semibold text-amber-900/90 dark:text-amber-100/95 rounded-lg px-3 py-2 border border-amber-200/90 dark:border-amber-800/60 bg-amber-50/95 dark:bg-amber-950/40 mb-4">
          {t('pricing.quickOceanTableHint', '⚡ أدخل التكلفة والسعر للعميل يدوياً لكل بند')}
        </div>

        {oceanHasTable ? (
          <>
            <QuotePricingLinesTable
              lines={oceanLines}
              onUpdateLine={updateOceanLine}
              readOnlyCost={false}
              readOnlyCurrency={false}
              readOnlyName={false}
              fixedItemNames
              separateCurrencyColumn
              variant="ocean"
            />
            {hasOceanLineData ? (
              <QuoteOceanLinesSummary
                costByCurrency={oceanCostByCurrency}
                profitByCurrency={pricingLinesProfitByCurrency}
                sellingByCurrency={oceanSellingByCurrency}
                footer={
                  showReeferDeferredPowerFootnote ? (
                    <QuoteReeferDeferredFootnote
                      powerPerDay={reeferPowerPerDay}
                      freePowerDays={reeferFreePowerDays}
                    />
                  ) : null
                }
              />
            ) : showReeferDeferredPowerFootnote ? (
              <QuoteReeferDeferredFootnote
                powerPerDay={reeferPowerPerDay}
                freePowerDays={reeferFreePowerDays}
              />
            ) : null}
          </>
        ) : null}

        <div className="pricing-quick-ocean-extras mt-4">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200 mb-2">
            {t('pricing.quickAddAdditionalItem', 'Add Additional Item')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t('pricing.itemName', 'Item name')}
              </label>
              <input
                value={oceanExtraDraft.name}
                onChange={(e) => setOceanExtraDraft((d) => ({ ...d, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
                placeholder={t('pricing.quickOceanExtraPlaceholder', 'e.g. BAF, EBS...')}
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
                value={oceanExtraDraft.cost}
                onChange={(e) => setOceanExtraDraft((d) => ({ ...d, cost: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm pricing-quote-line-input--editable"
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
                value={oceanExtraDraft.selling}
                onChange={(e) => setOceanExtraDraft((d) => ({ ...d, selling: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm pricing-quote-line-input--editable"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t('pricing.currency', 'Currency')}
              </label>
              <select
                value={oceanExtraDraft.currency}
                onChange={(e) => setOceanExtraDraft((d) => ({ ...d, currency: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="USD">USD</option>
                <option value="EGP">EGP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <button
              type="button"
              className="pricing-quote-section-empty__action md:col-span-5 md:w-auto"
              onClick={handleAddOceanExtra}
            >
              {t('common.add', 'Add')}
            </button>
          </div>
          {oceanExtraDraft.name || oceanExtraDraft.selling || oceanExtraDraft.cost ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2 mb-0">
              {t('pricing.profit', 'Profit')}: {extraProfitPreview}
            </p>
          ) : null}
        </div>
      </QuoteFinCard>

      <QuoteFinCard icon={Truck} title={t('pricing.quoteSectionInland', 'القسم 2: النقل الداخلي / Section 2: Inland transport')}>
        <QuickInlandSection
          open={inlandManualOpen}
          onOpen={(starterRows) => {
            onInlandManualOpen(starterRows)
          }}
          onClose={onInlandManualClose}
          port={quickInlandPort}
          onPortChange={onQuickInlandPortChange}
          governorate={quickInlandGov}
          onGovernorateChange={onQuickInlandGovChange}
          zone={quickInlandZone}
          onZoneChange={onQuickInlandZoneChange}
          vehicle={quickInlandVehicle}
          onVehicleChange={onQuickInlandVehicleChange}
          containerType={form.container_type}
          lines={inlandLineRows}
          onUpdateLine={updateInlandRow}
          onAddLine={onAddInlandLine}
          costByCurrency={inlandSectionCostByCurrency}
          profitByCurrency={inlandSectionProfitByCurrency}
          sellingByCurrency={inlandSectionSellingByCurrency}
        />
      </QuoteFinCard>

      <QuoteFinCard icon={Package} title={t('pricing.quoteSectionCustoms', 'Section 3: Customs clearance')}>
        <QuoteCustomsClearanceSection
          customsActive={customsEnabled}
          onEnable={onEnableCustoms}
          onRemove={onRemoveCustoms}
          clearanceFee={customsClearanceFee}
          extraItems={customsExtraItems}
          onAddItem={onAddCustomsItem}
          onUpdateItem={onUpdateCustomsItem}
          onRemoveItem={onRemoveCustomsItem}
          totalCostByCurrency={customsSellingByCurrency}
          officialReceiptsNoteEnabled={officialReceiptsNoteEnabled}
        />
      </QuoteFinCard>

      <QuoteFinCard icon={DollarSign} title={t('pricing.quoteSectionHandling', 'Section 4: Handling fees')}>
        <QuoteHandlingFeesSection
          lines={handlingLines}
          onAddItem={onAddHandlingItem}
          onUpdateItem={onUpdateHandlingLine}
          onRemoveItem={onRemoveHandlingItem}
          totalByCurrency={handlingSellingByCurrency}
        />
      </QuoteFinCard>

      {hasAnySectionPricing ? (
        <QuoteGrandSummaryPanel title={t('pricing.quoteSectionSummary', 'Summary')}>
          {hasOceanLineData ? (
            <QuoteSummaryRow label={t('pricing.summaryOcean', 'Ocean freight total')}>
              <QuoteSummaryCurrencyText amounts={oceanSellingByCurrency} dash={t('common.dash', '—')} />
            </QuoteSummaryRow>
          ) : null}
          {hasInlandLineData ? (
            <QuoteSummaryRow label={t('pricing.summaryInland', 'Inland transport total')}>
              <QuoteSummaryCurrencyText amounts={inlandSectionSellingByCurrency} dash={t('common.dash', '—')} />
            </QuoteSummaryRow>
          ) : null}
          {hasCustomsPricing ? (
            <QuoteSummaryRow label={t('pricing.summaryCustoms', 'Customs total')}>
              <QuoteSummaryCurrencyText amounts={customsSellingByCurrency} dash={t('common.dash', '—')} />
            </QuoteSummaryRow>
          ) : null}
          <QuoteSummaryRow label={t('pricing.summaryHandling', 'Handling fees')}>
            <QuoteSummaryCurrencyText amounts={handlingSellingByCurrency} dash={t('common.dash', '—')} />
          </QuoteSummaryRow>
          <QuoteSummaryRow
            label={t('pricing.totalProfitQuote', 'Total profit (selling − cost)')}
            rowClass="pricing-quote-summary-row--profit"
          >
            <QuoteSummaryCurrencyText amounts={quoteProfitByCurrency} dash={t('common.dash', '—')} allowNegative />
          </QuoteSummaryRow>
          <QuoteSummaryRow label={t('pricing.grandTotal', 'Grand total')} rowClass="pricing-quote-summary-row--grand">
            <QuoteSummaryCurrencyText amounts={grandSellingByCurrency} dash={t('common.dash', '—')} />
          </QuoteSummaryRow>
        </QuoteGrandSummaryPanel>
      ) : null}
    </div>
  )
}
