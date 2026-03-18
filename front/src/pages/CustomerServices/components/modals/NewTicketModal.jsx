import { Bx } from '../BxIcon'
import { TICKET_PRIORITIES } from '../../constants'

export function NewTicketModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  submitting,
  t,
  ticketTypes = [],
  clients = [],
  users = [],
  clientShipments = [],
  priorities = TICKET_PRIORITIES,
}) {
  if (!open) return null
  const isRtl = document.documentElement.dir === 'rtl'
  const typeLabel = (type) => (isRtl && type?.label_ar ? type.label_ar : type?.name ?? '')

  return (
    <div className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-new-ticket-title">
      <div className="cs-modal-backdrop" onClick={onClose} />
      <div className="cs-modal-content">
        <div className="cs-modal-header">
          <h2 id="cs-modal-new-ticket-title"><Bx name="bx-plus" className="cs-btn-icon" /> {t('customerServices.tickets.modalNewTitle')}</h2>
          <button type="button" className="cs-modal-close" onClick={onClose} aria-label={t('customerServices.close')}><Bx name="bx-x" className="cs-btn-icon" /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="cs-modal-body">
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tickets.clientLabel')}</label>
              <select
                className="cs-select"
                value={form.client_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value || '', shipment_id: null }))}
                required
              >
                <option value="">{t('customerServices.tickets.clientPlaceholder')}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                ))}
              </select>
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tickets.shipmentOptional')}</label>
              <select
                className="cs-select"
                value={form.shipment_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, shipment_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">—</option>
                {clientShipments.map((s) => (
                  <option key={s.id} value={s.id}>{s.bl_number ?? `#${s.id}`}</option>
                ))}
              </select>
            </div>
            <div className="cs-form-row">
              <div className="cs-form-group">
                <label className="cs-form-label">{t('customerServices.tickets.type')}</label>
                <select
                  className="cs-select"
                  value={form.ticket_type_id ?? 1}
                  onChange={(e) => setForm((f) => ({ ...f, ticket_type_id: Number(e.target.value) || 1 }))}
                >
                  {ticketTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>{typeLabel(tt)}</option>
                  ))}
                  {ticketTypes.length === 0 && (
                    <>
                      <option value={1}>{t('customerServices.tickets.typeInquiry')}</option>
                      <option value={2}>{t('customerServices.tickets.typeComplaint')}</option>
                      <option value={3}>{t('customerServices.tickets.typeRequest')}</option>
                    </>
                  )}
                </select>
              </div>
              <div className="cs-form-group">
                <label className="cs-form-label">{t('customerServices.tickets.priority')}</label>
                <select
                  className="cs-select"
                  value={form.priority_id ?? 2}
                  onChange={(e) => setForm((f) => ({ ...f, priority_id: Number(e.target.value) || 2 }))}
                >
                  {priorities.map((p) => (
                    <option key={p.id} value={p.id}>{isRtl && p.label_ar ? p.label_ar : t(`customerServices.tickets.priority${p.name.charAt(0).toUpperCase() + p.name.slice(1)}`)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tickets.assignLabel')}</label>
              <select
                className="cs-select"
                value={form.assigned_to_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">—</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tickets.subjectLabel')}</label>
              <input
                type="text"
                className="cs-input"
                placeholder={t('customerServices.tickets.subjectPlaceholder')}
                value={form.subject ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                required
              />
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tickets.descLabel')}</label>
              <textarea
                className="cs-input"
                rows={3}
                placeholder={t('customerServices.tickets.descPlaceholder')}
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="cs-modal-footer">
            <button type="button" className="cs-btn cs-btn-outline" onClick={onClose} disabled={submitting}>{t('customerServices.cancel')}</button>
            <button type="submit" className="cs-btn cs-btn-primary" disabled={submitting}><Bx name="bx-check" className="cs-btn-icon" /> {submitting ? t('customerServices.saving') : t('customerServices.tickets.newTicket')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
