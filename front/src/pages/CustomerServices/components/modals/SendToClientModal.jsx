import { Bx } from '../BxIcon'
import { TRACKING_TEMPLATE_KEYS } from '../../constants'

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
  t,
}) {
  if (!open || !row) return null
  return (
    <div className="cs-modal cs-modal-lg" role="dialog" aria-modal="true" aria-labelledby="cs-modal-send-title">
      <div className="cs-modal-backdrop" onClick={onClose} />
      <div className="cs-modal-content">
        <div className="cs-modal-header">
          <h2 id="cs-modal-send-title"><Bx name="bx-send" className="cs-btn-icon" /> {t('customerServices.tracking.modalSendTitle')}</h2>
          <button type="button" className="cs-modal-close" onClick={onClose} aria-label={t('customerServices.close')}><Bx name="bx-x" className="cs-btn-icon" /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="cs-modal-body">
            <div className="cs-form-row">
              <div className="cs-form-group">
                <label className="cs-form-label">{t('customerServices.tracking.blNumber')}</label>
                <input type="text" className="cs-input" value={row.bl_number} readOnly />
              </div>
              <div className="cs-form-group">
                <label className="cs-form-label">{t('customerServices.tracking.client')}</label>
                <input type="text" className="cs-input" value={row.client} readOnly />
              </div>
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tracking.sendVia')}</label>
              <div className="cs-radio-group">
                <label className="cs-radio-label"><input type="radio" name="sendChannel" value="email" checked={sendChannel === 'email'} onChange={() => setSendChannel('email')} /> {t('customerServices.tracking.email')}</label>
                <label className="cs-radio-label"><input type="radio" name="sendChannel" value="whatsapp" checked={sendChannel === 'whatsapp'} onChange={() => setSendChannel('whatsapp')} /> {t('customerServices.tracking.whatsapp')}</label>
              </div>
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tracking.template')}</label>
              <select className="cs-select" value={sendTemplate} onChange={(e) => { setSendTemplate(e.target.value); setSendMessage('') }}>
                <option value="">{t('customerServices.tracking.templatePlaceholder')}</option>
                {Object.keys(TRACKING_TEMPLATE_KEYS).map((k) => (
                  <option key={k} value={k}>{t(TRACKING_TEMPLATE_KEYS[k])}</option>
                ))}
              </select>
            </div>
            <div className="cs-form-group">
              <label className="cs-form-label">{t('customerServices.tracking.messageLabel')}</label>
              <textarea className="cs-input" rows={4} placeholder={t('customerServices.tracking.messagePlaceholder')} value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} />
            </div>
          </div>
          <div className="cs-modal-footer">
            <button type="button" className="cs-btn cs-btn-outline" onClick={onClose} disabled={submitting}>{t('customerServices.cancel')}</button>
            <button type="submit" className="cs-btn cs-btn-primary" disabled={submitting}><Bx name="bx-send" className="cs-btn-icon" /> {submitting ? t('customerServices.saving') : t('customerServices.tracking.send')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
