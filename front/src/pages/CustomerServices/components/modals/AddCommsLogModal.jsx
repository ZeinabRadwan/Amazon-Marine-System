import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AddCommsLogModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  submitting,
  t: tProp,
  clients = [],
  commsTypes = [],
}) {
  const { t: tI18n, i18n } = useTranslation()
  const t = tProp ?? tI18n
  if (!open) return null
  const isRtl = i18n.language === 'ar' || i18n.dir() === 'rtl'
  const typeLabel = (type) => {
    if (isRtl && type?.label_ar) return type.label_ar
    return type?.name ?? ''
  }
  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-comms-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <h2 id="cs-modal-comms-title" className="client-detail-modal__title">
            {t('customerServices.comms.modalAddTitle')}
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
                    <label htmlFor="comms-client">{t('customerServices.comms.relatedClient')} / {t('customerServices.tracking.client')}</label>
                    <select
                      id="comms-client"
                      value={form.client_id}
                      onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                      required
                      disabled={submitting}
                    >
                      <option value="">{t('customerServices.tickets.clientPlaceholder') || '— Select client —'}</option>
                      {(clients || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.company_name || c.name || c.client_name || `#${c.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="comms-type">{t('customerServices.comms.commsType')}</label>
                    <select id="comms-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} disabled={submitting}>
                      {(commsTypes || []).map((ct) => (
                        <option key={ct.id} value={ct.name}>{typeLabel(ct)}</option>
                      ))}
                      {(commsTypes || []).length === 0 && (
                        <>
                          <option value="call">{t('customerServices.comms.typeCall')}</option>
                          <option value="whatsapp">{t('customerServices.comms.typeWhatsapp')}</option>
                          <option value="email">{t('customerServices.comms.typeEmail')}</option>
                          <option value="meeting">{t('customerServices.comms.typeMeeting')}</option>
                          <option value="note">{t('customerServices.comms.typeNote')}</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="comms-related">{t('customerServices.comms.relatedTo')}</label>
                    <select id="comms-related" value={form.related} onChange={(e) => setForm((f) => ({ ...f, related: e.target.value }))} disabled={submitting}>
                      <option value="client">{t('customerServices.comms.relatedClient')}</option>
                      <option value="shipment">{t('customerServices.comms.relatedShipment')}</option>
                      <option value="ticket">{t('customerServices.comms.relatedTicket')}</option>
                    </select>
                  </div>
                  <div className="client-detail-modal__form-field">
                    <label htmlFor="comms-ref">{t('customerServices.comms.refLabel')}</label>
                    <input id="comms-ref" type="text" placeholder={t('customerServices.comms.refPlaceholder')} value={form.ref} onChange={(e) => setForm((f) => ({ ...f, ref: e.target.value }))} disabled={submitting} />
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="comms-subject">{t('customerServices.comms.subjectSummary')}</label>
                    <input id="comms-subject" type="text" placeholder={t('customerServices.comms.subjectPlaceholder')} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} disabled={submitting} />
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="comms-client-said">{t('customerServices.comms.clientSaid')}</label>
                    <textarea id="comms-client-said" rows={2} placeholder={t('customerServices.comms.clientSaidPlaceholder')} value={form.client_said} onChange={(e) => setForm((f) => ({ ...f, client_said: e.target.value }))} disabled={submitting} />
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="comms-issue">{t('customerServices.comms.issue')}</label>
                    <textarea id="comms-issue" rows={2} placeholder={t('customerServices.comms.issuePlaceholder')} value={form.issue} onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))} disabled={submitting} />
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="comms-reply">{t('customerServices.comms.replyAction')}</label>
                    <textarea id="comms-reply" rows={2} placeholder={t('customerServices.comms.replyActionPlaceholder')} value={form.reply} onChange={(e) => setForm((f) => ({ ...f, reply: e.target.value }))} disabled={submitting} />
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
              {submitting ? t('customerServices.saving') : t('customerServices.save')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
