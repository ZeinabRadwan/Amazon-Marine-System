import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Archive, Loader2, FilePlus2, Eye, Pencil } from 'lucide-react'
import { useMutateOffer } from '../../../hooks/usePricing'
import { IconActionButton, IconActionButtonGroup } from '../../../components/Table'
import { formatDate, formatLocaleMoney, sortCurrencyCodes, sumPricingObjectByCurrency } from '../../../utils/dateUtils'
import {
  PRICING_RATES_TABLE_CLASS,
  PRICING_RATES_TABLE_WRAP_CLASS,
  SEA_PRICE_KEYS,
  formatSailingDates,
  seaContainerSummary,
} from '../utils/pricingDisplay'
import '../Pricing.css'
import './OfferCard.css'

function fmt(price, currency, language) {
  return formatLocaleMoney(price, currency, language)
}

export default function SeaFreightOffersTable({
  offers = [],
  loading = false,
  onView,
  onCreateQuotation,
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
    <div className={PRICING_RATES_TABLE_WRAP_CLASS}>
      <div className="overflow-x-auto">
        <table className={PRICING_RATES_TABLE_CLASS}>
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.route', 'Route')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.shippingLine', 'Carrier')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.containerType', 'Container')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.seaTableColSpotRates', 'Spot rates')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.seaTableColValiditySailing', 'Validity / sailings')}
              </th>
              <th scope="col" className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                {t('pricing.tableColApproxTotal', 'Approx. total')}
              </th>
              <th
                scope="col"
                className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300 text-end whitespace-nowrap min-w-[12rem] w-[12rem]"
              >
                {t('pricing.inlandColActions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : offers.map((offer) => {
                  const p = offer.pricing || {}
                  const archived = offer.status === 'archived'
                  const sailingStr = formatSailingDates(offer.sailing_dates, i18n.language)
                  const validStr = offer.valid_to ? formatDate(offer.valid_to, { locale: i18n.language }) : ''
                  const approx = sumPricingObjectByCurrency(p, SEA_PRICE_KEYS)
                  const totalKeys = sortCurrencyCodes(Object.keys(approx).filter((c) => Math.abs(approx[c] || 0) > 1e-9))
                  const of20s = p.of20?.price != null ? fmt(p.of20.price, p.of20.currency, i18n.language) : null
                  const of20rfs = p.of20rf?.price != null ? fmt(p.of20rf.price, p.of20rf.currency, i18n.language) : null
                  const of40s = p.of40?.price != null ? fmt(p.of40.price, p.of40.currency, i18n.language) : null
                  const of40rfs = p.of40rf?.price != null ? fmt(p.of40rf.price, p.of40rf.currency, i18n.language) : null

                  const containerSummary = seaContainerSummary(p, t)
                  return (
                    <tr
                      key={offer.id}
                      className={`pricing-rates-table__row ${archived ? 'opacity-70' : ''}`}
                    >
                      <td className="px-4 py-3 align-top font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {(offer.pol || dash)} → {(offer.pod || offer.region || dash)}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-800 dark:text-gray-200">
                        {offer.shipping_line ? (
                          <span className="pricing-table-badge pricing-table-badge--carrier">{offer.shipping_line}</span>
                        ) : (
                          dash
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-300 text-xs">
                        {containerSummary !== dash ? (
                          <span className="pricing-table-badge pricing-table-badge--muted">{containerSummary}</span>
                        ) : (
                          dash
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-800 dark:text-gray-200">
                        <ul className="space-y-1 list-none m-0 p-0 text-xs">
                          {of20s ? (
                            <li>
                              <span className="font-semibold text-gray-500 dark:text-gray-400">{t('pricing.priceChipOf20Dc')}:</span> {of20s}
                            </li>
                          ) : null}
                          {of20rfs ? (
                            <li>
                              <span className="font-semibold text-gray-500 dark:text-gray-400">{t('pricing.priceChipOf20Rf')}:</span> {of20rfs}
                            </li>
                          ) : null}
                          {of40s ? (
                            <li>
                              <span className="font-semibold text-gray-500 dark:text-gray-400">{t('pricing.priceChipOf40Hq')}:</span> {of40s}
                            </li>
                          ) : null}
                          {of40rfs ? (
                            <li>
                              <span className="font-semibold text-gray-500 dark:text-gray-400">{t('pricing.priceChipOf40Rf')}:</span> {of40rfs}
                            </li>
                          ) : null}
                          {!of20s && !of20rfs && !of40s && !of40rfs ? <li className="text-gray-400">{dash}</li> : null}
                        </ul>
                      </td>
                      <td className="px-4 py-3 align-top text-gray-700 dark:text-gray-300 text-xs whitespace-pre-wrap">
                        {validStr ? (
                          <>
                            <span className="pricing-table-badge pricing-table-badge--validity mb-1 inline-flex">
                              {t('pricing.validTo', 'Valid until')}: {validStr}
                            </span>
                            {'\n'}
                          </>
                        ) : null}
                        <span className="font-semibold text-gray-500 dark:text-gray-400">{t('pricing.sailings', 'Sailings')}:</span> {sailingStr}
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-gray-900 dark:text-white">
                        <div className="flex flex-col gap-0.5">
                          {totalKeys.length
                            ? totalKeys.map((cur) => (
                                <span key={cur} className="pricing-money-total">
                                  {formatLocaleMoney(approx[cur], cur, i18n.language)}
                                </span>
                              ))
                            : dash}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-end min-w-[12rem]" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex justify-end max-w-full">
                          <IconActionButtonGroup
                            className="justify-end"
                            aria-label={t('pricing.inlandColActions', 'Actions')}
                          >
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
                                  actionOfferId === offer.id && actionKind === 'activate' && mutateLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )
                                }
                                label={t('common.activate', 'Activate')}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  runAction(offer, 'activate', activate)
                                }}
                                disabled={rowBusy(offer.id)}
                              />
                            ) : null}
                            {canManageOffers && offer.status !== 'archived' ? (
                              <IconActionButton
                                icon={
                                  actionOfferId === offer.id && actionKind === 'archive' && mutateLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Archive className="h-4 w-4" />
                                  )
                                }
                                label={t('common.archive', 'Archive')}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  runAction(offer, 'archive', archive)
                                }}
                                disabled={rowBusy(offer.id)}
                              />
                            ) : null}
                          </IconActionButtonGroup>
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
