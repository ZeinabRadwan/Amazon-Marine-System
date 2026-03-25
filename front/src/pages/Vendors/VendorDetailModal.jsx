import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import Tabs from '../../components/Tabs'
import VisitStatusBadge from '../Visits/VisitStatusBadge'
import '../Clients/Clients.css'
import '../Clients/ClientDetailModal.css'
import { getVendorTypeBadgeVariant } from './vendorTypeHelpers'

function formatVisitDate(value, locale) {
  if (value == null || value === '') return '—'
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export default function VendorDetailModal({
  open,
  vendor,
  vendorLoading,
  detailTab,
  onTabChange,
  onClose,
  onEdit,
  visits = [],
  visitsLoading = false,
}) {
  const { t, i18n } = useTranslation()

  if (!open) return null

  const tabs = [
    { id: 'info', label: t('vendors.tabs.info', 'Info') },
    { id: 'visits', label: t('vendors.tabs.visits', 'Visits') },
  ]

  const typeLabel = vendor?.type ? t(`vendors.types.${vendor.type}`, vendor.type) : '—'

  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="vendor-detail-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box">
        <header className="client-detail-modal__header client-detail-modal__header--detail">
          <div className="client-detail-modal__header-inner">
            <span className="client-detail-modal__header-label">{t('vendors.detail', 'Vendor')}</span>
            <h2 id="vendor-detail-title" className="client-detail-modal__title client-detail-modal__title--client">
              {vendorLoading ? '…' : (vendor?.name ?? '—')}
            </h2>
            {!vendorLoading && vendor?.type && (
              <p className="client-detail-modal__subtitle">
                <span
                  className={`clients-status-badge clients-status-badge--${getVendorTypeBadgeVariant(vendor.type)}`}
                  title={typeLabel}
                >
                  {typeLabel}
                </span>
              </p>
            )}
          </div>
          <button type="button" className="client-detail-modal__close" onClick={onClose} aria-label={t('vendors.close')}>
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <Tabs tabs={tabs} activeTab={detailTab} onChange={onTabChange} className="client-detail-modal__tabs" />

        <div className="client-detail-modal__body" role="tabpanel">
          {detailTab === 'info' && (
            <section className="client-detail-modal__section client-detail-modal__section--info">
              {vendorLoading || !vendor ? (
                <p className="client-detail-modal__empty">{t('vendors.loading')}</p>
              ) : (
                <div className="client-detail-modal__info-tab">
                  <div className="client-detail-modal__info-group">
                    <h3 className="client-detail-modal__info-group-title">{t('vendors.sections.basic')}</h3>
                    <div className="client-detail-modal__grid client-detail-modal__grid--info">
                      {[
                        ['name', vendor.name],
                        ['type', typeLabel],
                        ['email', vendor.email],
                        ['phone', vendor.phone],
                      ].map(([key, val]) => (
                        <div key={key} className="client-detail-modal__row">
                          <span className="client-detail-modal__label">{t(`vendors.fields.${key}`)}</span>
                          <span className="client-detail-modal__value">
                            {key === 'type' && vendor?.type ? (
                              <span
                                className={`clients-status-badge clients-status-badge--${getVendorTypeBadgeVariant(vendor.type)}`}
                                title={typeLabel}
                              >
                                {typeLabel}
                              </span>
                            ) : (
                              (val ?? '').toString().trim() || '—'
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="client-detail-modal__info-group">
                    <h3 className="client-detail-modal__info-group-title">{t('vendors.sections.location')}</h3>
                    <div className="client-detail-modal__grid client-detail-modal__grid--info">
                      {[
                        ['city', vendor.city],
                        ['country', vendor.country],
                        ['address', vendor.address],
                      ].map(([key, val]) => (
                        <div key={key} className="client-detail-modal__row">
                          <span className="client-detail-modal__label">{t(`vendors.fields.${key}`)}</span>
                          <span className="client-detail-modal__value">{(val ?? '').toString().trim() || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="client-detail-modal__info-group">
                    <h3 className="client-detail-modal__info-group-title">{t('vendors.sections.other')}</h3>
                    <div className="client-detail-modal__grid client-detail-modal__grid--info">
                      <div className="client-detail-modal__row">
                        <span className="client-detail-modal__label">{t('vendors.fields.payment_terms')}</span>
                        <span className="client-detail-modal__value">{vendor.payment_terms?.trim() || '—'}</span>
                      </div>
                      <div className="client-detail-modal__row">
                        <span className="client-detail-modal__label">{t('vendors.fields.notes')}</span>
                        <span className="client-detail-modal__value whitespace-pre-wrap">{vendor.notes?.trim() || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {detailTab === 'visits' && (
            <section className="client-detail-modal__section">
              <h3 className="client-detail-modal__section-title">{t('vendors.tabs.visits')}</h3>
              {visitsLoading ? (
                <p className="client-detail-modal__empty">{t('vendors.visitsLoading')}</p>
              ) : visits.length === 0 ? (
                <p className="client-detail-modal__empty">{t('vendors.noVisits')}</p>
              ) : (
                <ul className="client-detail-modal__list">
                  {visits.map((v) => (
                    <li key={v.id ?? v.visit_date} className="client-detail-modal__list-item client-detail-modal__list-item--visit">
                      <div className="client-detail-modal__list-label client-detail-modal__visit-date">
                        <span className="client-detail-modal__visit-date-main">
                          {formatVisitDate(v.visit_date ?? v.date, i18n.language)}
                        </span>
                        {(v.user_name || v.user?.name) && (
                          <span className="client-detail-modal__visit-user">{v.user_name ?? v.user?.name}</span>
                        )}
                        <span className="client-detail-modal__visit-status-badge">
                          <VisitStatusBadge status={v.status} t={t} />
                        </span>
                      </div>
                      <div className="client-detail-modal__list-value client-detail-modal__visit-body">
                        <div className="client-detail-modal__visit-subject">{v.subject?.trim() || '—'}</div>
                        {v.purpose?.trim() ? <div className="client-detail-modal__visit-purpose">{v.purpose}</div> : null}
                        {v.notes?.trim() ? <div className="client-detail-modal__visit-notes">{v.notes}</div> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <footer className="client-detail-modal__footer">
          <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={onClose}>
            {t('vendors.close')}
          </button>
          {!vendorLoading && vendor && (
            <button type="button" className="client-detail-modal__btn client-detail-modal__btn--primary" onClick={() => onEdit(vendor)}>
              {t('vendors.edit')}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
