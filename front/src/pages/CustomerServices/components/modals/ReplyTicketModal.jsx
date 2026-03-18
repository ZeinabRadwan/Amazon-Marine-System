import { Bx } from '../BxIcon'
import { TICKET_STATUS_KEYS } from '../../constants'

export function ReplyTicketModal({
  open,
  ticket,
  onClose,
  replyForm,
  setReplyForm,
  onSubmit,
  onCloseTicket,
  onDeleteTicket,
  submitting,
  t,
  ticketStatusKey,
}) {
  if (!open || !ticket) return null
  return (
    <div className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-reply-title">
      <div className="cs-modal-backdrop" onClick={onClose} />
      <div className="cs-modal-content">
        <div className="cs-modal-header">
          <h2 id="cs-modal-reply-title"><Bx name="bx-reply" className="cs-btn-icon" /> {t('customerServices.tickets.modalReplyTitle')}</h2>
          <button type="button" className="cs-modal-close" onClick={onClose} aria-label={t('customerServices.close')}><Bx name="bx-x" className="cs-btn-icon" /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="cs-modal-body">
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tickets.replyTicket')}</label>
              <input type="text" className="cs-input" value={ticket.ticket_number} readOnly />
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tickets.currentStatus')}</label>
              <input type="text" className="cs-input" value={t(ticketStatusKey(ticket.status))} readOnly />
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tickets.sendReply')}</label>
              <textarea className="cs-input" rows={4} placeholder={t('customerServices.tickets.replyPlaceholder')} value={replyForm.text} onChange={(e) => setReplyForm((f) => ({ ...f, text: e.target.value }))} />
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tickets.updateStatusLabel')}</label>
              <select className="cs-select" value={replyForm.status} onChange={(e) => setReplyForm((f) => ({ ...f, status: e.target.value }))}>
                {Object.entries(TICKET_STATUS_KEYS).map(([value, key]) => (
                  <option key={value} value={value}>{t(key)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="cs-modal-footer">
            <button type="button" className="cs-btn cs-btn-outline" onClick={onClose} disabled={submitting}>{t('customerServices.cancel')}</button>
            {onDeleteTicket && (
              <button type="button" className="cs-btn cs-btn-outline cs-btn-danger" onClick={() => ticket && onDeleteTicket(ticket.id)} disabled={submitting}>{t('customerServices.delete')}</button>
            )}
            <button type="submit" className="cs-btn cs-btn-outline" disabled={submitting}><Bx name="bx-send" className="cs-btn-icon" /> {t('customerServices.tickets.sendReply')}</button>
            <button type="button" className="cs-btn cs-btn-primary" onClick={onCloseTicket} disabled={submitting}><Bx name="bx-check-circle" className="cs-btn-icon" /> {t('customerServices.tickets.closeTicket')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
