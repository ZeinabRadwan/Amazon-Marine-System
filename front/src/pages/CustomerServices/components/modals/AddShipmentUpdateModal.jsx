import { Bx } from '../BxIcon'

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
  t,
}) {
  if (!open) return null
  return (
    <div className="cs-modal" role="dialog" aria-modal="true" aria-labelledby="cs-modal-add-update-title">
      <div className="cs-modal-backdrop" onClick={onClose} />
      <div className="cs-modal-content">
        <div className="cs-modal-header">
          <h2 id="cs-modal-add-update-title"><Bx name="bx-edit" className="cs-btn-icon" /> {t('customerServices.tracking.modalAddUpdateTitle')}</h2>
          <button type="button" className="cs-modal-close" onClick={onClose} aria-label={t('customerServices.close')}>
            <Bx name="bx-x" className="cs-btn-icon" />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="cs-modal-body">
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tracking.blNumber')}</label>
              <input
                type="text"
                className="cs-input"
                value={addUpdateRow?.bl_number ?? addUpdateBl}
                readOnly={!!addUpdateRow}
                onChange={addUpdateRow ? undefined : (e) => setAddUpdateBl(e.target.value)}
                placeholder={addUpdateRow ? undefined : 'BL-2026-XXXX'}
              />
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tracking.updateText')}</label>
              <textarea className="cs-input" rows={3} placeholder={t('customerServices.tracking.updateTextPlaceholder')} value={addUpdateText} onChange={(e) => setAddUpdateText(e.target.value)} />
            </div>
          </div>
          <div className="cs-modal-footer">
            <button type="button" className="cs-btn cs-btn-outline" onClick={onClose} disabled={submitting}>{t('customerServices.cancel')}</button>
            <button type="submit" className="cs-btn cs-btn-primary" disabled={submitting}><Bx name="bx-check" className="cs-btn-icon" /> {submitting ? t('customerServices.saving') : t('customerServices.tracking.saveUpdate')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
