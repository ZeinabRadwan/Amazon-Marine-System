import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function commsTypeDisplay(log, lang) {
  const ty = log?.type
  if (!ty) return '—'
  if (lang === 'ar' && ty.label_ar) return ty.label_ar
  if (ty.label_en) return ty.label_en
  return ty.name ?? '—'
}

function fieldText(v) {
  if (v == null) return ''
  const s = String(v).trim()
  return s
}

export function ViewCommsLogModal({ open, log, loading, error, formatDateTime, onClose, t: tProp }) {
  const { t: tI18n, i18n } = useTranslation()
  const t = tProp ?? tI18n
  const lang = i18n.language === 'ar' ? 'ar' : 'en'

  if (!open) return null

  const clientName = log?.client ? log.client.company_name || log.client.name : null
  const shipmentBl = log?.shipment?.bl_number
  const ticketNo = log?.ticket?.ticket_number
  const agentName = log?.created_by?.name ?? log?.createdBy?.name

  const renderLong = (label, value) => {
    const text = fieldText(value)
    return (
      <div className="cs-comms-detail__field">
        <span className="client-detail-modal__label">{label}</span>
        {text ? (
          <div className="cs-comms-detail__text whitespace-pre-wrap">{value}</div>
        ) : (
          <span className="cs-comms-detail__empty">—</span>
        )}
      </div>
    )
  }

  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-comms-view-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <h2 id="cs-modal-comms-view-title" className="client-detail-modal__title">
            {t('customerServices.comms.modalViewTitle')}
          </h2>
          <button type="button" className="client-detail-modal__close" onClick={onClose} aria-label={t('customerServices.close')}>
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <div className="client-detail-modal__body client-detail-modal__body--form">
          <div className="client-detail-modal__body-inner">
            {loading && <p className="client-detail-modal__empty">{t('customerServices.loading')}</p>}
            {!loading && error && <p className="client-detail-modal__empty text-red-600 dark:text-red-400">{error}</p>}
            {!loading && !error && log && (
              <section className="client-detail-modal__section">
                <div className="client-detail-modal__grid client-detail-modal__grid--card">
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('customerServices.comms.logId')}</span>
                    <span className="client-detail-modal__value">#{log.id}</span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('customerServices.comms.commsType')}</span>
                    <span className="client-detail-modal__value">{commsTypeDisplay(log, lang)}</span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('customerServices.comms.occurredAt')}</span>
                    <span className="client-detail-modal__value">
                      {log.occurred_at ? formatDateTime?.(log.occurred_at) ?? String(log.occurred_at) : '—'}
                    </span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('customerServices.fields.created_at')}</span>
                    <span className="client-detail-modal__value">
                      {log.created_at ? formatDateTime?.(log.created_at) ?? String(log.created_at) : '—'}
                    </span>
                  </div>
                  <div className="client-detail-modal__row">
                    <span className="client-detail-modal__label">{t('customerServices.comms.agent')}</span>
                    <span className="client-detail-modal__value">{agentName ?? '—'}</span>
                  </div>
                </div>

                <h3 className="client-detail-modal__section-title cs-comms-detail__subtitle">{t('customerServices.comms.relatedTo')}</h3>
                <div className="client-detail-modal__grid client-detail-modal__grid--card">
                  {clientName && (
                    <div className="client-detail-modal__row">
                      <span className="client-detail-modal__label">{t('customerServices.comms.relatedClient')}</span>
                      <span className="client-detail-modal__value">{clientName}</span>
                    </div>
                  )}
                  {shipmentBl && (
                    <div className="client-detail-modal__row">
                      <span className="client-detail-modal__label">{t('customerServices.comms.relatedShipment')}</span>
                      <span className="client-detail-modal__value">{shipmentBl}</span>
                    </div>
                  )}
                  {ticketNo && (
                    <div className="client-detail-modal__row">
                      <span className="client-detail-modal__label">{t('customerServices.comms.relatedTicket')}</span>
                      <span className="client-detail-modal__value">{ticketNo}</span>
                    </div>
                  )}
                  {!clientName && !shipmentBl && !ticketNo && (
                    <div className="client-detail-modal__row">
                      <span className="client-detail-modal__value cs-comms-detail__empty">—</span>
                    </div>
                  )}
                </div>

                <h3 className="client-detail-modal__section-title cs-comms-detail__subtitle">{t('customerServices.comms.detailContent')}</h3>
                <div className="cs-comms-detail__content">
                  {renderLong(t('customerServices.comms.subjectSummary'), log.subject)}
                  {renderLong(t('customerServices.comms.clientSaid'), log.client_said)}
                  {renderLong(t('customerServices.comms.issue'), log.issue)}
                  {renderLong(t('customerServices.comms.replyAction'), log.reply)}
                </div>
              </section>
            )}
            {!loading && !error && !log && <p className="client-detail-modal__empty">{t('customerServices.empty')}</p>}
          </div>
        </div>

        <footer className="client-detail-modal__footer client-detail-modal__footer--form">
          <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={onClose}>
            {t('customerServices.close')}
          </button>
        </footer>
      </div>
    </div>
  )
}
