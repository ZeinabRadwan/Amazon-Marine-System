import { Bx } from '../BxIcon'

export function AddCommsLogModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  submitting,
  t,
}) {
  if (!open) return null
  return (
    <div className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-comms-title">
      <div className="cs-modal-backdrop" onClick={onClose} />
      <div className="cs-modal-content">
        <div className="cs-modal-header">
          <h2 id="cs-modal-comms-title"><Bx name="bx-chat" className="cs-btn-icon" /> {t('customerServices.comms.modalAddTitle')}</h2>
          <button type="button" className="cs-modal-close" onClick={onClose} aria-label={t('customerServices.close')}><Bx name="bx-x" className="cs-btn-icon" /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="cs-modal-body">
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.comms.commsType')}</label>
              <select className="cs-select" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="call">{t('customerServices.comms.typeCall')}</option>
                <option value="whatsapp">{t('customerServices.comms.typeWhatsapp')}</option>
                <option value="email">{t('customerServices.comms.typeEmail')}</option>
                <option value="meeting">{t('customerServices.comms.typeMeeting')}</option>
                <option value="note">{t('customerServices.comms.typeNote')}</option>
              </select>
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.comms.relatedTo')}</label>
              <select className="cs-select" value={form.related} onChange={(e) => setForm((f) => ({ ...f, related: e.target.value }))}>
                <option value="client">{t('customerServices.comms.relatedClient')}</option>
                <option value="shipment">{t('customerServices.comms.relatedShipment')}</option>
                <option value="ticket">{t('customerServices.comms.relatedTicket')}</option>
              </select>
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.comms.refLabel')}</label>
              <input type="text" className="cs-input" placeholder={t('customerServices.comms.refPlaceholder')} value={form.ref} onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))} />
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.comms.subjectSummary')}</label>
              <input type="text" className="cs-input" placeholder={t('customerServices.comms.subjectPlaceholder')} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="cs-form-section">
              <div className="cs-form-group">
                <label className="cs-form-label">{t('customerServices.comms.clientSaid')}</label>
                <textarea className="cs-input" rows={2} placeholder={t('customerServices.comms.clientSaidPlaceholder')} value={form.client_said} onChange={(e) => setForm((f) => ({ ...f, client_said: e.target.value }))} />
              </div>
              <div className="cs-form-group">
                <label className="cs-form-label">{t('customerServices.comms.issue')}</label>
                <textarea className="cs-input" rows={2} placeholder={t('customerServices.comms.issuePlaceholder')} value={form.issue} onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))} />
              </div>
              <div className="cs-form-group">
                <label className="cs-form-label">{t('customerServices.comms.replyAction')}</label>
                <textarea className="cs-input" rows={2} placeholder={t('customerServices.comms.replyActionPlaceholder')} value={form.reply} onChange={(e) => setForm((f) => ({ ...f, reply: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="cs-modal-footer">
            <button type="button" className="cs-btn cs-btn-outline" onClick={onClose} disabled={submitting}>{t('customerServices.cancel')}</button>
            <button type="submit" className="cs-btn cs-btn-primary" disabled={submitting}><Bx name="bx-check" className="cs-btn-icon" /> {submitting ? t('customerServices.saving') : t('customerServices.save')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
