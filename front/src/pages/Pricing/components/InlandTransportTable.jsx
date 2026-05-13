import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { formatDate } from '../../../utils/dateUtils'
import { useMutateOffer } from '../../../hooks/usePricing'
import { IconActionButton, IconActionButtonGroup } from '../../../components/Table'
import { CurrencyMapBadges } from '../../Accountings/CurrencyMapBadges'
import { INLAND_PRICE_KEYS } from '../utils/pricingDisplay'
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
                      <div
                        className={`pricing-rate-card__pill ${isReeferKey(primary?.key) ? 'pricing-rate-card__pill--reefer' : 'pricing-rate-card__pill--dry'}`}
                      >
                        {truckLabel}
                      </div>
                      <div>
                        <div className="pricing-rate-card__route">
                          {port} → {govAreaLabel}
                        </div>
                        <div className="pricing-rate-card__meta">
                          <span className="pricing-rate-card__meta-k">{t('pricing.inlandColPort', 'Port')}</span> {port}
                          <span className="pricing-rate-card__meta-sep" aria-hidden>
                            {' · '}
                          </span>
                          <span className="pricing-rate-card__meta-k">{t('pricing.inlandColGovArea', 'Governorate / area')}</span> {govAreaLabel}
                        </div>
                      </div>
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
                      {validStr ? (
                        <span className="pricing-rate-card__tag pricing-rate-card__tag--muted">
                          {t('pricing.validTo')}: {validStr}
                        </span>
                      ) : (
                        <span className="pricing-rate-card__tag pricing-rate-card__tag--muted">{t('pricing.validityOpen', 'No end date')}</span>
                      )}
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
          <div className="pricing-saved-rates__empty">{t('pricing.noOffers', 'No offers found matching your filters')}</div>
        ) : null}
      </div>
    </div>
  )
}
