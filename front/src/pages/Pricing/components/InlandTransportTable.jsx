import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate, formatLocaleMoney } from '../../../utils/dateUtils'
import { useMutateOffer } from '../../../hooks/usePricing'
import { INLAND_PRICE_KEYS } from '../utils/pricingDisplay'
import '../Pricing.css'

function fmt(price, currency, language) {
  return formatLocaleMoney(price, currency, language)
}

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
    <div className="inland-rates-list">
      <div className="inland-rates-list-title">
        <span>الأسعار المحفوظة / Saved Rates</span>
      </div>
      <div className="inland-rates-card">
        <div className="overflow-x-auto">
        <table className="inland-rates-table">
          <thead>
            <tr>
              <th scope="col">
                الميناء / Port
              </th>
              <th scope="col">
                المحافظة / المنطقة
              </th>
              <th scope="col">
                نوع العربية
              </th>
              <th scope="col">
                السعر
              </th>
              <th scope="col">
                الصلاحية
              </th>
              <th scope="col" aria-label={t('pricing.inlandColActions', 'Actions')}>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j}>
                        <div className="h-4 w-3/4 rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              : offers.map((offer) => {
                  const p = offer.pricing || {}
                  const archived = offer.status === 'archived'
                  const primary = primaryInlandPrice(p)
                  const generator = p.generator
                  const validStr = offer.valid_to ? formatDate(offer.valid_to, { locale: i18n.language }) : ''
                  const truckLabel = primary ? truckLabelFromKey(primary.key, t) : dash
                  const govAreaLabel = formatGovArea(offer, dash)
                  const priceText = primary ? fmt(primary.row.price, primary.row.currency || 'EGP', i18n.language) : dash
                  return (
                    <tr
                      key={offer.id}
                      className={archived ? 'opacity-70' : ''}
                    >
                      <td>
                        {offer.inland_port || dash}
                      </td>
                      <td>
                        {govAreaLabel}
                      </td>
                      <td>
                        <span className={`inland-vehicle-badge ${isReeferKey(primary?.key) ? 'inland-vehicle-badge--reefer' : 'inland-vehicle-badge--dry'}`}>
                          {truckLabel}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {priceText}
                        {generator?.price != null ? (
                          <span className="ms-1 text-[11px] text-gray-500">
                            + {fmt(generator.price, generator.currency || primary?.row?.currency || 'EGP', i18n.language)} مولد
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {validStr ? (
                          <span className="inland-validity-warn">ينتهي {validStr}</span>
                        ) : (
                          <span className="inland-validity-none">بدون انتهاء</span>
                        )}
                      </td>
                      <td className="inland-rates-action-cell">
                        <button type="button" className="inland-rates-action-btn" onClick={() => onView?.(offer)}>
                          عرض
                        </button>
                        {canManageOffers ? (
                          <>
                            <button type="button" className="inland-rates-action-btn" onClick={() => onEdit?.(offer)}>
                              تعديل
                            </button>
                            <button
                              type="button"
                              className="inland-rates-action-btn"
                              disabled={archived || isBusy(offer, 'archive')}
                              onClick={() => runAction(offer, 'archive', archive)}
                            >
                              أرشفة
                            </button>
                            <button
                              type="button"
                              className="inland-rates-action-btn inland-rates-action-btn--danger"
                              disabled={isBusy(offer, 'delete')}
                              onClick={() => handleDelete(offer)}
                            >
                              حذف
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
            {!loading && (!offers || offers.length === 0) ? (
              <tr>
                <td colSpan={6} className="inland-rates-empty">
                  {t('pricing.noOffers', 'No offers found matching your filters')}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
