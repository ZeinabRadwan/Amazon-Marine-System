import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, Eye, Pencil, Trash2 } from 'lucide-react'
import { formatDate, formatLocaleMoney, sortCurrencyCodes } from '../../../utils/dateUtils'
import { useMutateOffer } from '../../../hooks/usePricing'
import { IconActionButton, IconActionButtonGroup } from '../../../components/Table'
import { seaContainerSummary } from '../utils/pricingDisplay'
import '../Pricing.css'

function fmt(price, currency, language) {
  return formatLocaleMoney(price, currency, language)
}

function seaTotalByCurrency(offer) {
  const totals = {}
  const rows = Array.isArray(offer.pricing_items) && offer.pricing_items.length
    ? offer.pricing_items
    : Object.entries(offer.pricing || {}).map(([code, item]) => ({ code, price: item?.price, currency: item?.currency }))

  rows.forEach((row) => {
    const amount = Number(row?.price)
    if (!Number.isFinite(amount)) return
    const currency = row?.currency || 'USD'
    totals[currency] = (totals[currency] || 0) + amount
  })

  return totals
}

function formatTotals(offer, language, dash) {
  const totals = seaTotalByCurrency(offer)
  const currencies = sortCurrencyCodes(Object.keys(totals).filter((c) => Math.abs(totals[c] || 0) > 1e-9))
  if (!currencies.length) return dash
  return currencies.map((currency) => formatLocaleMoney(totals[currency], currency, language)).join(' + ')
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
  const { archive, delete: deleteOffer, loading: mutateLoading } = useMutateOffer()
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

  return (
    <div className="sea-rates-list">
      <div className="sea-rates-list-title">
        <span>نتائج البحث — {offers?.length || 0} عروض / Search results — {offers?.length || 0} rates found</span>
      </div>
      <div className="sea-search-results">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={`sk-${i}`} className="sea-search-result-card animate-pulse">
                <div className="h-5 w-2/3 rounded bg-gray-200" />
                <div className="mt-3 h-4 w-1/2 rounded bg-gray-200" />
              </div>
            ))
          : offers.map((offer) => {
              const p = offer.pricing || {}
              const archived = offer.status === 'archived'
              const validStr = offer.valid_to ? formatDate(offer.valid_to, { locale: i18n.language }) : ''
              const oceanFreight = primarySeaPrice(p)
              const containerSummary = seaContainerSummary(p, t)
              const totalText = formatTotals(offer, i18n.language, dash)
              const sailingText = formatSailingSummary(offer, i18n.language, dash, t)
              return (
                <article
                  key={offer.id}
                  className={`sea-search-result-card ${archived ? 'sea-search-result-card--archived' : ''}`}
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
                  <div className="sea-search-result-header">
                    <div className="sea-search-result-left">
                      <div className="sea-search-carrier-badge">{offer.shipping_line || dash}</div>
                      <div>
                        <div className="sea-search-result-route">{offer.pol || dash} → {offer.pod || offer.region || dash}</div>
                        <div className="sea-search-result-meta">
                          {containerSummary} | Transit: {offer.transit_time || dash} | {seaFreeTimeSummary(offer.dnd, dash)}
                        </div>
                      </div>
                    </div>
                    <div className="sea-search-result-price">
                      <div className="sea-search-result-price-value">{totalText}</div>
                      <div className="sea-search-result-price-label">Total cost</div>
                    </div>
                  </div>

                  <div className="sea-search-result-footer">
                    <div className="sea-search-result-tags">
                      {validStr ? (
                        <span className="sea-search-info-badge">صالح حتى: {validStr}</span>
                      ) : (
                        <span className="sea-search-info-badge">بدون تاريخ انتهاء</span>
                      )}
                      <span className={validStr ? 'sea-search-info-badge' : 'sea-search-warn-badge'}>
                        إبحار: {sailingText}
                      </span>
                      {oceanFreight ? (
                        <span className="sea-search-info-badge">
                          OF: {fmt(oceanFreight.price, oceanFreight.currency || 'USD', i18n.language)}
                        </span>
                      ) : null}
                    </div>
                    <div className="sea-rates-action-cell" onClick={(e) => e.stopPropagation()}>
                        <IconActionButtonGroup aria-label={t('pricing.inlandColActions', 'Actions')}>
                          <IconActionButton
                            icon={<Eye className="h-4 w-4" />}
                            label={t('pricing.actionShow', 'عرض')}
                            onClick={() => onView?.(offer)}
                          />
                          {canManageOffers ? (
                            <IconActionButton
                              icon={<Pencil className="h-4 w-4" />}
                              label={t('pricing.actionEdit', 'تعديل')}
                              onClick={() => onEdit?.(offer)}
                            />
                          ) : null}
                          {canManageOffers ? (
                            <IconActionButton
                              icon={<Archive className="h-4 w-4" />}
                              label={t('pricing.actionArchive', 'أرشفة')}
                              disabled={archived || isBusy(offer, 'archive')}
                              onClick={() => runAction(offer, 'archive', archive)}
                            />
                          ) : null}
                          {canManageOffers ? (
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
          <div className="sea-rates-empty">
            {t('pricing.noOffers', 'No offers found matching your filters')}
          </div>
        ) : null}
      </div>
    </div>
  )
}
