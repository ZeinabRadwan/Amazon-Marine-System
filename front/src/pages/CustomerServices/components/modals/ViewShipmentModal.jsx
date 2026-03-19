import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function normalizeShipmentStatusKey(statusKey) {
  if (statusKey === 'booked') return 'booking_confirmed'
  return statusKey
}

export function ViewShipmentModal({
  open,
  shipment,
  trackingUpdates = [],
  shipmentStatuses = [],
  loading = false,
  onClose,
  t: tProp,
}) {
  const { t: tI18n, i18n } = useTranslation()
  const t = tProp ?? tI18n
  if (!open) return null
  const displayKey = normalizeShipmentStatusKey(shipment?.status)
  const statusInfo = shipmentStatuses?.find((s) => s?.key === displayKey)
  const isArabicLang = i18n.language === 'ar'
  const statusLabel = statusInfo ? (isArabicLang ? statusInfo.name_ar : statusInfo.name_en) : (displayKey || shipment?.status || '')
  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cs-view-shipment-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box">
        <header className="client-detail-modal__header client-detail-modal__header--detail">
          <div className="client-detail-modal__header-inner">
            <span className="client-detail-modal__header-label">{t('customerServices.tracking.viewShipment')}</span>
            <h2 id="cs-view-shipment-title" className="client-detail-modal__title client-detail-modal__title--client">
              {shipment?.bl_number ?? '—'}
            </h2>
          </div>
          <button type="button" className="client-detail-modal__close" onClick={onClose} aria-label={t('customerServices.close')}>
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <div className="client-detail-modal__body">
          {shipment && (
            <section className="client-detail-modal__section">
              <div className="client-detail-modal__grid client-detail-modal__grid--card">
                <div className="client-detail-modal__row">
                  <span className="client-detail-modal__label">{t('customerServices.tracking.blNumber')}</span>
                  <span className="client-detail-modal__value">{shipment.bl_number ?? '—'}</span>
                </div>
                <div className="client-detail-modal__row">
                  <span className="client-detail-modal__label">{t('customerServices.tracking.client')}</span>
                  <span className="client-detail-modal__value">{shipment.client ?? '—'}</span>
                </div>
                <div className="client-detail-modal__row">
                  <span className="client-detail-modal__label">{t('customerServices.tracking.route')}</span>
                  <span className="client-detail-modal__value">{shipment.route ?? '—'}</span>
                </div>
                <div className="client-detail-modal__row">
                  <span className="client-detail-modal__label">{t('customerServices.tracking.statusCustomerView')}</span>
                  <span className="client-detail-modal__value">{statusLabel || '—'}</span>
                </div>
                <div className="client-detail-modal__row">
                  <span className="client-detail-modal__label">{t('customerServices.tracking.lastUpdate')}</span>
                  <span className="client-detail-modal__value">{shipment.last_update ?? '—'}</span>
                </div>
              </div>
            </section>
          )}
          <section className="client-detail-modal__section">
            <h3 className="client-detail-modal__section-title">{t('customerServices.tracking.updatesHistory')}</h3>
            {loading ? (
              <p className="client-detail-modal__empty">{t('customerServices.loading')}</p>
            ) : trackingUpdates.length === 0 ? (
              <p className="client-detail-modal__empty">{t('customerServices.tracking.noUpdates')}</p>
            ) : (
              <ul className="client-detail-modal__list">
                {trackingUpdates.map((u) => (
                  <li key={u.id} className="client-detail-modal__list-item">
                    <span className="client-detail-modal__list-label">{u.date_time ?? u.created_at ?? '—'}</span>
                    <span className="client-detail-modal__list-value">
                      {u.update_text ?? '—'}
                      {u.created_by?.name ? ` · ${u.created_by.name}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="client-detail-modal__footer">
          <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={onClose}>
            {t('customerServices.close')}
          </button>
        </footer>
      </div>
    </div>
  )
}
