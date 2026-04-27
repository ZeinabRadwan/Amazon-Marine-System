import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { CheckCircle, Archive, Loader2, FilePlus2, Eye, Pencil } from 'lucide-react'
import { useMutateOffer } from '../../../hooks/usePricing'
import { IconActionButton, IconActionButtonGroup } from '../../../components/Table'
import { formatDate, formatLocaleMoney, sortCurrencyCodes, sumPricingObjectByCurrency } from '../../../utils/dateUtils'
import {
  INLAND_PRICE_KEYS,
  SEA_PRICE_KEYS,
  formatSailingDates,
  inlandContainerSummary,
  seaContainerSummary,
} from '../utils/pricingDisplay'
import 'boxicons/css/boxicons.min.css'
import './OfferCard.css'

function fmt(price, currency, language) {
  return formatLocaleMoney(price, currency, language)
}

export default function PricingCard({
  offer,
  onMutate,
  onEdit,
  onView,
  onCreateQuotation,
  /** When false (e.g. Sales view-only), hide “Create Quote” on the card. */
  showCreateQuotation = true,
  canManageOffers = true,
}) {
  const { t, i18n } = useTranslation()
  const isSea = offer.pricing_type === 'sea'
  const { activate, archive, loading } = useMutateOffer()
  const [actionLoading, setActionLoading] = useState(null)

  const p = offer.pricing || {}

  const handleActivate = async (e) => {
    e.stopPropagation()
    setActionLoading('activate')
    try {
      await activate(offer.id)
      onMutate?.()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchive = async (e) => {
    e.stopPropagation()
    setActionLoading('archive')
    try {
      await archive(offer.id)
      onMutate?.()
    } catch (err) {
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCardActivate = () => {
    onView?.(offer)
  }

  const handleCardKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onView?.(offer)
    }
  }

  const sailingStr = formatSailingDates(offer.sailing_dates, i18n.language)
  const transitStr = offer.transit_time?.trim() || '—'
  const freeStr = offer.dnd?.trim() || '—'
  const validStr = offer.valid_to ? formatDate(offer.valid_to, { locale: i18n.language }) : ''

  const approxTotalsByCurrency = sumPricingObjectByCurrency(p, isSea ? SEA_PRICE_KEYS : INLAND_PRICE_KEYS)
  const approxTotalKeys = sortCurrencyCodes(
    Object.keys(approxTotalsByCurrency).filter((c) => Math.abs(approxTotalsByCurrency[c] || 0) > 1e-9)
  )
  const totalBlock =
    approxTotalKeys.length === 0 ? (
      <span className="offer-total-values offer-total-values--empty">{t('common.dash')}</span>
    ) : (
      <span className="offer-total-values">
        {approxTotalKeys.map((cur) => (
          <span key={cur} className="offer-total-value">
            {formatLocaleMoney(approxTotalsByCurrency[cur], cur, i18n.language)}
          </span>
        ))}
      </span>
    )

  const archived = offer.status === 'archived'

  if (isSea) {
    const of20s = p.of20?.price != null ? fmt(p.of20.price, p.of20.currency, i18n.language) : t('common.dash')
    const of20rfs = p.of20rf?.price != null ? fmt(p.of20rf.price, p.of20rf.currency, i18n.language) : null
    const of40s = p.of40?.price != null ? fmt(p.of40.price, p.of40.currency, i18n.language) : t('common.dash')
    const of40rfs = p.of40rf?.price != null ? fmt(p.of40rf.price, p.of40rf.currency, i18n.language) : null

    return (
      <div
        className={`offer-card offer-card--clickable ${archived ? 'opacity-70 grayscale' : ''}`}
        role="button"
        tabIndex={0}
        onClick={handleCardActivate}
        onKeyDown={handleCardKeyDown}
        aria-label={t('pricing.cardOpenDetail')}
      >
        <div className="offer-card-header">
          <div className="offer-card-line">
            <span className="shipping-line-badge">{offer.shipping_line || '—'}</span>
            <span className="offer-card-route">
              {(offer.pol || '—')} → {(offer.pod || offer.region || '—')}
            </span>
          </div>
        </div>

        <div className="offer-card__section offer-card__section--container">
          <div className="offer-card__section-label">{t('pricing.containerType')}</div>
          <div className="offer-card__section-value">{seaContainerSummary(p, t)}</div>
        </div>

        <div className="offer-card__section offer-card__section--schedule">
          <div className="offer-card__meta-row">
            <span className="offer-card__meta-item">
              <i className="bx bx-time" aria-hidden />
              <span className="offer-card__meta-text">{transitStr}</span>
            </span>
            <span className="offer-card__meta-sep" aria-hidden />
            <span className="offer-card__meta-item">
              <i className="bx bx-calendar-week" aria-hidden />
              <span className="offer-card__meta-text">{freeStr}</span>
            </span>
          </div>
        </div>

        <div className="offer-card__section offer-card__section--validity">
          <div className="offer-card__meta-row">
            {validStr ? (
              <span className="offer-card__meta-item badge-validity">
                <i className="bx bx-calendar-check" aria-hidden />
                <span className="offer-card__meta-text">
                  {t('pricing.validUntil')} {validStr}
                </span>
              </span>
            ) : null}
            {validStr ? <span className="offer-card__meta-sep" aria-hidden /> : null}
            <span className="offer-card__meta-item">
              <i className="bx bx-calendar" aria-hidden />
              <span className="offer-card__meta-text">{sailingStr}</span>
            </span>
          </div>
        </div>

        <div className="offer-card-prices offer-card-prices--panel">
          <div className="price-chip">
            <span className="price-chip-label">{t('pricing.priceChipOf20Dc')}</span>
            <span className="price-chip-value">{of20s}</span>
          </div>
          {of20rfs ? (
            <div className="price-chip price-chip-reefer">
              <span className="price-chip-label">{t('pricing.priceChipOf20Rf')}</span>
              <span className="price-chip-value">{of20rfs}</span>
            </div>
          ) : null}
          <div className="price-chip">
            <span className="price-chip-label">{t('pricing.priceChipOf40Hq')}</span>
            <span className="price-chip-value">{of40s}</span>
          </div>
          {of40rfs ? (
            <div className="price-chip price-chip-reefer">
              <span className="price-chip-label">{t('pricing.priceChipOf40Rf')}</span>
              <span className="price-chip-value">{of40rfs}</span>
            </div>
          ) : null}
        </div>

        <div className="offer-card-footer">
          <div className="offer-card-footer__totals">
            <span className="offer-total-label">{t('pricing.cardApproxTotal')}</span>
            {totalBlock}
          </div>
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <IconActionButtonGroup aria-label={t('pricing.inlandColActions', 'Actions')}>
              <IconActionButton
                icon={<Eye className="h-4 w-4" />}
                label={t('common.view', 'View')}
                onClick={(e) => {
                  e.stopPropagation()
                  onView?.(offer)
                }}
              />
              {showCreateQuotation ? (
                <IconActionButton
                  icon={<FilePlus2 className="h-4 w-4" />}
                  label={t('pricing.createQuoteFromRate', 'Create Quote')}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateQuotation?.(offer)
                  }}
                />
              ) : null}
              {canManageOffers ? (
                <IconActionButton
                  icon={<Pencil className="h-4 w-4" />}
                  label={t('common.edit', 'Edit')}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.(offer)
                  }}
                />
              ) : null}
              {canManageOffers && offer.status !== 'active' ? (
                <IconActionButton
                  icon={
                    actionLoading === 'activate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />
                  }
                  label={t('common.activate', 'Activate')}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleActivate(e)
                  }}
                  disabled={loading}
                />
              ) : null}
              {canManageOffers && offer.status !== 'archived' ? (
                <IconActionButton
                  icon={actionLoading === 'archive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                  label={t('common.archive', 'Archive')}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleArchive(e)
                  }}
                  disabled={loading}
                />
              ) : null}
            </IconActionButtonGroup>
          </div>
        </div>
      </div>
    )
  }

  const p20 =
    p.p20x1?.price != null
      ? fmt(p.p20x1.price, p.p20x1.currency, i18n.language)
      : p.t20d?.price != null
        ? fmt(p.t20d.price, p.t20d.currency, i18n.language)
        : t('common.dash')
  const p40hq =
    p.p40hq?.price != null
      ? fmt(p.p40hq.price, p.p40hq.currency, i18n.language)
      : p.t40hq?.price != null
        ? fmt(p.t40hq.price, p.t40hq.currency, i18n.language)
        : p.t40d?.price != null
          ? fmt(p.t40d.price, p.t40d.currency, i18n.language)
          : t('common.dash')
  const p40rf =
    p.p40rf?.price != null ? fmt(p.p40rf.price, p.p40rf.currency, i18n.language) : t('common.dash')

  const routeFrom = offer.inland_port || '—'
  const routeTo = offer.destination || offer.region || '—'

  return (
    <div
      className={`offer-card offer-card--clickable ${archived ? 'opacity-70 grayscale' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleCardActivate}
      onKeyDown={handleCardKeyDown}
      aria-label={t('pricing.cardOpenDetail')}
    >
      <div className="offer-card-header">
        <div className="offer-card-line">
          <span className="shipping-line-badge inland-badge">
            <i className="bx bx-trip" aria-hidden />
            {t('pricing.inlandTransport', 'Inland Transport')}
          </span>
          <span className="offer-card-route">
            {routeFrom} → {routeTo}
          </span>
        </div>
      </div>

      <div className="offer-card__section offer-card__section--container">
        <div className="offer-card__section-label">{t('pricing.containerType')}</div>
        <div className="offer-card__section-value">{inlandContainerSummary(p, t)}</div>
      </div>

      <div className="offer-card__section offer-card__section--schedule">
        <div className="offer-card__meta-row">
          <span className="offer-card__meta-item">
            <i className="bx bx-time" aria-hidden />
            <span className="offer-card__meta-text">{transitStr}</span>
          </span>
          <span className="offer-card__meta-sep" aria-hidden />
          <span className="offer-card__meta-item">
            <i className="bx bx-calendar-week" aria-hidden />
            <span className="offer-card__meta-text">{freeStr}</span>
          </span>
        </div>
      </div>

      <div className="offer-card__section offer-card__section--validity">
        <div className="offer-card__meta-row">
          {validStr ? (
            <span className="offer-card__meta-item badge-validity">
              <i className="bx bx-calendar-check" aria-hidden />
              <span className="offer-card__meta-text">
                {t('pricing.validUntil')} {validStr}
              </span>
            </span>
          ) : null}
          {validStr ? <span className="offer-card__meta-sep" aria-hidden /> : null}
          <span className="offer-card__meta-item">
            <i className="bx bx-calendar" aria-hidden />
            <span className="offer-card__meta-text">{sailingStr}</span>
          </span>
        </div>
      </div>

      <div className="offer-card-prices offer-card-prices--panel">
        <div className="price-chip">
          <span className="price-chip-label">{t('pricing.inlandChip20dc')}</span>
          <span className="price-chip-value">{p20}</span>
        </div>
        <div className="price-chip">
          <span className="price-chip-label">{t('pricing.inlandChip40hq')}</span>
          <span className="price-chip-value">{p40hq}</span>
        </div>
        <div className="price-chip price-chip-reefer">
          <span className="price-chip-label">{t('pricing.inlandChip40rf')}</span>
          <span className="price-chip-value">{p40rf}</span>
        </div>
      </div>

      <div className="offer-card-footer">
        <div className="offer-card-footer__totals">
          <span className="offer-total-label">{t('pricing.cardApproxTotal')}</span>
          {totalBlock}
        </div>
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <IconActionButtonGroup aria-label={t('pricing.inlandColActions', 'Actions')}>
            <IconActionButton
              icon={<Eye className="h-4 w-4" />}
              label={t('common.view', 'View')}
              onClick={(e) => {
                e.stopPropagation()
                onView?.(offer)
              }}
            />
            {showCreateQuotation ? (
              <IconActionButton
                icon={<FilePlus2 className="h-4 w-4" />}
                label={t('pricing.createQuoteFromRate', 'Create Quote')}
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateQuotation?.(offer)
                }}
              />
            ) : null}
            {canManageOffers ? (
              <IconActionButton
                icon={<Pencil className="h-4 w-4" />}
                label={t('common.edit', 'Edit')}
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(offer)
                }}
              />
            ) : null}
            {canManageOffers && offer.status !== 'active' ? (
              <IconActionButton
                icon={
                  actionLoading === 'activate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />
                }
                label={t('common.activate', 'Activate')}
                onClick={(e) => {
                  e.stopPropagation()
                  handleActivate(e)
                }}
                disabled={loading}
              />
            ) : null}
            {canManageOffers && offer.status !== 'archived' ? (
              <IconActionButton
                icon={actionLoading === 'archive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                label={t('common.archive', 'Archive')}
                onClick={(e) => {
                  e.stopPropagation()
                  handleArchive(e)
                }}
                disabled={loading}
              />
            ) : null}
          </IconActionButtonGroup>
        </div>
      </div>
    </div>
  )
}
