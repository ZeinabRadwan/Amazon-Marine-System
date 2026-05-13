import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Ship, Truck, FilePlus2, ArrowRight, ArrowLeft, MapPin } from 'lucide-react'
import { formatDate, sortCurrencyCodes, sumAmountsByCurrencyFromItems, sumPricingObjectByCurrency } from '../../../utils/dateUtils'
import { inlandContainerSummary, seaContainerSummary } from '../utils/pricingDisplay'
import { CurrencyMapBadges } from '../../Accountings/CurrencyMapBadges'
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

function parseFreeTimeDigits(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return '0'
  const m = s.match(/(\d+(?:\.\d+)?)/)
  return m ? String(Number(m[1])) : '0'
}

function parseFreeTimeFromDnd(dnd) {
  const result = {
    pol_detention: '0',
    pol_demurrage: '0',
    pod_detention: '0',
    pod_demurrage: '0',
  }
  if (!dnd?.trim()) return result
  String(dnd)
    .split('\n')
    .filter(Boolean)
    .forEach((line) => {
      const upper = line.toUpperCase()
      const detMatch = line.match(/Detention:\s*([^|]+)/i)
      const demMatch = line.match(/Demurrage:\s*(.+)/i)
      if (upper.includes('POL')) {
        result.pol_detention = parseFreeTimeDigits(detMatch?.[1])
        result.pol_demurrage = parseFreeTimeDigits(demMatch?.[1])
      }
      if (upper.includes('POD')) {
        result.pod_detention = parseFreeTimeDigits(detMatch?.[1])
        result.pod_demurrage = parseFreeTimeDigits(demMatch?.[1])
      }
    })
  return result
}

function seaPricingLabel(code, t) {
  const labels = {
    of20: 'Ocean freight (OF)',
    of20rf: 'Ocean freight (OF)',
    of40: 'Ocean freight (OF)',
    of40rf: 'Ocean freight (OF)',
    thc20: 'THC',
    thc20rf: 'THC',
    thc40: 'THC',
    thcRf: 'THC',
    blFee: 'B/L fee (بوليصة)',
    telex: 'Telex release',
    pti: 'PTI',
    powerDay: 'Power',
  }
  return labels[code] || t(`pricing.breakdown.${code}`, { defaultValue: code })
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

function formatGovAreaLine(offer) {
  const gov = (offer.inland_gov || offer.region || '').trim()
  const area = (offer.destination || offer.inland_city || '').trim()
  if (gov && area) return `${gov} — ${area}`
  if (gov) return gov
  if (area) return area
  return ''
}

function OfferDetailFieldRow({ label, children }) {
  return (
    <div className="pricing-offer-detail-card__row">
      <span className="pricing-offer-detail-card__label">{label}</span>
      <span className="pricing-offer-detail-card__value">{children}</span>
    </div>
  )
}

function OfferDetailRouteSection({ isSea, offer, dash, t, i18n }) {
  const rtl = Boolean(i18n.language?.startsWith('ar'))
  const Arrow = rtl ? ArrowLeft : ArrowRight

  if (isSea) {
    const pol = offer.pol || dash
    const pod = offer.pod || offer.region || dash
    return (
      <section className="pricing-offer-detail-card">
        <h3 className="pricing-offer-detail-card__title">{t('pricing.offerDetailRouteLocationsTitle', 'Route & locations')}</h3>
        <div className="pricing-offer-detail-route pricing-offer-detail-route--sea">
          <div className="pricing-offer-detail-route__col">
            <span className="pricing-offer-detail-route__eyebrow">{t('pricing.offerDetailFromLabel', 'From')}</span>
            <span className="pricing-offer-detail-route__pill pricing-offer-detail-route__pill--pol">
              {t('pricing.offerDetailRouteBadgePol', 'POL')}
            </span>
            <span className="pricing-offer-detail-route__place">{pol}</span>
            <span className="pricing-offer-detail-route__sub inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              {t('pricing.offerDetailPolFieldLabel', 'POL')}
            </span>
          </div>
          <div className="pricing-offer-detail-route__connector" aria-hidden>
            <Arrow className="pricing-offer-detail-route__icon" />
          </div>
          <div className="pricing-offer-detail-route__col pricing-offer-detail-route__col--end">
            <span className="pricing-offer-detail-route__eyebrow">{t('pricing.offerDetailToLabel', 'To')}</span>
            <span className="pricing-offer-detail-route__pill pricing-offer-detail-route__pill--pod">
              {t('pricing.offerDetailRouteBadgePod', 'POD')}
            </span>
            <span className="pricing-offer-detail-route__place">{pod}</span>
            <span className="pricing-offer-detail-route__sub inline-flex items-center gap-1 justify-end">
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              {t('pricing.offerDetailPodFieldLabel', 'POD')}
            </span>
          </div>
        </div>
        {offer.region?.trim() &&
        offer.pod?.trim() &&
        String(offer.region).trim() !== String(offer.pod).trim() ? (
          <div className="pricing-offer-detail-route__chips">
            <span className="pricing-offer-detail-route__chip">
              {t('pricing.offerDetailRegionFieldLabel', 'Region')}: {offer.region}
            </span>
          </div>
        ) : null}
      </section>
    )
  }

  const port = offer.inland_port || dash
  const dest = offer.destination || offer.region || dash
  const govArea = formatGovAreaLine(offer)

  return (
    <section className="pricing-offer-detail-card">
      <h3 className="pricing-offer-detail-card__title">{t('pricing.offerDetailRouteLocationsTitle', 'Route & locations')}</h3>
      <div className="pricing-offer-detail-route pricing-offer-detail-route--inland">
        <div className="pricing-offer-detail-route__col">
          <span className="pricing-offer-detail-route__eyebrow">{t('pricing.offerDetailFromLabel', 'From')}</span>
          <span className="pricing-offer-detail-route__pill pricing-offer-detail-route__pill--port">
            {t('pricing.offerDetailRouteBadgePort', 'Port')}
          </span>
          <span className="pricing-offer-detail-route__place">{port}</span>
          <span className="pricing-offer-detail-route__sub inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            {t('pricing.offerDetailInlandPortLabel', 'Port')}
          </span>
        </div>
        <div className="pricing-offer-detail-route__connector" aria-hidden>
          <Arrow className="pricing-offer-detail-route__icon" />
        </div>
        <div className="pricing-offer-detail-route__col pricing-offer-detail-route__col--end">
          <span className="pricing-offer-detail-route__eyebrow">{t('pricing.offerDetailToLabel', 'To')}</span>
          <span className="pricing-offer-detail-route__pill pricing-offer-detail-route__pill--dest">
            {t('pricing.offerDetailRouteBadgeDestination', 'Destination')}
          </span>
          <span className="pricing-offer-detail-route__place">{dest}</span>
          <span className="pricing-offer-detail-route__sub inline-flex items-center gap-1 justify-end">
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            {t('pricing.offerDetailGovAreaLabel', 'Governorate / area')}
          </span>
        </div>
      </div>
      {govArea ? (
        <div className="pricing-offer-detail-route__chips">
          <span className="pricing-offer-detail-route__chip">
            {t('pricing.offerDetailGovAreaLabel', 'Governorate / area')}: {govArea}
          </span>
        </div>
      ) : null}
    </section>
  )
}

export default function OfferDetailModal({ isOpen, offer, onClose, onCreateQuotation }) {
  const { t, i18n } = useTranslation()
  const isSea = offer?.pricing_type === 'sea'
  const amountFirst = Boolean(i18n.language?.startsWith('ar'))

  const breakdownRows = useMemo(() => {
    if (!offer) return []
    const dash = t('common.dash')
    const fromApi = Array.isArray(offer.pricing_items) ? offer.pricing_items : null
    const seaMode = offer.pricing_type === 'sea'
    if (fromApi?.length) {
      return fromApi.map((row, idx) => {
        const n = Number(row.price)
        const has = Number.isFinite(n)
        const cur = String(row.currency || 'USD').toUpperCase().trim() || 'USD'
        const code = row.code || row.item_code || row.pricing_item_code || `line-${idx}`
        return {
          key: code,
          label: breakdownLineLabel(code, t),
          money: has ? { [cur]: n } : null,
        }
      })
    }
    const items = seaMode ? SEA_ITEMS : INLAND_ITEMS
    const fallbackCur = seaMode ? 'USD' : 'EGP'
    return items
      .map((it) => {
        const item = offer.pricing?.[it.key]
        const label = seaMode ? seaPricingLabel(it.key, t) : breakdownLineLabel(it.key, t)
        if (it.optional && (!item || item.price == null || item.price === '')) return null
        if (!item || item.price == null || item.price === '') {
          return it.optional ? null : { key: it.key, label, money: null }
        }
        const n = Number(item?.price)
        if (!Number.isFinite(n)) return it.optional ? null : { key: it.key, label, money: null }
        const cur = String(item?.currency || fallbackCur).toUpperCase().trim() || fallbackCur
        return { key: it.key, label, money: { [cur]: n } }
      })
      .filter(Boolean)
  }, [offer, t])

  const approxTotalsByCurrency = useMemo(() => {
    if (!offer) return {}
    const fromApi = Array.isArray(offer.pricing_items) ? offer.pricing_items : null
    if (fromApi?.length) {
      return sumAmountsByCurrencyFromItems(fromApi.map((row) => ({ amount: row.price, currency: row.currency })))
    }
    const keys = offer.pricing_type === 'sea' ? SEA_KEYS : INLAND_KEYS
    return sumPricingObjectByCurrency(offer.pricing, keys)
  }, [offer])

  const approxTotalCurrencyKeys = useMemo(
    () => sortCurrencyCodes(Object.keys(approxTotalsByCurrency).filter((c) => Math.abs(approxTotalsByCurrency[c] || 0) > 1e-9)),
    [approxTotalsByCurrency]
  )

  const approxTotalsNormalized = useMemo(() => {
    const o = {}
    for (const k of approxTotalCurrencyKeys) {
      const code = String(k).toUpperCase().trim()
      o[code] = approxTotalsByCurrency[k]
    }
    return o
  }, [approxTotalsByCurrency, approxTotalCurrencyKeys])

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

  const ft = parseFreeTimeFromDnd(offer.dnd || '')
  const sailingLabel = weeklySailingDisplay || (sailingFormatted !== dash ? sailingFormatted : dash)
  const modalTitle = isSea
    ? t('pricing.offerDetailSeaFreightTitle', 'Sea freight rate details')
    : t('pricing.offerDetailInlandTransportTitle', 'Inland transport rate details')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col border border-gray-200/90 dark:border-gray-700"
        role="dialog"
        aria-labelledby="offer-detail-title"
        aria-modal="true"
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 shrink-0 gap-3 bg-gradient-to-l from-slate-50/90 to-white dark:from-gray-900/80 dark:to-gray-800">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {isSea ? (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                <Ship className="h-5 w-5" aria-hidden />
              </span>
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/35 dark:text-amber-200">
                <Truck className="h-5 w-5" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <h2 id="offer-detail-title" className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug truncate">
                {modalTitle}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                <span className="font-semibold text-gray-600 dark:text-gray-300">{routeLabel}</span>
                <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>#{offer.id}
              </p>
            </div>
            {offer.status ? (
              <span
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${
                  offer.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : offer.status === 'archived'
                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      : 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
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

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          <OfferDetailRouteSection isSea={isSea} offer={offer} dash={dash} t={t} i18n={i18n} />

          <section className="pricing-offer-detail-card">
            <h3 className="pricing-offer-detail-card__title">
              {t('pricing.offerDetailEquipmentScheduleTitle', 'Equipment & schedule')}
            </h3>
            <div className="pricing-offer-detail-card__grid">
              {isSea ? (
                <>
                  <OfferDetailFieldRow label={t('pricing.offerDetailShippingLineFieldLabel', 'Shipping Line / الناقل')}>
                    <span className="inline-flex items-center gap-2 flex-wrap">
                      <span className="pricing-rate-card__pill pricing-rate-card__pill--carrier text-[11px] py-0.5 px-2.5">
                        {offer.shipping_line || dash}
                      </span>
                    </span>
                  </OfferDetailFieldRow>
                  <OfferDetailFieldRow label={t('pricing.offerDetailContainerTypeFieldLabel', 'Container Type / نوع الحاوية')}>
                    {seaContainerSummary(offer.pricing, t)}
                  </OfferDetailFieldRow>
                  <OfferDetailFieldRow label={t('pricing.offerDetailTransitFieldLabel', 'Transit Time / مدة العبور')}>
                    {offer.transit_time || dash}
                  </OfferDetailFieldRow>
                  <OfferDetailFieldRow label={t('pricing.offerDetailValidityFieldLabel', 'Validity / الصلاحية')}>
                    <span className="inline-flex flex-wrap gap-1">
                      <span className="pricing-rate-card__tag pricing-rate-card__tag--muted text-[11px]">{validityRangeLabel}</span>
                    </span>
                  </OfferDetailFieldRow>
                  <div className="pricing-offer-detail-card__row pricing-offer-detail-card__row--full">
                    <span className="pricing-offer-detail-card__label">{t('pricing.offerDetailSailingFieldLabel', 'Sailing / الإبحار')}</span>
                    <span className="pricing-offer-detail-card__value">{sailingLabel}</span>
                  </div>
                </>
              ) : (
                <>
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
                    <span className="pricing-rate-card__tag pricing-rate-card__tag--muted text-[11px]">{validityRangeLabel}</span>
                  </OfferDetailFieldRow>
                </>
              )}
            </div>
          </section>

          <section>
            <h3 className="pricing-offer-detail-section-h">{t('pricing.detailCostBreakdown', 'Cost breakdown')}</h3>
            <div className="pricing-offer-detail-breakdown">
              {breakdownRows.length ? (
                breakdownRows.map((r) => (
                  <div key={r.key} className="pricing-offer-detail-breakdown__row">
                    <span className="pricing-offer-detail-breakdown__label">{r.label}</span>
                    <span className="pricing-offer-detail-breakdown__amount">
                      {r.money ? (
                        <CurrencyMapBadges value={r.money} size="sm" amountFirst={amountFirst} emptyLabel={dash} />
                      ) : (
                        <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{dash}</span>
                      )}
                    </span>
                  </div>
                ))
              ) : (
                <div className="pricing-offer-detail-breakdown__row">
                  <span className="pricing-offer-detail-breakdown__label">{dash}</span>
                  <span className="text-sm text-gray-400">{dash}</span>
                </div>
              )}
              {approxTotalCurrencyKeys.length ? (
                <div className="pricing-offer-detail-breakdown__foot">
                  <span className="pricing-offer-detail-breakdown__foot-label">{t('pricing.detailApproxTotal', 'Approx. total')}</span>
                  <CurrencyMapBadges value={approxTotalsNormalized} size="sm" amountFirst={amountFirst} emptyLabel={dash} />
                </div>
              ) : null}
            </div>
          </section>

          {isSea ? (
            <section>
              <h3 className="pricing-offer-detail-section-h">{t('pricing.offerDetailFreeTimeDetDemTitle', 'Detention & demurrage')}</h3>
              <div className="pricing-offer-detail-detdem">
                <div className="pricing-offer-detail-detdem__box pricing-offer-detail-detdem__box--pol">
                  <div className="pricing-offer-detail-detdem__title">{t('pricing.pol', 'POL')}</div>
                  <div className="pricing-offer-detail-detdem__row">
                    <span className="pricing-offer-detail-detdem__k">{t('pricing.offerDetailDetentionShort', 'Detention')}</span>
                    <span className="pricing-offer-detail-detdem__v">
                      {ft.pol_detention} {t('pricing.offerDetailDayUnit', 'day')}
                    </span>
                  </div>
                  <div className="pricing-offer-detail-detdem__row">
                    <span className="pricing-offer-detail-detdem__k">{t('pricing.offerDetailDemurrageShort', 'Demurrage')}</span>
                    <span className="pricing-offer-detail-detdem__v">
                      {ft.pol_demurrage} {t('pricing.offerDetailDaysUnit', 'days')}
                    </span>
                  </div>
                </div>
                <div className="pricing-offer-detail-detdem__box pricing-offer-detail-detdem__box--pod">
                  <div className="pricing-offer-detail-detdem__title">{t('pricing.pod', 'POD')}</div>
                  <div className="pricing-offer-detail-detdem__row">
                    <span className="pricing-offer-detail-detdem__k">{t('pricing.offerDetailDetentionShort', 'Detention')}</span>
                    <span className="pricing-offer-detail-detdem__v">
                      {ft.pod_detention} {t('pricing.offerDetailDayUnit', 'day')}
                    </span>
                  </div>
                  <div className="pricing-offer-detail-detdem__row">
                    <span className="pricing-offer-detail-detdem__k">{t('pricing.offerDetailDemurrageShort', 'Demurrage')}</span>
                    <span className="pricing-offer-detail-detdem__v">
                      {ft.pod_demurrage} {t('pricing.offerDetailDaysUnit', 'days')}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="pricing-offer-detail-section-h">{t('pricing.detailFreeTimePolPod', 'Free time (POL / POD)')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {t('pricing.pol', 'POL')}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {freePol || dash}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {t('pricing.pod', 'POD')}
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {freePod || dash}
                </p>
              </div>
            </div>
            {!offer.dnd?.trim() ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('pricing.detailNoFreeTime', 'No free time notes on file.')}</p>
            ) : null}
          </section>

          {hasNotes ? (
            <section>
              <h3 className="pricing-offer-detail-section-h">{t('pricing.notes', 'Notes')}</h3>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50/90 dark:bg-gray-900/40 px-4 py-4 shadow-sm">
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{notesText}</p>
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="pricing-offer-detail-section-h">{t('pricing.detailAdditionalInfo', 'Additional info')}</h3>
            {hasAdditionalInfo ? (
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden shadow-sm bg-white dark:bg-gray-800/30">
                {!isSea && offer.transit_time ? (
                  <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{t('pricing.transitTimeLabel', 'Transit')}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{offer.transit_time || dash}</span>
                  </div>
                ) : null}
                {!isSea && offer.region ? (
                  <div className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{t('pricing.region', 'Region')}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{offer.region}</span>
                  </div>
                ) : null}
                {offer.other_charges ? (
                  <div className="px-4 py-3 flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">{t('pricing.otherCharges', 'Other charges')}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{offer.other_charges}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-3 px-1">{t('pricing.detailNoExtra', 'No additional information.')}</p>
            )}
          </section>
        </div>

        <div className="px-5 py-4 bg-gray-50/95 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200/80 dark:hover:bg-gray-700 rounded-xl transition-colors"
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
