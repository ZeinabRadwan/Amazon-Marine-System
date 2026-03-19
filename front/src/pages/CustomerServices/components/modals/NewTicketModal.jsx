import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { TICKET_PRIORITIES } from '../../constants'

export function NewTicketModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  submitting,
  t: tProp,
  ticketTypes = [],
  clients = [],
  users = [],
  clientShipments = [],
  priorities = TICKET_PRIORITIES,
}) {
  const { t: tI18n, i18n } = useTranslation()
  const t = tProp ?? tI18n
  if (!open) return null
  const isRtl = i18n.language === 'ar' || i18n.dir() === 'rtl'
  const typeLabel = (type) => (isRtl && type?.label_ar ? type.label_ar : type?.name ?? '')
  const defaultTicketTypeId = ticketTypes?.[0]?.id ?? 1
  const defaultPriorityId = priorities?.[0]?.id ?? 2

  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-new-ticket-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <h2 id="cs-modal-new-ticket-title" className="client-detail-modal__title">
            {t('customerServices.tickets.modalNewTitle')}
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
                    <label htmlFor="new-ticket-client">{t('customerServices.tickets.clientLabel')}</label>
                    <select
                      id="new-ticket-client"
                      value={form.client_id ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value || '', shipment_id: null }))}
                      required
                      disabled={submitting}
                    >
                      <option value="">{t('customerServices.tickets.clientPlaceholder')}</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="new-ticket-shipment">{t('customerServices.tickets.shipmentOptional')}</label>
                    <select
                      id="new-ticket-shipment"
                      value={form.shipment_id ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, shipment_id: e.target.value ? Number(e.target.value) : null }))}
                      disabled={submitting}
                    >
                      <option value="">—</option>
                      {clientShipments.map((s) => (
                        <option key={s.id} value={s.id}>{s.bl_number ?? `#${s.id}`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="new-ticket-type">{t('customerServices.tickets.type')}</label>
                    <select
                      id="new-ticket-type"
                      value={form.ticket_type_id ?? defaultTicketTypeId}
                      onChange={(e) => setForm((f) => ({ ...f, ticket_type_id: Number(e.target.value) || defaultTicketTypeId }))}
                      disabled={submitting}
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
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="new-ticket-priority">{t('customerServices.tickets.priority')}</label>
                    <select
                      id="new-ticket-priority"
                      value={form.priority_id ?? defaultPriorityId}
                      onChange={(e) => setForm((f) => ({ ...f, priority_id: Number(e.target.value) || defaultPriorityId }))}
                      disabled={submitting}
                    >
                      {priorities.map((p) => (
                        <option key={p.id} value={p.id}>
                          {isRtl && p.label_ar ? p.label_ar : (p?.name ? p.name.charAt(0).toUpperCase() + p.name.slice(1) : '')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="new-ticket-assigned">{t('customerServices.tickets.assignLabel')}</label>
                    <select
                      id="new-ticket-assigned"
                      value={form.assigned_to_id ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, assigned_to_id: e.target.value ? Number(e.target.value) : null }))}
                      disabled={submitting}
                    >
                      <option value="">—</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="new-ticket-subject">{t('customerServices.tickets.subjectLabel')}</label>
                    <input
                      id="new-ticket-subject"
                      type="text"
                      placeholder={t('customerServices.tickets.subjectPlaceholder')}
                      value={form.subject ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="new-ticket-desc">{t('customerServices.tickets.descLabel')}</label>
                    <textarea
                      id="new-ticket-desc"
                      rows={3}
                      placeholder={t('customerServices.tickets.descPlaceholder')}
                      value={form.description ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      disabled={submitting}
                    />
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
              {submitting ? t('customerServices.saving') : t('customerServices.tickets.newTicket')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
