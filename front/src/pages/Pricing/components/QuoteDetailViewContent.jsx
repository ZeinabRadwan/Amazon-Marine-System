import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { User, MapPin, Ship, Truck, Package, DollarSign } from 'lucide-react'
import { formatSailingScheduleFromQuote } from '../utils/sailingSchedule'
import { buildQuoteDetailViewModel } from '../utils/quoteDetailViewModel'
import { buildQuoteRouteSummary } from '../utils/quotePricingType'
import QuoteSailingScheduleDisplay from './QuoteSailingScheduleDisplay'
import QuoteFinCard from './quoteFinCard'
import { QuoteSummaryBadge, ShippingLineSummaryBadgeReadOnly } from './quoteFormLayout'
import QuotePricingLinesTable from './QuotePricingLinesTable'
import QuoteOceanLinesSummary from './QuoteOceanLinesSummary'
import QuoteReeferDeferredFootnote from './QuoteReeferDeferredFootnote'
import QuoteOwsDeferredFootnote from './QuoteOwsDeferredFootnote'
import QuoteInlandTransportSection from './QuoteInlandTransportSection'
import QuoteCustomsClearanceSection from './QuoteCustomsClearanceSection'
import QuoteHandlingFeesSection from './QuoteHandlingFeesSection'
import { QuoteGrandSummaryPanel, QuoteSummaryCurrencyText, QuoteSummaryRow } from './quoteSummaryUi'

const noop = () => {}

export default function QuoteDetailViewContent({ quote }) {
  const { t } = useTranslation()
  const vm = useMemo(() => buildQuoteDetailViewModel(quote), [quote])

  const {
    isQuick,
    isSeaQuote,
    isInlandQuote,
    routeSummary,
    oceanLines,
    inlandLineRows,
    inlandOfferId,
    quickInland,
    handlingLines,
    customsEnabled,
    customsClearanceFee,
    customsExtraItems,
    oceanSellingByCurrency,
    oceanCostByCurrency,
    pricingLinesProfitByCurrency,
    customsSellingByCurrency,
    handlingSellingByCurrency,
    inlandSectionCostByCurrency,
    inlandSectionProfitByCurrency,
    inlandSectionSellingByCurrency,
    quoteProfitByCurrency,
    grandSellingByCurrency,
    hasInlandQuoteData,
    containerLabel,
    showReeferDeferredPowerFootnote,
    reeferDeferred,
    showOwsDeferredFootnote,
    owsDeferred,
  } = vm

  const sailingScheduleDisplayText = formatSailingScheduleFromQuote(quote, t('common.dash', '—'))

  const showCarrierOnPdf = quote?.show_carrier_on_pdf !== false
  const pricingTeamConfirmed = Boolean(quote?.pricing_team_confirmed)
  const dash = t('common.dash', '—')

  const inlandOfferLabel = inlandOfferId
    ? t('pricing.inlandPriceSheetIdLabel', 'Sheet #{{id}}', { id: inlandOfferId })
    : ''

  const showQuickInlandGenerator =
    isQuick && String(quote?.container_type || containerLabel || '').toLowerCase().includes('reefer')

  return (
    <div className="shipment-fin-panel shipment-fin-panel--enter pricing-quote-modal__panel space-y-6">
      {isQuick ? (
        <div className="pricing-quick-banner" role="status">
          <strong>{t('pricing.quickQuotation', 'Quick Quotation')}:</strong>{' '}
          {t(
            'pricing.quickQuotationBanner',
            'Rates are not linked to a CRM price sheet — enter all figures manually. This quotation is stored as a Quick Quotation only.'
          )}
        </div>
      ) : null}

      <QuoteFinCard defaultOpen icon={User} title={t('pricing.quoteSectionClient', 'بيانات العميل / Client Info')}>
        <div className="pricing-quote-client-block">
          <div className="pricing-quote-client-search-line">
            <span className="pricing-quote-inline-item__label">{t('pricing.client', 'Client')}</span>
            <span className="pricing-quote-inline-item__sep" aria-hidden>
              :
            </span>
            <span className="pricing-quote-inline-item__value font-semibold">{quote?.client?.name || dash}</span>
          </div>
        </div>
      </QuoteFinCard>

      {isSeaQuote ? (
      <QuoteFinCard defaultOpen icon={MapPin} title={t('pricing.quoteSectionRoute', 'ملخص المسار / Route summary')}>
        <div className="pricing-quote-shipment-badges">
          <QuoteSummaryBadge label={t('pricing.quoteBadgeRoute', 'المسار')}>
            {routeSummary || buildQuoteRouteSummary(quote, dash)}
          </QuoteSummaryBadge>
          <ShippingLineSummaryBadgeReadOnly
            line={quote?.shipping_line || dash}
            visible={showCarrierOnPdf}
            t={t}
          />
          <QuoteSummaryBadge label={t('pricing.quoteBadgeContainer', 'نوع الحاوية')}>{containerLabel}</QuoteSummaryBadge>
          <QuoteSummaryBadge label={t('pricing.quoteBadgeTransit', 'Transit Time')}>
            {quote?.transit_time || dash}
          </QuoteSummaryBadge>
          <QuoteSailingScheduleDisplay text={sailingScheduleDisplayText} />
        </div>
      </QuoteFinCard>
      ) : null}

      {isSeaQuote ? (
      <QuoteFinCard defaultOpen icon={Ship} title={t('pricing.quoteSectionOcean', 'القسم 1: الشحن البحري / Ocean freight')}>
        {oceanLines.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 m-0">
            {t('pricing.quoteNoPricedLines', 'No line items yet. Add a row or link a sea price sheet.')}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="pricing-quote-ocean-table-block">
              <QuotePricingLinesTable
                lines={oceanLines}
                onUpdateLine={noop}
                readOnly
                readOnlyCost
                readOnlyCurrency
                readOnlyName
                variant="ocean"
              />
            </div>
            <QuoteOceanLinesSummary
              costByCurrency={oceanCostByCurrency}
              profitByCurrency={pricingLinesProfitByCurrency}
              sellingByCurrency={oceanSellingByCurrency}
              footer={
                showReeferDeferredPowerFootnote || showOwsDeferredFootnote ? (
                  <div className="pricing-quote-deferred-footnotes">
                    {showReeferDeferredPowerFootnote ? (
                      <QuoteReeferDeferredFootnote
                        powerPerDay={reeferDeferred?.powerPerDay}
                        freePowerDays={reeferDeferred?.freePowerDays}
                      />
                    ) : null}
                    {showOwsDeferredFootnote ? (
                      <QuoteOwsDeferredFootnote ows={owsDeferred?.ows} />
                    ) : null}
                  </div>
                ) : null
              }
            />
          </div>
        )}
      </QuoteFinCard>
      ) : null}

      {isInlandQuote ? (
      <QuoteFinCard defaultOpen icon={Truck} title={t('pricing.quoteSectionInland', 'Section 2: Inland transport')}>
        <QuoteInlandTransportSection
          readOnly
          isQuick={isQuick}
          inlandOffers={[]}
          inlandOfferId={inlandOfferId}
          onInlandOfferIdChange={noop}
          inlandOfferLabel={inlandOfferLabel}
          inlandLineRows={inlandLineRows}
          onUpdateInlandRow={noop}
          costByCurrency={inlandSectionCostByCurrency}
          profitByCurrency={inlandSectionProfitByCurrency}
          sellingByCurrency={inlandSectionSellingByCurrency}
          quickInlandPort={quickInland?.port || ''}
          onQuickInlandPortChange={noop}
          quickInlandGov={quickInland?.gov || ''}
          onQuickInlandGovChange={noop}
          quickInlandZone={quickInland?.zone || ''}
          onQuickInlandZoneChange={noop}
          quickInlandVehicle={quickInland?.vehicle || ''}
          onQuickInlandVehicleChange={noop}
          inlandCost={quickInland?.cost ?? ''}
          onInlandCostChange={noop}
          inlandSelling={quickInland?.selling ?? ''}
          onInlandSellingChange={noop}
          inlandCurrency={quickInland?.currency || 'EGP'}
          onInlandCurrencyChange={noop}
          showQuickInlandGenerator={showQuickInlandGenerator && quickInland?.showGenerator}
          inlandGenCost={quickInland?.genCost ?? ''}
          onInlandGenCostChange={noop}
          inlandGenSelling={quickInland?.genSelling ?? ''}
          onInlandGenSellingChange={noop}
          inlandGenCurrency={quickInland?.genCurrency || 'EGP'}
          onInlandGenCurrencyChange={noop}
        />
      </QuoteFinCard>
      ) : null}

      {isSeaQuote ? (
      <QuoteFinCard defaultOpen icon={Package} title={t('pricing.quoteSectionCustoms', 'Section 3: Customs clearance')}>
        <QuoteCustomsClearanceSection
          readOnly
          customsActive={customsEnabled}
          onEnable={noop}
          onRemove={noop}
          clearanceFee={customsClearanceFee}
          extraItems={customsExtraItems}
          onAddItem={noop}
          onUpdateItem={noop}
          onRemoveItem={noop}
          totalCostByCurrency={customsSellingByCurrency}
        />
      </QuoteFinCard>
      ) : null}

      <QuoteFinCard defaultOpen icon={DollarSign} title={t('pricing.quoteSectionHandling', 'Section 4: Handling fees')}>
        <QuoteHandlingFeesSection
          readOnly
          lines={handlingLines}
          onAddItem={noop}
          onUpdateItem={noop}
          onRemoveItem={noop}
          totalByCurrency={handlingSellingByCurrency}
        />
      </QuoteFinCard>

      <QuoteGrandSummaryPanel title={t('pricing.quoteSectionSummary', 'Summary')}>
        {isSeaQuote ? (
          <QuoteSummaryRow label={t('pricing.summaryOcean', 'Ocean freight total')}>
            <QuoteSummaryCurrencyText amounts={oceanSellingByCurrency} dash={dash} />
          </QuoteSummaryRow>
        ) : null}
        {isInlandQuote ? (
          <QuoteSummaryRow label={t('pricing.summaryInland', 'Inland transport total')}>
            {hasInlandQuoteData ? (
              <QuoteSummaryCurrencyText amounts={inlandSectionSellingByCurrency} dash={dash} />
            ) : (
              <span className="pricing-quote-summary-currency">{dash}</span>
            )}
          </QuoteSummaryRow>
        ) : null}
        {isSeaQuote ? (
          <QuoteSummaryRow label={t('pricing.summaryCustoms', 'Customs total')}>
            {customsEnabled ? (
              <QuoteSummaryCurrencyText amounts={customsSellingByCurrency} dash={dash} />
            ) : (
              <span className="pricing-quote-summary-currency">{dash}</span>
            )}
          </QuoteSummaryRow>
        ) : null}
        <QuoteSummaryRow label={t('pricing.summaryHandling', 'Handling fees')}>
          <QuoteSummaryCurrencyText amounts={handlingSellingByCurrency} dash={dash} />
        </QuoteSummaryRow>
        <QuoteSummaryRow
          label={t('pricing.totalProfitQuote', 'Total profit (selling − cost)')}
          rowClass="pricing-quote-summary-row--profit"
        >
          <QuoteSummaryCurrencyText amounts={quoteProfitByCurrency} dash={dash} allowNegative />
        </QuoteSummaryRow>
        <QuoteSummaryRow label={t('pricing.grandTotal', 'Grand total')} rowClass="pricing-quote-summary-row--grand">
          <QuoteSummaryCurrencyText amounts={grandSellingByCurrency} dash={dash} />
        </QuoteSummaryRow>
      </QuoteGrandSummaryPanel>

      <section
        className={`pricing-quote-confirmation-card ${
          pricingTeamConfirmed ? 'pricing-quote-confirmation-card--confirmed' : 'pricing-quote-confirmation-card--pending'
        }`}
        role="region"
        aria-label={t('pricing.pricingTeamConfirmTitle', 'Pricing team confirmation')}
      >
        <div className="pricing-quote-confirmation-card__head">
          <h4 className="pricing-quote-confirmation-card__title">
            {t('pricing.pricingTeamConfirmTitle', 'Confirm with Pricing Team before sending')}
          </h4>
          <span
            className={`pricing-quote-confirm-status-badge ${
              pricingTeamConfirmed ? 'pricing-quote-confirm-status-badge--yes' : 'pricing-quote-confirm-status-badge--no'
            }`}
            role="status"
          >
            {pricingTeamConfirmed ? t('pricing.confirmStateYes', 'Confirmed') : t('pricing.confirmStateNo', 'Not confirmed')}
          </span>
        </div>
        <p className="pricing-quote-confirmation-card__body">
          {t(
            'pricing.pricingTeamConfirmBody',
            'Make sure Pricing Team confirms the underlying rates are still valid before you send this quotation to the client.'
          )}
        </p>
      </section>
    </div>
  )
}
