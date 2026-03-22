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
  ticketStatusLabel,
  formatDateTime,
}) {
  const { t: tI18n } = useTranslation()
  const t = tProp ?? tI18n
  const fmt = formatDateTime ?? ((d) => (d ? String(d) : '—'))

  if (!open || !ticket) return null

  const replies = Array.isArray(ticket.replies) ? ticket.replies : []

  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-reply-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form client-detail-modal__box--reply-ticket">
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
                    <input id="reply-status" type="text" value={ticketStatusLabel?.(ticket.status) ?? ticket.status} readOnly disabled />
                  </div>
                </div>
              </section>

              <section className="client-detail-modal__section cs-ticket-thread" aria-label={t('customerServices.tickets.conversationHistory', 'Conversation')}>
                <h3 className="cs-ticket-thread__heading">{t('customerServices.tickets.conversationHistory', 'Conversation')}</h3>
                <div className="cs-ticket-thread__list">
                  <article className="cs-ticket-thread__item cs-ticket-thread__item--original">
                    <header className="cs-ticket-thread__meta">
                      <span className="cs-ticket-thread__badge">{t('customerServices.tickets.originalMessage', 'Original')}</span>
                      <span className="cs-ticket-thread__author">{ticket.created_by_name ?? '—'}</span>
                      <time className="cs-ticket-thread__time" dateTime={ticket.created_at ?? undefined}>{fmt(ticket.created_at)}</time>
                    </header>
                    {ticket.subject ? <p className="cs-ticket-thread__subject">{ticket.subject}</p> : null}
                    {ticket.description ? (
                      <p className="cs-ticket-thread__body">{ticket.description}</p>
                    ) : (
                      <p className="cs-ticket-thread__body cs-ticket-thread__body--muted">{t('customerServices.tickets.noDescription', 'No description.')}</p>
                    )}
                  </article>
                  {replies.map((r) => (
                    <article key={r.id} className="cs-ticket-thread__item">
                      <header className="cs-ticket-thread__meta">
                        <span className="cs-ticket-thread__badge">{t('customerServices.tickets.replyLabel', 'Reply')}</span>
                        <span className="cs-ticket-thread__author">{r.author ?? '—'}</span>
                        <time className="cs-ticket-thread__time" dateTime={r.created_at ?? undefined}>{fmt(r.created_at)}</time>
                      </header>
                      <p className="cs-ticket-thread__body">{r.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="client-detail-modal__section">
                <div className="client-detail-modal__form-grid">
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="reply-text">{t('customerServices.tickets.yourReply', 'Your reply')}</label>
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
