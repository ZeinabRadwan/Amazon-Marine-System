import { useTranslation } from 'react-i18next'
import { Eye, Pencil } from 'lucide-react'
import { formatDate } from '../../../utils/dateUtils'
import { IconActionButton } from '../../../components/Table'
import PricingInlineActions from './PricingInlineActions'
import { CurrencyMapBadges } from '../../Accountings/CurrencyMapBadges'
import { INLAND_PRICE_KEYS } from '../utils/pricingDisplay'
import PricingValidityBadge from './PricingValidityBadge'
import PricingRateCardRoute from './PricingRateCardRoute'
import '../Pricing.css'

function formatGovArea(offer, dash = '—') {
  const gov = (offer.inland_gov || offer.region || '').trim()
  const area = (offer.destination || offer.inland_city || '').trim()
  if (gov && area) return `${gov} — ${area}`
  if (gov) return gov
  if (area) return area
  return dash
}

function primaryInlandPrice(pricing) {
  const p = pricing || {}
  for (const key of INLAND_PRICE_KEYS) {
    if (key === 'generator') continue
    const row = p[key]
    if (row?.price != null && row.price !== '') return { key, row }
  }
  return null
}

function inlandPrimaryOnlyTotals(offer) {
  const p = offer.pricing || {}
  const primary = primaryInlandPrice(p)
  if (!primary?.row || primary.row.price == null || primary.row.price === '') return {}
  const n = Number(primary.row.price)
  if (!Number.isFinite(n)) return {}
  const c = String(primary.row.currency || 'EGP').toUpperCase().trim() || 'EGP'
  return { [c]: n }
}

function inlandGeneratorTotals(offer) {
  const p = offer.pricing || {}
  const gen = p.generator
  if (gen?.price == null || gen.price === '') return null
  const n = Number(gen.price)
  if (!Number.isFinite(n)) return null
  const primary = primaryInlandPrice(p)
  const c = String(gen.currency || primary?.row?.currency || 'EGP').toUpperCase().trim() || 'EGP'
  return { [c]: n }
}

function inlandMergedTotals(offer) {
  const out = { ...inlandPrimaryOnlyTotals(offer) }
  const g = inlandGeneratorTotals(offer)
  if (!g) return out
  for (const [c, v] of Object.entries(g)) {
    out[c] = (Number(out[c]) || 0) + v
  }
  return out
}

function truckLabelFromKey(key, t) {
  if (key === 't20d' || key === 'p20x1' || key === 't20r') return t('pricing.inlandChip20dc', `20' Dry`)
  if (key === 'p20x2') return t('pricing.inlandChipTwin20', `Twin 20'`)
  if (key === 'p40rf' || key === 't40r') return t('pricing.inlandChip40rf', `40' Reefer`)
  if (key === 'p40hq' || key === 't40hq' || key === 't40d') return t('pricing.inlandChip40hq', `40' Dry`)
  return key || '—'
}

function isReeferKey(key) {
  return key === 'p40rf' || key === 't40r' || String(key || '').toLowerCase().includes('rf')
}

export default function InlandTransportTable({
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
        <span className="pricing-saved-rates__title-main">{t('pricing.savedInlandTransportRatesHeading', 'Saved inland transport rates')}</span>
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
              const primary = primaryInlandPrice(p)
              const generator = p.generator
              const validStr = offer.valid_to ? formatDate(offer.valid_to, { locale: i18n.language }) : ''
              const truckLabel = primary ? truckLabelFromKey(primary.key, t) : dash
              const govAreaLabel = formatGovArea(offer, dash)
              const merged = inlandMergedTotals(offer)
              const genMap = inlandGeneratorTotals(offer)
              const truckOnly = inlandPrimaryOnlyTotals(offer)
              const amountFirst = Boolean(i18n.language?.startsWith('ar'))
              const port = offer.inland_port || dash

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
                        <div
                          className={`pricing-rate-card__pill ${isReeferKey(primary?.key) ? 'pricing-rate-card__pill--reefer' : 'pricing-rate-card__pill--dry'}`}
                        >
                          {truckLabel}
                        </div>
                        <div className="pricing-rate-card__route-wrap">
                          <PricingRateCardRoute variant="inland" origin={port} destination={govAreaLabel} dash={dash} />
                        </div>
                      </div>
                      {(() => {
                        const bits = []
                          if (offer.transit_time?.trim()) {
                            bits.push(`${t('pricing.transitTime', 'Transit Time')}: ${offer.transit_time.trim()}`)
                          }
                          if (offer.dnd?.trim()) {
                            bits.push(offer.dnd.trim())
                          }
                          if (!bits.length) return null
                          return <div className="pricing-rate-card__meta">{bits.join(' | ')}</div>
                        })()}
                    </div>
                    <div className="pricing-rate-card__amounts">
                      <div className="pricing-rate-card__amounts-value">
                        <CurrencyMapBadges value={merged} size="sm" amountFirst={amountFirst} emptyLabel={dash} />
                      </div>
                      <div className="pricing-rate-card__amounts-label">{t('pricing.totalCostLabel', 'Total cost')}</div>
                    </div>
                  </div>

                  <div className="pricing-rate-card__footer">
                    <div className="pricing-rate-card__tags">
                      <PricingValidityBadge validTo={offer.valid_to} formattedDate={validStr} />
                      {generator?.price != null && genMap ? (
                        <span className="pricing-rate-card__tag pricing-rate-card__tag--muted pricing-rate-card__tag--currency">
                          {Object.keys(truckOnly).length ? (
                            <>
                              <span className="pricing-rate-card__tag-k">{t('pricing.inlandTruckRate', 'Truck')}</span>
                              <CurrencyMapBadges value={truckOnly} size="sm" amountFirst={amountFirst} emptyLabel={dash} />
                            </>
                          ) : null}
                          <span className="pricing-rate-card__tag-k pricing-rate-card__tag-k--suffix">
                            {t('pricing.inlandGeneratorAddon', 'Generator add-on')}
                          </span>
                          <CurrencyMapBadges value={genMap} size="sm" amountFirst={amountFirst} />
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
          <div className="pricing-saved-rates__empty">{t('pricing.noOffers', 'No offers found matching your filters')}</div>
        ) : null}
      </div>
    </div>
  )
}
