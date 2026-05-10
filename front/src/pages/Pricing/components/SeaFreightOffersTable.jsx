import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate, formatLocaleMoney } from '../../../utils/dateUtils'
import { useMutateOffer } from '../../../hooks/usePricing'
import { seaContainerSummary } from '../utils/pricingDisplay'
import '../Pricing.css'

function fmt(price, currency, language) {
  return formatLocaleMoney(price, currency, language)
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
        <span>أسعار الشحن البحري / Sea Freight Rates</span>
      </div>
      <div className="sea-rates-card">
      <div className="overflow-x-auto">
        <table className="sea-rates-table">
          <thead>
            <tr>
              <th scope="col">
                POL
              </th>
              <th scope="col">
                POD / Region
              </th>
              <th scope="col">
                Shipping Line
              </th>
              <th scope="col">
                Container Type
              </th>
              <th scope="col">
                Ocean Freight
              </th>
              <th scope="col">
                Validity
              </th>
              <th scope="col" aria-label={t('pricing.inlandColActions', 'Actions')}>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}>
                        <div className="h-4 w-3/4 rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              : offers.map((offer) => {
                  const p = offer.pricing || {}
                  const archived = offer.status === 'archived'
                  const validStr = offer.valid_to ? formatDate(offer.valid_to, { locale: i18n.language }) : ''
                  const oceanFreight = primarySeaPrice(p)
                  const containerSummary = seaContainerSummary(p, t)
                  return (
                    <tr
                      key={offer.id}
                      className={archived ? 'opacity-70' : ''}
                    >
                      <td>
                        {offer.pol || dash}
                      </td>
                      <td>
                        {offer.pod || offer.region || dash}
                      </td>
                      <td>
                        {offer.shipping_line || dash}
                      </td>
                      <td>
                        <span className="sea-rate-table-badge">{containerSummary}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {oceanFreight ? fmt(oceanFreight.price, oceanFreight.currency || 'USD', i18n.language) : dash}
                      </td>
                      <td>
                        {validStr ? (
                          <span className="sea-validity-warn">ينتهي {validStr}</span>
                        ) : (
                          <span className="sea-validity-none">بدون انتهاء</span>
                        )}
                      </td>
                      <td className="sea-rates-action-cell">
                        <button type="button" className="sea-rates-action-btn" onClick={() => onView?.(offer)}>
                          عرض
                        </button>
                        {canManageOffers ? (
                          <>
                            <button type="button" className="sea-rates-action-btn" onClick={() => onEdit?.(offer)}>
                              تعديل
                            </button>
                            <button
                              type="button"
                              className="sea-rates-action-btn"
                              disabled={archived || isBusy(offer, 'archive')}
                              onClick={() => runAction(offer, 'archive', archive)}
                            >
                              أرشفة
                            </button>
                            <button
                              type="button"
                              className="sea-rates-action-btn sea-rates-action-btn--danger"
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
                <td colSpan={7} className="sea-rates-empty">
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
