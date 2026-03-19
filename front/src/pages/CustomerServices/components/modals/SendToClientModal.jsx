import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function SendToClientModal({
  open,
  row,
  onClose,
  sendChannel,
  setSendChannel,
  sendTemplate,
  setSendTemplate,
  sendMessage,
  setSendMessage,
  onSubmit,
  submitting,
  shipmentStatuses = [],
  t: tProp,
}) {
  const { t: tI18n, i18n } = useTranslation()
  const t = tProp ?? tI18n
  if (!open || !row) return null
  const isArabicLang = i18n.language === 'ar'
  const activeStatuses = (shipmentStatuses || []).filter((s) => s?.active !== false)
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
        <form onSubmit={onSubmit} className="client-detail-modal__form">
          <div className="client-detail-modal__body client-detail-modal__body--form">
            <div className="client-detail-modal__body-inner">
              <section className="client-detail-modal__section">
                <div className="client-detail-modal__form-grid">
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="send-bl">{t('customerServices.tracking.blNumber')}</label>
                    <input id="send-bl" type="text" value={row.bl_number} readOnly disabled={submitting} />
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="send-client">{t('customerServices.tracking.client')}</label>
                    <input id="send-client" type="text" value={row.client} readOnly disabled={submitting} />
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label>{t('customerServices.tracking.sendVia')}</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', paddingTop: 4 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                        <input type="radio" name="sendChannel" value="email" checked={sendChannel === 'email'} onChange={() => setSendChannel('email')} disabled={submitting} />
                        {t('customerServices.tracking.email')}
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                        <input type="radio" name="sendChannel" value="whatsapp" checked={sendChannel === 'whatsapp'} onChange={() => setSendChannel('whatsapp')} disabled={submitting} />
                        {t('customerServices.tracking.whatsapp')}
                      </label>
                    </div>
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="send-template">{t('customerServices.tracking.template')}</label>
                    <select id="send-template" value={sendTemplate} onChange={(e) => { setSendTemplate(e.target.value); setSendMessage('') }} disabled={submitting}>
                      <option value="">{t('customerServices.tracking.templatePlaceholder')}</option>
                      {activeStatuses.map((s) => (
                        <option key={s.key} value={s.key}>{isArabicLang ? s.name_ar : s.name_en}</option>
                      ))}
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="send-message">{t('customerServices.tracking.messageLabel')}</label>
                    <textarea id="send-message" rows={4} placeholder={t('customerServices.tracking.messagePlaceholder')} value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} disabled={submitting} />
                  </div>
                </div>
              </section>
            </div>
          </div>
          <footer className="client-detail-modal__footer client-detail-modal__footer--form">
            <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={onClose} disabled={submitting}>
              {t('customerServices.cancel')}
            </button>
            <button type="submit" className="client-detail-modal__btn client-detail-modal__btn--primary" disabled={submitting}>
              {submitting ? t('customerServices.saving') : t('customerServices.tracking.send')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
