import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { formatDate } from '../../../utils/dateUtils'
import { useMutateOffer } from '../../../hooks/usePricing'
import { IconActionButton, IconActionButtonGroup } from '../../../components/Table'
import { CurrencyMapBadges } from '../../Accountings/CurrencyMapBadges'
import { seaContainerSummary } from '../utils/pricingDisplay'
import {
  getPricingRateValidityKind,
  PricingRateCardMetricTile,
  PricingRateCardRouteBlock,
  PricingRateCardValidityPill,
} from './PricingRateCardParts'
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

function seaFreeTimeSummary(dnd, dash) {
  if (!dnd?.trim()) return dash
  const ft = parseFreeTimeFromDnd(dnd)
  return `Free: Det ${ft.polDet}/${ft.podDet} | Dem ${ft.polDem}/${ft.podDem} أيام (POL/POD)`
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
  canManageOffers = true,
  onMutate,
}) {
  const { t, i18n } = useTranslation()
  const dash = t('common.dash', '—')
  const { activate, archive, delete: deleteOffer, loading: mutateLoading } = useMutateOffer()
  const [actionOfferId, setActionOfferId] = useState(null)
  const [actionKind, setActionKind] = useState(null)

  const runAction = async (offer, kind, fn) => {
    setActionOfferId(offer.id)
    setActionKind(kind)
    try {
      await fn(offer.id)
      onMutate?.()
    } catch (e) {
      console.error(e)
    } finally {
      setActionOfferId(null)
      setActionKind(null)
    }
  }

  const handleDelete = (offer) => {
    if (!window.confirm(t('pricing.confirmDeleteRate', 'Delete this pricing rate?'))) return
    runAction(offer, 'delete', deleteOffer)
  }

  const isBusy = (offer, kind) => mutateLoading && actionOfferId === offer.id && actionKind === kind

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
              const validityKind = getPricingRateValidityKind(offer)
              const freeSummary = seaFreeTimeSummary(offer.dnd, dash)
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
                    <div className="pricing-rate-card__header-main pricing-rate-card__header-main--stack">
                      <div className="pricing-rate-card__leader">
                        <span className="pricing-rate-card__pill pricing-rate-card__pill--carrier">{offer.shipping_line || dash}</span>
                      </div>
                      <PricingRateCardRouteBlock
                        title={t('pricing.rateCardRouteSectionTitle', 'Pricing rate card route')}
                        fromBadge={t('pricing.offerDetailRouteBadgePol', 'POL')}
                        from={offer.pol || dash}
                        toBadge={t('pricing.offerDetailRouteBadgePod', 'POD')}
                        to={offer.pod || offer.region || dash}
                        rtl={amountFirst}
                      />
                      <div className="pricing-rate-card__metric-grid" role="list">
                        <PricingRateCardMetricTile label={t('pricing.containerType')} title={containerSummary}>
                          {containerSummary}
                        </PricingRateCardMetricTile>
                        <PricingRateCardMetricTile label={t('pricing.transitTime', 'Transit')} title={offer.transit_time || ''}>
                          {offer.transit_time || dash}
                        </PricingRateCardMetricTile>
                        <PricingRateCardMetricTile label={t('pricing.rateCardFreeTimeLabel', 'Free time')} title={freeSummary}>
                          {freeSummary}
                        </PricingRateCardMetricTile>
                        <PricingRateCardMetricTile label={t('pricing.rateMetricValidityLabel', 'Validity')}>
                          <PricingRateCardValidityPill kind={validityKind} validStr={validStr} t={t} />
                        </PricingRateCardMetricTile>
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
                    <div className="pricing-rate-card__actions" onClick={(e) => e.stopPropagation()}>
                        <IconActionButtonGroup aria-label={t('pricing.inlandColActions', 'Actions')}>
                          <IconActionButton
                            icon={<Eye className="h-4 w-4" />}
                            label={t('pricing.actionShow', 'عرض')}
                            onClick={() => onView?.(offer)}
                          />
                          {canManageOffers && !archived ? (
                            <IconActionButton
                              icon={<Pencil className="h-4 w-4" />}
                              label={t('pricing.actionEdit', 'تعديل')}
                              onClick={() => onEdit?.(offer)}
                            />
                          ) : null}
                          {canManageOffers && !archived ? (
                            <IconActionButton
                              icon={<Archive className="h-4 w-4" />}
                              label={t('pricing.actionArchive', 'أرشفة')}
                              disabled={isBusy(offer, 'archive')}
                              onClick={() => runAction(offer, 'archive', archive)}
                            />
                          ) : null}
                          {canManageOffers && archived ? (
                            <IconActionButton
                              icon={<RotateCcw className="h-4 w-4" />}
                              label={t('pricing.actionUnarchive', 'إلغاء الأرشفة')}
                              disabled={isBusy(offer, 'unarchive')}
                              onClick={() => runAction(offer, 'unarchive', activate)}
                              variant="success"
                            />
                          ) : null}
                          {canManageOffers && archived ? (
                            <IconActionButton
                              icon={<Trash2 className="h-4 w-4" />}
                              label={t('pricing.actionDelete', 'حذف')}
                              disabled={isBusy(offer, 'delete')}
                              onClick={() => handleDelete(offer)}
                              variant="danger"
                            />
                          ) : null}
                        </IconActionButtonGroup>
                    </div>
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
