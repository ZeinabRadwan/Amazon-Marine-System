import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ReplyTicketModal({
  open,
  ticket,
  onClose,
  replyForm,
  setReplyForm,
  onSubmit,
  submitting,
  t: tProp,
  ticketStatusKey,
}) {
  const { t: tI18n } = useTranslation()
  const t = tProp ?? tI18n
  if (!open || !ticket) return null
  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-reply-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <h2 id="cs-modal-reply-title" className="client-detail-modal__title">
            {t('customerServices.tickets.modalReplyTitle')}
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
                    <label htmlFor="reply-ticket-number">{t('customerServices.tickets.replyTicket')}</label>
                    <input id="reply-ticket-number" type="text" value={ticket.ticket_number} readOnly disabled />
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="reply-status">{t('customerServices.tickets.currentStatus')}</label>
                    <input id="reply-status" type="text" value={t(ticketStatusKey(ticket.status))} readOnly disabled />
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="reply-text">{t('customerServices.tickets.sendReply')}</label>
                    <textarea id="reply-text" rows={4} placeholder={t('customerServices.tickets.replyPlaceholder')} value={replyForm.text} onChange={(e) => setReplyForm((f) => ({ ...f, text: e.target.value }))} disabled={submitting} />
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
              {t('customerServices.tickets.sendReply')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
