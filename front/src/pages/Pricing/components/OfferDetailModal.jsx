import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Ship, Truck, FilePlus2 } from 'lucide-react'
import { formatDate, formatLocaleMoney, sortCurrencyCodes, sumAmountsByCurrencyFromItems, sumPricingObjectByCurrency } from '../../../utils/dateUtils'
import { inlandContainerSummary, seaContainerSummary } from '../utils/pricingDisplay'
import '../../../components/PageHeader/PageHeader.css'
import '../Pricing.css'

const SEA_ITEMS = [
  { key: 'of20', optional: false },
  { key: 'of20rf', optional: true },
  { key: 'of40', optional: false },
  { key: 'thc20', optional: false },
  { key: 'thc20rf', optional: true },
  { key: 'thc40', optional: false },
  { key: 'of40rf', optional: true },
  { key: 'thcRf', optional: true },
  { key: 'powerDay', optional: true },
  { key: 'pti', optional: true },
]

const INLAND_ITEMS = [
  { key: 'p20x1', optional: true },
  { key: 'p40hq', optional: true },
  { key: 'p40rf', optional: true },
  { key: 't20d', optional: true },
  { key: 't40d', optional: true },
  { key: 't40hq', optional: true },
  { key: 't20r', optional: true },
  { key: 't40r', optional: true },
  { key: 'generator', optional: true },
]

function breakdownLineLabel(code, t) {
  return t(`pricing.breakdown.${code}`, { defaultValue: code })
}

/** Split combined D&D string into POL / POD columns when possible. */
function splitFreeTimePolPod(dnd) {
  if (!dnd || !String(dnd).trim()) {
    return { pol: null, pod: null }
  }
  const s = String(dnd).trim()
  const nl = s.split(/\r?\n/).filter(Boolean)
  if (nl.length >= 2) {
    return { pol: nl[0], pod: nl.slice(1).join(' ') }
  }
  const slash = s.split(/\s*\/\s+/)
  if (slash.length >= 2) {
    return { pol: slash[0], pod: slash.slice(1).join(' / ') }
  }
  const pipe = s.split(/\s*\|\s*/)
  if (pipe.length >= 2) {
    return { pol: pipe[0], pod: pipe[1] }
  }
  return { pol: s, pod: s }
}

const SEA_KEYS = SEA_ITEMS.map((x) => x.key)
const INLAND_KEYS = INLAND_ITEMS.map((x) => x.key)

const WEEKDAY_I18N = {
  Saturday: 'pricing.weekdaySaturday',
  Sunday: 'pricing.weekdaySunday',
  Monday: 'pricing.weekdayMonday',
  Tuesday: 'pricing.weekdayTuesday',
  Wednesday: 'pricing.weekdayWednesday',
  Thursday: 'pricing.weekdayThursday',
  Friday: 'pricing.weekdayFriday',
}

function formatWeeklySailingLine(raw, t) {
  if (!raw || !String(raw).trim()) return ''
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((day) => {
      const k = WEEKDAY_I18N[day]
      return k ? t(k, day) : day
    })
    .join(` ${t('pricing.weekdayJoiner', '+')} `)
}

function OfferDetailFieldRow({ label, children }) {
  return (
    <div className="pricing-offer-detail-card__row">
      <span className="pricing-offer-detail-card__label">{label}</span>
      <span className="pricing-offer-detail-card__value">{children}</span>
    </div>
  )
}

export default function OfferDetailModal({ isOpen, offer, onClose, onCreateQuotation }) {
  const { t, i18n } = useTranslation()
  const isSea = offer?.pricing_type === 'sea'

  const breakdownRows = useMemo(() => {
    if (!offer) return []
    const lang = i18n.language
    const dash = t('common.dash')
    const fromApi = Array.isArray(offer.pricing_items) ? offer.pricing_items : null
    if (fromApi?.length) {
      return fromApi.map((row) => ({
        key: row.code,
        label: breakdownLineLabel(row.code, t),
        value: formatLocaleMoney(row.price, row.currency, lang),
      }))
    }
    const items = isSea ? SEA_ITEMS : INLAND_ITEMS
    return items
      .map((it) => {
        const item = offer.pricing?.[it.key]
        if (it.optional && (!item || item.price == null || item.price === '')) return null
        if (!item || item.price == null) {
          return it.optional ? null : { key: it.key, label: breakdownLineLabel(it.key, t), value: dash }
        }
        return {
          key: it.key,
          label: breakdownLineLabel(it.key, t),
          value: formatLocaleMoney(item?.price, item?.currency, lang),
        }
      })
      .filter(Boolean)
  }, [offer, isSea, t, i18n.language])

  const approxTotalsByCurrency = useMemo(() => {
    if (!offer) return {}
    const fromApi = Array.isArray(offer.pricing_items) ? offer.pricing_items : null
    if (fromApi?.length) {
      return sumAmountsByCurrencyFromItems(fromApi.map((row) => ({ amount: row.price, currency: row.currency })))
    }
    const keys = isSea ? SEA_KEYS : INLAND_KEYS
    return sumPricingObjectByCurrency(offer.pricing, keys)
  }, [offer, isSea])

  const approxTotalCurrencyKeys = useMemo(
    () => sortCurrencyCodes(Object.keys(approxTotalsByCurrency).filter((c) => Math.abs(approxTotalsByCurrency[c] || 0) > 1e-9)),
    [approxTotalsByCurrency]
  )

  const { pol: freePol, pod: freePod } = splitFreeTimePolPod(offer?.dnd)

  if (!isOpen || !offer) return null

  const dash = t('common.dash')
  const routeLabel = isSea
    ? `${offer.pol || dash} → ${offer.pod || offer.region || dash}`
    : `${offer.inland_port || dash} → ${offer.destination || offer.region || dash}`

  const fromIso = offer.valid_from ? String(offer.valid_from).slice(0, 10) : ''
  const toIso = offer.valid_to ? String(offer.valid_to).slice(0, 10) : ''
  const validityRangeLabel =
    fromIso && toIso
      ? `${formatDate(fromIso, { locale: i18n.language })} – ${formatDate(toIso, { locale: i18n.language })}`
      : toIso
        ? formatDate(toIso, { locale: i18n.language })
        : fromIso
          ? formatDate(fromIso, { locale: i18n.language })
          : dash

  const weeklySailingDisplay = formatWeeklySailingLine(offer.weekly_sailing_days, t)

  const sailingSep = i18n.language?.startsWith('ar') ? ' ، ' : ', '
  const sailingFormatted =
    offer.sailing_dates?.length > 0
      ? offer.sailing_dates.map((d) => formatDate(d, { locale: i18n.language })).join(sailingSep)
      : dash

  const offerStatusLabel =
    offer.status === 'active'
      ? t('pricing.offerStatusActive')
      : offer.status === 'archived'
        ? t('pricing.offerStatusArchived')
        : offer.status === 'draft'
          ? t('pricing.offerStatusDraft')
          : offer.status || dash

  const handleCreateQuotation = () => {
    onCreateQuotation?.(offer)
    onClose?.()
  }

  const hasAdditionalInfo =
    Boolean(offer.other_charges?.trim()) || (!isSea && (offer.transit_time || offer.region))

  const notesText = typeof offer.notes === 'string' ? offer.notes.trim() : ''
  const hasNotes = Boolean(notesText)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700"
        role="dialog"
        aria-labelledby="offer-detail-title"
        aria-modal="true"
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isSea ? <Ship className="h-5 w-5 text-blue-500 shrink-0" /> : <Truck className="h-5 w-5 text-amber-500 shrink-0" />}
            <h2 id="offer-detail-title" className="text-lg font-bold truncate min-w-0">
              {t('pricing.offerDetails', 'Offer Details')} <span className="text-gray-400 font-semibold">#{offer.id}</span>
            </h2>
            {offer.status ? (
              <span
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                  offer.status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                    : offer.status === 'archived'
                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                }`}
              >
                {offerStatusLabel}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors shrink-0"
            aria-label={t('common.close', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Route & equipment — shipment-style grouped card */}
          {isSea ? (
            <section className="pricing-offer-detail-card">
              <h3 className="pricing-offer-detail-card__title">
                {t('pricing.offerDetailRouteEquipmentTitle', 'Route & equipment')}
              </h3>
              <div className="pricing-offer-detail-card__grid">
                <OfferDetailFieldRow label={t('pricing.offerDetailPolFieldLabel', 'BOL / ميناء التحميل')}>
                  {offer.pol || dash}
                </OfferDetailFieldRow>
                <OfferDetailFieldRow label={t('pricing.offerDetailPodFieldLabel', 'POD / ميناء التفريغ')}>
                  {offer.pod || dash}
                </OfferDetailFieldRow>
                <OfferDetailFieldRow label={t('pricing.offerDetailRegionFieldLabel', 'Region / المنطقة')}>
                  {offer.region || dash}
                </OfferDetailFieldRow>
                <OfferDetailFieldRow label={t('pricing.offerDetailShippingLineFieldLabel', 'Shipping Line / الناقل')}>
                  {offer.shipping_line || dash}
                </OfferDetailFieldRow>
                <OfferDetailFieldRow label={t('pricing.offerDetailContainerTypeFieldLabel', 'Container Type / نوع الحاوية')}>
                  {seaContainerSummary(offer.pricing, t)}
                </OfferDetailFieldRow>
                <OfferDetailFieldRow label={t('pricing.offerDetailTransitFieldLabel', 'Transit Time / مدة العبور')}>
                  {offer.transit_time || dash}
                </OfferDetailFieldRow>
                <OfferDetailFieldRow label={t('pricing.offerDetailValidityFieldLabel', 'Validity / الصلاحية')}>
                  <span className="text-green-600 dark:text-green-400 font-semibold">{validityRangeLabel}</span>
                </OfferDetailFieldRow>
                <div className="pricing-offer-detail-card__row pricing-offer-detail-card__row--full">
                  <span className="pricing-offer-detail-card__label">
                    {t('pricing.offerDetailSailingFieldLabel', 'Sailing / الإبحار')}
                  </span>
                  <span className="pricing-offer-detail-card__value">
                    {weeklySailingDisplay || (sailingFormatted !== dash ? sailingFormatted : dash)}
                  </span>
                </div>
              </div>
            </section>
          ) : (
            <section className="pricing-offer-detail-card">
              <h3 className="pricing-offer-detail-card__title">
                {t('pricing.offerDetailInlandSummaryTitle', 'Route & transport')}
              </h3>
              <div className="pricing-offer-detail-card__grid">
                <OfferDetailFieldRow label={t('pricing.offerDetailInlandPortLabel', 'Port / الميناء')}>
                  {offer.inland_port || dash}
                </OfferDetailFieldRow>
                <OfferDetailFieldRow label={t('pricing.offerDetailInlandRegionLabel', 'Region / المنطقة')}>
                  {offer.region || dash}
                </OfferDetailFieldRow>
                <OfferDetailFieldRow label={t('pricing.offerDetailInlandRouteLabel', 'Route / المسار')}>
                  {routeLabel}
                </OfferDetailFieldRow>
                {offer.transit_time ? (
                  <OfferDetailFieldRow label={t('pricing.offerDetailTransitFieldLabel', 'Transit Time / مدة العبور')}>
                    {offer.transit_time}
                  </OfferDetailFieldRow>
                ) : null}
                <OfferDetailFieldRow label={t('pricing.offerDetailShippingLineFieldLabel', 'Shipping Line / الناقل')}>
                  {offer.shipping_line || t('pricing.inlandTransport')}
                </OfferDetailFieldRow>
                <OfferDetailFieldRow label={t('pricing.offerDetailContainerTypeFieldLabel', 'Container Type / نوع الحاوية')}>
                  {inlandContainerSummary(offer.pricing, t)}
                </OfferDetailFieldRow>
                <OfferDetailFieldRow label={t('pricing.offerDetailValidityFieldLabel', 'Validity / الصلاحية')}>
                  <span className="text-green-600 dark:text-green-400 font-semibold">{validityRangeLabel}</span>
                </OfferDetailFieldRow>
              </div>
            </section>
          )}

          {/* Cost breakdown */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('pricing.detailCostBreakdown', 'Cost breakdown')}
            </h3>
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {breakdownRows.map((r) => (
                  <div key={r.key} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{r.label}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{r.value}</span>
                  </div>
                ))}
              </div>
              {approxTotalCurrencyKeys.length ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 px-4 py-3 bg-white/80 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                    {t('pricing.detailApproxTotal', 'Approx. total')}
                  </span>
                  <div className="flex flex-col items-end gap-1">
                    {approxTotalCurrencyKeys.map((cur) => (
                      <span key={cur} className="pricing-money-total text-cyan-600 dark:text-cyan-400">
                        {formatLocaleMoney(approxTotalsByCurrency[cur], cur, i18n.language)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* Free time POL / POD */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('pricing.detailFreeTimePolPod', 'Free time (POL / POD)')}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
                <p className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                  {t('pricing.pol', 'POL')}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-pre-wrap">
                  {freePol || dash}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4">
                <p className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                  {t('pricing.pod', 'POD')}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-pre-wrap">
                  {freePod || dash}
                </p>
              </div>
            </div>
            {!offer.dnd?.trim() ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('pricing.detailNoFreeTime', 'No free time notes on file.')}</p>
            ) : null}
          </section>

          {/* Notes — own section only when present */}
          {hasNotes ? (
            <section>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {t('pricing.notes', 'Notes')}
              </h3>
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 px-4 py-4">
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{notesText}</p>
              </div>
            </section>
          ) : null}

          {/* Additional info */}
          <section>
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              {t('pricing.detailAdditionalInfo', 'Additional info')}
            </h3>
            {hasAdditionalInfo ? (
              <div className="rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {!isSea && offer.transit_time ? (
                  <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs font-bold uppercase text-gray-500">{t('pricing.transitTimeLabel', 'Transit')}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{offer.transit_time || dash}</span>
                  </div>
                ) : null}
                {!isSea && offer.region ? (
                  <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs font-bold uppercase text-gray-500">{t('pricing.region', 'Region')}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{offer.region}</span>
                  </div>
                ) : null}
                {offer.other_charges ? (
                  <div className="px-4 py-3 flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-gray-500">{t('pricing.otherCharges', 'Other charges')}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{offer.other_charges}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 px-1">{t('pricing.detailNoExtra', 'No additional information.')}</p>
            )}
          </section>
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            {t('common.close', 'Close')}
          </button>
          {typeof onCreateQuotation === 'function' ? (
            <button
              type="button"
              onClick={handleCreateQuotation}
              className="page-header__btn page-header__btn--primary inline-flex items-center justify-center gap-2"
            >
              <FilePlus2 className="h-4 w-4 shrink-0" aria-hidden />
              {t('pricing.ctaCreateQuotation', 'Create Quotation')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
