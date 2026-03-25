import { X, Mail, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function SendToClientModal({
  open,
  row,
  onClose,
  sendChannel,
  setSendChannel,
  submitting,
  t: tProp,
}) {
  const { t: tI18n } = useTranslation()
  const t = tProp ?? tI18n

  if (!open || !row) return null

  const clientEmail = row.client_email || ''
  const clientPhone = row.client_phone || ''

  // Clean phone number: remove spaces, dashes, etc. and ensure international format
  const cleanPhone = (phone) => {
    let cleaned = phone.replace(/[\s\-()]/g, '')
    // If it starts with 0, assume Egypt (+20)
    if (cleaned.startsWith('0')) {
      cleaned = '20' + cleaned.slice(1)
    }
    // Remove leading + if present for wa.me link
    cleaned = cleaned.replace(/^\+/, '')
    return cleaned
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (sendChannel === 'whatsapp' && clientPhone) {
      const phone = cleanPhone(clientPhone)
      const message = encodeURIComponent(
        `${t('customerServices.tracking.whatsappGreeting', 'Hello')}, ${row.client}.\n${t('customerServices.tracking.whatsappShipmentRef', 'Regarding shipment')}: ${row.bl_number}`
      )
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
    } else if (sendChannel === 'email' && clientEmail) {
      const subject = encodeURIComponent(
        `${t('customerServices.tracking.emailSubjectPrefix', 'Shipment Update')}: ${row.bl_number}`
      )
      window.open(`mailto:${clientEmail}?subject=${subject}`, '_blank')
    }
    onClose()
  }

  const channelHasContact = sendChannel === 'email' ? !!clientEmail : !!clientPhone

  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-send-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <h2 id="cs-modal-send-title" className="client-detail-modal__title">
            {t('customerServices.tracking.modalSendTitle')}
          </h2>
          <button
            type="button"
            className="client-detail-modal__close"
            onClick={onClose}
            disabled={submitting}
            aria-label={t('customerServices.close')}
          >
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>
        <form onSubmit={handleSend} className="client-detail-modal__form">
          <div className="client-detail-modal__body client-detail-modal__body--form">
            <div className="client-detail-modal__body-inner">
              <section className="client-detail-modal__section">
                <div className="client-detail-modal__form-grid">
                  {/* BL Number */}
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="send-bl">{t('customerServices.tracking.blNumber')}</label>
                    <input id="send-bl" type="text" value={row.bl_number} readOnly disabled={submitting} />
                  </div>

                  {/* Client Name */}
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="send-client">{t('customerServices.tracking.client')}</label>
                    <input id="send-client" type="text" value={row.client} readOnly disabled={submitting} />
                  </div>

                  {/* Send Via — segmented Email / WhatsApp */}
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full send-channel-field">
                    <span id="send-via-label" className="send-channel-field__label">
                      {t('customerServices.tracking.sendVia')}
                    </span>
                    <div
                      className="send-channel-segmented"
                      role="radiogroup"
                      aria-labelledby="send-via-label"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={sendChannel === 'email'}
                        className={`send-channel-option send-channel-option--email ${sendChannel === 'email' ? 'send-channel-option--active' : ''}`}
                        onClick={() => setSendChannel('email')}
                        disabled={submitting}
                      >
                        <span className="send-channel-option__icon-wrap send-channel-option__icon-wrap--email" aria-hidden>
                          <Mail className="send-channel-option__icon" strokeWidth={2} />
                        </span>
                        <span className="send-channel-option__text">
                          <span className="send-channel-option__title">{t('customerServices.tracking.email')}</span>
                          <span className="send-channel-option__hint">{t('customerServices.tracking.sendViaEmailHint')}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={sendChannel === 'whatsapp'}
                        className={`send-channel-option send-channel-option--whatsapp ${sendChannel === 'whatsapp' ? 'send-channel-option--active' : ''}`}
                        onClick={() => setSendChannel('whatsapp')}
                        disabled={submitting}
                      >
                        <span className="send-channel-option__icon-wrap send-channel-option__icon-wrap--whatsapp" aria-hidden>
                          <MessageCircle className="send-channel-option__icon" strokeWidth={2} />
                        </span>
                        <span className="send-channel-option__text">
                          <span className="send-channel-option__title">{t('customerServices.tracking.whatsapp')}</span>
                          <span className="send-channel-option__hint">{t('customerServices.tracking.sendViaWhatsappHint')}</span>
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Contact info display based on channel */}
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label>
                      {sendChannel === 'email'
                        ? t('customerServices.tracking.clientEmail')
                        : t('customerServices.tracking.clientPhone')
                      }
                    </label>
                    <div className="send-contact-display">
                      {sendChannel === 'email' ? (
                        clientEmail ? (
                          <div className="send-contact-value">
                            <Mail className="send-contact-icon send-contact-icon--email" />
                            <span>{clientEmail}</span>
                          </div>
                        ) : (
                          <p className="send-contact-empty">
                            {t('customerServices.tracking.noEmail')}
                          </p>
                        )
                      ) : (
                        clientPhone ? (
                          <div className="send-contact-value">
                            <MessageCircle className="send-contact-icon send-contact-icon--whatsapp" />
                            <span>{clientPhone}</span>
                          </div>
                        ) : (
                          <p className="send-contact-empty">
                            {t('customerServices.tracking.noPhone')}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
          <footer className="client-detail-modal__footer client-detail-modal__footer--form">
            <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={onClose} disabled={submitting}>
              {t('customerServices.cancel')}
            </button>
            <button
              type="submit"
              className={`client-detail-modal__btn client-detail-modal__btn-send-action ${sendChannel === 'whatsapp' ? 'client-detail-modal__btn--whatsapp' : 'client-detail-modal__btn--primary'}`}
              disabled={submitting || !channelHasContact}
            >
              {sendChannel === 'whatsapp' ? (
                <>
                  <MessageCircle className="send-action-icon" aria-hidden />
                  {t('customerServices.tracking.openWhatsapp')}
                </>
              ) : (
                <>
                  <Mail className="send-action-icon" aria-hidden />
                  {t('customerServices.tracking.openEmail')}
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
