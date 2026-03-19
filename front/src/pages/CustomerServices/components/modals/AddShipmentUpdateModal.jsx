import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function AddShipmentUpdateModal({
  open,
  onClose,
  addUpdateRow,
  addUpdateBl,
  setAddUpdateBl,
  addUpdateText,
  setAddUpdateText,
  onSubmit,
  submitting,
  t: tProp,
}) {
  const { t: tI18n } = useTranslation()
  const t = tProp ?? tI18n
  if (!open) return null
  return (
    <div className="client-detail-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-add-update-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <h2 id="cs-modal-add-update-title" className="client-detail-modal__title">
            {t('customerServices.tracking.modalAddUpdateTitle')}
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
                    <label htmlFor="add-update-bl">{t('customerServices.tracking.blNumber')}</label>
                    <input
                      id="add-update-bl"
                      type="text"
                      value={addUpdateRow?.bl_number ?? addUpdateBl}
                      readOnly={!!addUpdateRow}
                      onChange={addUpdateRow ? undefined : (e) => setAddUpdateBl(e.target.value)}
                      placeholder={addUpdateRow ? undefined : 'BL-2026-XXXX'}
                      disabled={submitting}
                    />
                  </div>
                  <div className="client-detail-modal__form-field client-detail-modal__form-field--full">
                    <label htmlFor="add-update-text">{t('customerServices.tracking.updateText')}</label>
                    <textarea id="add-update-text" rows={3} placeholder={t('customerServices.tracking.updateTextPlaceholder')} value={addUpdateText} onChange={(e) => setAddUpdateText(e.target.value)} disabled={submitting} />
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
              {submitting ? t('customerServices.saving') : t('customerServices.tracking.saveUpdate')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
