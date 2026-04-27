import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { CheckCircle, Archive, Loader2, FilePlus2 } from 'lucide-react'
import { useMutateOffer } from '../../../hooks/usePricing'
import { formatDate, formatLocaleMoney, sortCurrencyCodes, sumPricingObjectByCurrency } from '../../../utils/dateUtils'
import 'boxicons/css/boxicons.min.css'
import './OfferCard.css'

const SEA_PRICE_KEYS = ['of20', 'of40', 'thc20', 'thc40', 'of40rf', 'thcRf', 'powerDay', 'pti']
const INLAND_PRICE_KEYS = ['p20x1', 'p20x2', 'p40hq', 'p40rf', 'generator', 't20d', 't40hq', 't40d', 't40r', 't20r']

function fmt(price, currency, language) {
  return formatLocaleMoney(price, currency, language)
}

function seaContainerSummary(pricing, t) {
  const dash = t('common.dash')
  if (!pricing) return dash
  const parts = []
  if (pricing.of20?.price != null) parts.push(t('pricing.cardContainerOf20'))
  if (pricing.of40?.price != null) parts.push(t('pricing.cardContainerOf40'))
  if (pricing.of40rf?.price != null) parts.push(t('pricing.cardContainerOf40Rf'))
  return parts.length ? parts.join(t('pricing.cardContainerSep')) : dash
}

function formatSailingDates(dates, locale) {
  if (!dates?.length) return '—'
  const loc = locale === 'ar' ? 'ar-EG' : 'en-US'
  const sep = locale === 'ar' ? ' ، ' : ', '
  return dates
    .map((d) => {
      try {
        const dt = typeof d === 'string' ? new Date(d) : d
        return dt.toLocaleDateString(loc, { day: '2-digit', month: 'short' })
      } catch {
        return String(d)
      }
    })
    .join(sep)
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
          <div className="offer-card-meta">
            <span>
              <i className="bx bx-package" aria-hidden />
              {seaContainerSummary(p, t)}
            </span>
            <span>
              <i className="bx bx-time" aria-hidden />
              {transitStr}
            </span>
            <span>
              <i className="bx bx-calendar-week" aria-hidden />
              {freeStr}
            </span>
          </div>
          <div className="offer-card-meta">
            {validStr ? (
              <span className="badge-validity">
                <i className="bx bx-calendar-check" aria-hidden />
                {t('pricing.validUntil')} {validStr}
              </span>
            ) : null}
            <span>
              <i className="bx bx-calendar" aria-hidden />
              {sailingStr}
            </span>
          </div>
        </div>

        <div className="offer-card-prices">
          <div className="price-chip">
            <span className="price-chip-label">{t('pricing.priceChipOf20Dc')}</span>
            <span className="price-chip-value">{of20s}</span>
          </div>
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
          <span className="offer-total-label">{t('pricing.cardApproxTotal')}</span>
          {totalBlock}
          <div className="offer-card-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation()
                onView?.(offer)
              }}
            >
              <i className="bx bx-show" aria-hidden />
              {t('common.view', 'View')}
            </button>
            {showCreateQuotation ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  onCreateQuotation?.(offer)
                }}
              >
                <FilePlus2 className="h-3.5 w-3.5" aria-hidden />
                {t('pricing.createQuoteFromRate', 'Create Quote')}
              </button>
            ) : null}
            {canManageOffers ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit?.(offer)
                }}
                title={t('common.edit', 'Edit')}
              >
                <i className="bx bx-edit" aria-hidden />
              </button>
            ) : null}
            {canManageOffers && offer.status !== 'active' ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleActivate}
                disabled={loading}
                title={t('common.activate', 'Activate')}
              >
                {actionLoading === 'activate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              </button>
            ) : null}
            {canManageOffers && offer.status !== 'archived' ? (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleArchive}
                disabled={loading}
                title={t('common.archive', 'Archive')}
              >
                {actionLoading === 'archive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
              </button>
            ) : null}
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
        <div className="offer-card-meta">
          <span>
            <i className="bx bx-package" aria-hidden />
            {t('pricing.containerType', 'Container')}
          </span>
          <span>
            <i className="bx bx-time" aria-hidden />
            {transitStr}
          </span>
          <span>
            <i className="bx bx-calendar-week" aria-hidden />
            {freeStr}
          </span>
        </div>
        <div className="offer-card-meta">
          {validStr ? (
            <span className="badge-validity">
              <i className="bx bx-calendar-check" aria-hidden />
              {t('pricing.validUntil')} {validStr}
            </span>
          ) : null}
          <span>
            <i className="bx bx-calendar" aria-hidden />
            {sailingStr}
          </span>
        </div>
      </div>

      <div className="offer-card-prices">
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
        <span className="offer-total-label">{t('pricing.cardApproxTotal', 'Approx. total:')}</span>
        {totalBlock}
        <div className="offer-card-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => {
              e.stopPropagation()
              onView?.(offer)
            }}
          >
            <i className="bx bx-show" aria-hidden />
            {t('common.view', 'View')}
          </button>
          {showCreateQuotation ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation()
                onCreateQuotation?.(offer)
              }}
            >
              <FilePlus2 className="h-3.5 w-3.5" aria-hidden />
              {t('pricing.createQuoteFromRate', 'Create Quote')}
            </button>
          ) : null}
          {canManageOffers ? (
            <button
              type="button"
              className="btn btn-outline"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(offer)
              }}
              title={t('common.edit', 'Edit')}
            >
              <i className="bx bx-edit" aria-hidden />
            </button>
          ) : null}
          {canManageOffers && offer.status !== 'active' ? (
            <button type="button" className="btn btn-outline" onClick={handleActivate} disabled={loading} title={t('common.activate', 'Activate')}>
              {actionLoading === 'activate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            </button>
          ) : null}
          {canManageOffers && offer.status !== 'archived' ? (
            <button type="button" className="btn btn-outline" onClick={handleArchive} disabled={loading} title={t('common.archive', 'Archive')}>
              {actionLoading === 'archive' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
