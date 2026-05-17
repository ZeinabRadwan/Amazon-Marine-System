import { useTranslation } from 'react-i18next'
import { Box, Clock, Eye, Pencil, Timer } from 'lucide-react'
import { formatDate } from '../../../utils/dateUtils'
import { IconActionButton } from '../../../components/Table'
import PricingInlineActions from './PricingInlineActions'
import { CurrencyMapBadges } from '../../Accountings/CurrencyMapBadges'
import { seaContainerSummary } from '../utils/pricingDisplay'
import PricingValidityBadge from './PricingValidityBadge'
import PricingRateCardRoute from './PricingRateCardRoute'
import '../Pricing.css'

function seaTotalByCurrency(offer) {
  const totals = {}
  const rows = Array.isArray(offer.pricing_items) && offer.pricing_items.length
    ? offer.pricing_items
    : Object.entries(offer.pricing || {}).map(([code, item]) => ({ code, price: item?.price, currency: item?.currency }))

  rows.forEach((row) => {
    const amount = Number(row?.price)
    if (!Number.isFinite(amount)) return
    const currency = String(row?.currency || 'USD').toUpperCase().trim() || 'USD'
    totals[currency] = (totals[currency] || 0) + amount
  })

  return totals
}

function parseFreeTimeDigits(raw) {
  const match = String(raw ?? '').match(/(\d+(?:\.\d+)?)/)
  return match ? String(Number(match[1])) : '0'
}

function parseFreeTimeFromDnd(dnd) {
  const result = { polDet: '0', polDem: '0', podDet: '0', podDem: '0' }
  if (!dnd?.trim()) return result
  String(dnd)
    .split('\n')
    .filter(Boolean)
    .forEach((line) => {
      const upper = line.toUpperCase()
      const detMatch = line.match(/Detention:\s*([^|]+)/i)
      const demMatch = line.match(/Demurrage:\s*(.+)/i)
      if (upper.includes('POL')) {
        result.polDet = parseFreeTimeDigits(detMatch?.[1])
        result.polDem = parseFreeTimeDigits(demMatch?.[1])
      }
      if (upper.includes('POD')) {
        result.podDet = parseFreeTimeDigits(detMatch?.[1])
        result.podDem = parseFreeTimeDigits(demMatch?.[1])
      }
    })
  return result
}

function formatRateCardFreeTimeDays(value, dayUnit, daysUnit) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return `0 ${daysUnit}`
  if (num === 1) return `1 ${dayUnit}`
  return `${num} ${daysUnit}`
}

function SeaRateCardFreeTimeMetaItem({ variant, detention, demurrage, t }) {
  const isPol = variant === 'pol'
  const label = t(isPol ? 'pricing.oceanRoutePolEnglishAbbr' : 'pricing.oceanRoutePodEnglishAbbr', isPol ? 'POL' : 'POD')
  const dayUnit = t('pricing.offerDetailDayUnit', 'day')
  const daysUnit = t('pricing.offerDetailDaysUnit', 'days')

  return (
    <span
      className={`pricing-rate-card__meta-item pricing-rate-card__meta-item--${variant}`}
      aria-label={`${label} ${t('pricing.detailFreeTimePolPod', 'Free time')}`}
    >
      <Timer className="pricing-rate-card__meta-item-icon" aria-hidden />
      <span className="pricing-rate-card__meta-item-label">{label}</span>
      <span className="pricing-rate-card__meta-item-value pricing-rate-card__meta-item-value--ft">
        <span className="pricing-rate-card__meta-ft-pair">
          <span className="pricing-rate-card__meta-ft-k">{t('pricing.offerDetailDetentionShort', 'Det')}</span>
          <span className="pricing-rate-card__meta-ft-v">{formatRateCardFreeTimeDays(detention, dayUnit, daysUnit)}</span>
        </span>
        <span className="pricing-rate-card__meta-ft-sep" aria-hidden>
          ·
        </span>
        <span className="pricing-rate-card__meta-ft-pair">
          <span className="pricing-rate-card__meta-ft-k">{t('pricing.offerDetailDemurrageShort', 'Dem')}</span>
          <span className="pricing-rate-card__meta-ft-v">{formatRateCardFreeTimeDays(demurrage, dayUnit, daysUnit)}</span>
        </span>
      </span>
    </span>
  )
}

function SeaRateCardMeta({ offer, containerSummary, dash, t }) {
  const ft = parseFreeTimeFromDnd(offer.dnd)
  const hasFreeTime = Boolean(offer.dnd?.trim())
  const transit = offer.transit_time?.trim() || dash

  return (
    <div className="pricing-rate-card__meta pricing-rate-card__meta--sea" onClick={(e) => e.stopPropagation()}>
      <div className="pricing-rate-card__meta-strip" role="group" aria-label={t('pricing.rateCardMetaGroup', 'Rate details')}>
        <span className="pricing-rate-card__meta-item">
          <Box className="pricing-rate-card__meta-item-icon" aria-hidden />
          <span className="pricing-rate-card__meta-item-label">{t('pricing.containerType', 'Container')}</span>
          <span className="pricing-rate-card__meta-item-value">{containerSummary}</span>
        </span>
        <span className="pricing-rate-card__meta-item">
          <Clock className="pricing-rate-card__meta-item-icon" aria-hidden />
          <span className="pricing-rate-card__meta-item-label">{t('pricing.transitTime', 'Transit Time')}</span>
          <span className="pricing-rate-card__meta-item-value">{transit}</span>
        </span>
        {hasFreeTime ? (
          <>
            <SeaRateCardFreeTimeMetaItem variant="pol" detention={ft.polDet} demurrage={ft.polDem} t={t} />
            <SeaRateCardFreeTimeMetaItem variant="pod" detention={ft.podDet} demurrage={ft.podDem} t={t} />
          </>
        ) : null}
      </div>
    </div>
  )
}

function formatSailingSummary(offer, language, dash, t) {
  if (Array.isArray(offer.sailing_dates) && offer.sailing_dates.length) {
    const sep = language?.startsWith('ar') ? '، ' : ', '
    return offer.sailing_dates.map((d) => formatDate(d, { locale: language })).join(sep)
  }
  if (offer.weekly_sailing_days) {
    return String(offer.weekly_sailing_days)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .join(` ${t('pricing.weekdayJoiner', '+')} `)
  }
  return dash
}

function primarySeaPrice(pricing) {
  const p = pricing || {}
  const keys = ['of20', 'of40', 'of20rf', 'of40rf']
  for (const key of keys) {
    const row = p[key]
    if (row?.price != null && row.price !== '') return row
  }
  return null
}

export default function SeaFreightOffersTable({
  offers = [],
  loading = false,
  onView,
  onEdit,
  canManageOffers = false,
}) {
  const { t, i18n } = useTranslation()
  const dash = t('common.dash', '—')

  const count = offers?.length || 0

  return (
    <div className="pricing-saved-rates">
      <div className="pricing-saved-rates__title">
        <span className="pricing-saved-rates__title-main">{t('pricing.savedSeaFreightRatesHeading', 'Saved sea freight rates')}</span>
        <span className="pricing-saved-rates__title-count">{t('pricing.savedRatesCountSuffix', { count, defaultValue: '{{count}} offers' })}</span>
      </div>
      <div className="pricing-saved-rates__grid">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="pricing-rate-card pricing-rate-card--skeleton animate-pulse">
                <div className="h-5 w-2/3 rounded bg-gray-200 dark:bg-gray-600" />
                <div className="mt-3 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-600" />
              </div>
            ))
          : offers.map((offer) => {
              const p = offer.pricing || {}
              const archived = offer.status === 'archived'
              const validStr = offer.valid_to ? formatDate(offer.valid_to, { locale: i18n.language }) : ''
              const oceanFreight = primarySeaPrice(p)
              const containerSummary = seaContainerSummary(p, t)
              const totalsMap = seaTotalByCurrency(offer)
              const sailingText = formatSailingSummary(offer, i18n.language, dash, t)
              const amountFirst = Boolean(i18n.language?.startsWith('ar'))
              return (
                <article
                  key={offer.id}
                  className={`pricing-rate-card ${archived ? 'pricing-rate-card--archived' : ''}`}
                  onClick={() => onView?.(offer)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onView?.(offer)
                    }
                  }}
                >
                  <div className="pricing-rate-card__header">
                    <div className="pricing-rate-card__header-main">
                      <div className="pricing-rate-card__header-identity">
                        <div className="pricing-rate-card__header-identity-row">
                          <span className="pricing-rate-card__pill pricing-rate-card__pill--carrier">{offer.shipping_line || dash}</span>
                          <div className="pricing-rate-card__route-wrap">
                            <PricingRateCardRoute
                              variant="sea"
                              origin={offer.pol}
                              destination={offer.pod || offer.region}
                              dash={dash}
                            />
                          </div>
                          <SeaRateCardMeta offer={offer} containerSummary={containerSummary} dash={dash} t={t} />
                        </div>
                      </div>
                    </div>
                    <div className="pricing-rate-card__amounts">
                      <div className="pricing-rate-card__amounts-value">
                        <CurrencyMapBadges value={totalsMap} size="sm" amountFirst={amountFirst} emptyLabel={dash} />
                      </div>
                      <div className="pricing-rate-card__amounts-label">{t('pricing.totalCostLabel', 'Total cost')}</div>
                    </div>
                  </div>

                  <div className="pricing-rate-card__footer">
                    <div className="pricing-rate-card__tags">
                      <PricingValidityBadge validTo={offer.valid_to} formattedDate={validStr} />
                      <span className={validStr ? 'pricing-rate-card__tag pricing-rate-card__tag--muted' : 'pricing-rate-card__tag pricing-rate-card__tag--accent'}>
                        {t('pricing.sailings')}: {sailingText}
                      </span>
                      {oceanFreight ? (
                        <span className="pricing-rate-card__tag pricing-rate-card__tag--muted pricing-rate-card__tag--currency">
                          <span className="pricing-rate-card__tag-k">{t('pricing.oceanFreightAbbr', 'Ocean freight (OF)')}</span>
                          <CurrencyMapBadges
                            value={{
                              [String(oceanFreight.currency || 'USD').toUpperCase().trim() || 'USD']: Number(oceanFreight.price),
                            }}
                            size="sm"
                            amountFirst={amountFirst}
                          />
                        </span>
                      ) : null}
                    </div>
                    <PricingInlineActions
                      className="pricing-rate-card__actions"
                      label={t('pricing.inlandColActions', 'Actions')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconActionButton
                        icon={<Eye className="h-4 w-4" />}
                        label={t('common.view', 'View')}
                        onClick={() => onView?.(offer)}
                      />
                      {canManageOffers && !archived ? (
                        <IconActionButton
                          icon={<Pencil className="h-4 w-4" />}
                          label={t('common.edit', 'Edit')}
                          onClick={() => onEdit?.(offer)}
                        />
                      ) : null}
                    </PricingInlineActions>
                  </div>
                </article>
              )
            })}
        {!loading && (!offers || offers.length === 0) ? (
          <div className="pricing-saved-rates__empty">
            {t('pricing.noOffers', 'No offers found matching your filters')}
          </div>
        ) : null}
      </div>
    </div>
  )
}
