import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Archive, Loader2, FilePlus2 } from 'lucide-react'
import { useMutateOffer } from '../../../hooks/usePricing'
import { formatDate, formatLocaleMoney } from '../../../utils/dateUtils'
import 'boxicons/css/boxicons.min.css'
import './OfferCard.css'

function fmt(price, currency, language) {
  return formatLocaleMoney(price, currency, language)
}

/** Ordered inland price lines for table cells (labels + amounts). */
function inlandPriceRows(offer, t) {
  const p = offer.pricing || {}
  const rows = []

  const p20 = p.p20x1?.price != null ? p.p20x1 : p.t20d?.price != null ? p.t20d : null
  if (p20) {
    rows.push({
      label: t('pricing.inlandTruck20dc', "1×20' DC"),
      amount: p20.price,
      currency: p20.currency,
    })
  }

  const p40 =
    p.p40hq?.price != null
      ? p.p40hq
      : p.t40hq?.price != null
        ? p.t40hq
        : p.t40d?.price != null
          ? p.t40d
          : null
  if (p40) {
    rows.push({
      label: t('pricing.inlandTruck40hq', "40' HQ / Dry"),
      amount: p40.price,
      currency: p40.currency,
    })
  }

  if (p.p40rf?.price != null) {
    rows.push({
      label: t('pricing.inlandTruck40rf', "40' Reefer"),
      amount: p.p40rf.price,
      currency: p.p40rf.currency,
    })
  }

  return rows
}

function formatGovArea(offer, dash) {
  const gov = (offer.inland_gov || offer.region || '').trim()
  const area = (offer.destination || offer.inland_city || '').trim()
  if (gov && area) return `${gov} / ${area}`
  if (gov) return gov
  if (area) return area
  return dash
}

function formatValidity(offer, locale, dash) {
  const from = offer.valid_from ? formatDate(offer.valid_from, { locale }) : ''
  const to = offer.valid_to ? formatDate(offer.valid_to, { locale }) : ''
  const sep = ' – '
  if (from && to) return `${from}${sep}${to}`
  if (to) return to
  if (from) return from
  return dash
}

export default function InlandTransportTable({
  offers = [],
  loading = false,
  onView,
  onCreateQuotation,
  /** When false (e.g. Sales view-only), hide “Create Quote” in the row actions. */
  showCreateQuotation = true,
  onEdit,
  canManageOffers = true,
  onMutate,
}) {
  const { t, i18n } = useTranslation()
  const dash = t('common.dash')
  const { activate, archive, loading: mutateLoading } = useMutateOffer()
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

  const rowBusy = (offerId) => mutateLoading && actionOfferId === offerId

  return (
    <div className="pricing-offer-cards pricing-inland-table-wrap rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="pricing-inland-table min-w-[720px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.inlandColPort', 'Port')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.inlandColGovArea', 'Governorate / Area')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.inlandColTruckType', 'Truck type')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.inlandColPrice', 'Price')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.inlandColValidity', 'Validity')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300 text-end w-[1%] whitespace-nowrap">
                {t('pricing.inlandColActions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : offers.map((offer) => {
                  const archived = offer.status === 'archived'
                  const rows = inlandPriceRows(offer, t)
                  return (
                    <tr
                      key={offer.id}
                      className={`hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors ${archived ? 'opacity-70' : ''}`}
                    >
                      <td className="px-4 py-3 align-top font-semibold text-gray-900 dark:text-white">{offer.inland_port || dash}</td>
                      <td className="px-4 py-3 align-top text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{formatGovArea(offer, dash)}</td>
                      <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-300">
                        {rows.length ? (
                          <ul className="space-y-1 list-none m-0 p-0">
                            {rows.map((r) => (
                              <li key={r.label} className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                {r.label}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400">{dash}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-gray-900 dark:text-white tabular-nums">
                        {rows.length ? (
                          <ul className="space-y-1 list-none m-0 p-0">
                            {rows.map((r) => (
                              <li key={`${r.label}-p`}>{fmt(r.amount, r.currency, i18n.language)}</li>
                            ))}
                          </ul>
                        ) : (
                          dash
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatValidity(offer, i18n.language, dash)}
                      </td>
                      <td className="px-4 py-3 align-middle text-end" onClick={(e) => e.stopPropagation()}>
                        <div className="offer-card-actions justify-end flex-wrap">
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
                              onClick={(e) => {
                                e.stopPropagation()
                                runAction(offer, 'activate', activate)
                              }}
                              disabled={rowBusy(offer.id)}
                              title={t('common.activate', 'Activate')}
                            >
                              {actionOfferId === offer.id && actionKind === 'activate' && mutateLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                          {canManageOffers && offer.status !== 'archived' ? (
                            <button
                              type="button"
                              className="btn btn-outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                runAction(offer, 'archive', archive)
                              }}
                              disabled={rowBusy(offer.id)}
                              title={t('common.archive', 'Archive')}
                            >
                              {actionOfferId === offer.id && actionKind === 'archive' && mutateLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Archive className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
