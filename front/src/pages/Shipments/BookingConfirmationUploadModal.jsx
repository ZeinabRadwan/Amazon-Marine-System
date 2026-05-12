import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Upload } from 'lucide-react'
import { listSDFormsForBookingConfirmation, uploadSDFormBookingConfirmation } from '../../api/sdForms'
import LoaderDots from '../../components/LoaderDots'

function clientLabel(client) {
  if (!client) return ''
  return String(client.company_name || client.name || '').trim()
}

function sdFormOptionLabel(sd) {
  const num = sd.sd_number || `#${sd.id}`
  const c = clientLabel(sd.client)
  return c ? `${num} — ${c} (ID ${sd.id})` : `${num} (ID ${sd.id})`
}

export default function BookingConfirmationUploadModal({ open, onClose, token, onSuccess }) {
  const { t } = useTranslation()
  const [sdForms, setSdForms] = useState([])
  const [loadingSd, setLoadingSd] = useState(false)
  const [sdFormId, setSdFormId] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !token) return
    setLoadingSd(true)
    setError(null)
    listSDFormsForBookingConfirmation(token, { per_page: 2000 })
      .then((res) => setSdForms(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        setSdForms([])
        setError(err?.message || t('shipments.bookingUpload.loadSdListError'))
      })
      .finally(() => setLoadingSd(false))
  }, [open, token])

  useEffect(() => {
    if (!open) {
      setSdFormId('')
      setFile(null)
      setError(null)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!sdFormId) {
      setError(t('shipments.bookingUpload.selectSdForm'))
      return
    }
    if (!file) {
      setError(t('shipments.bookingUpload.selectFile'))
      return
    }
    setSubmitting(true)
    try {
      await uploadSDFormBookingConfirmation(token, sdFormId, file)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || t('shipments.bookingUpload.uploadError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="client-detail-modal shipments-no-print" role="dialog" aria-modal="true" aria-labelledby="booking-upload-title">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box client-detail-modal__box--form max-w-lg">
        <header className="client-detail-modal__header client-detail-modal__header--form">
          <h2 id="booking-upload-title" className="client-detail-modal__title">
            {t('shipments.bookingUpload.title')}
          </h2>
          <button type="button" className="client-detail-modal__close" onClick={onClose} aria-label={t('shipments.close')}>
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="client-detail-modal__body client-detail-modal__body--form">
          <div className="client-detail-modal__body-inner clients-form-sections space-y-4">
            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}
            <div>
              <label className="client-detail-modal__label block mb-1">{t('shipments.bookingUpload.sdFormLabel')}</label>
              <select
                className="clients-input w-full"
                value={sdFormId}
                onChange={(e) => setSdFormId(e.target.value)}
                disabled={loadingSd}
                required
              >
                <option value="">{loadingSd ? t('shipments.loading') : t('shipments.bookingUpload.sdFormPlaceholder')}</option>
                {sdForms.map((sd) => (
                  <option key={sd.id} value={String(sd.id)}>
                    {sdFormOptionLabel(sd)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="client-detail-modal__label block mb-1">{t('shipments.bookingUpload.fileLabel')}</label>
              <input
                type="file"
                className="clients-input w-full text-sm"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,.ppt,.pptx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="client-detail-modal__btn client-detail-modal__btn--secondary" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="client-detail-modal__btn client-detail-modal__btn--primary inline-flex items-center gap-2"
                disabled={submitting || loadingSd}
              >
                {submitting ? <LoaderDots size={8} /> : <Upload className="h-4 w-4" aria-hidden />}
                {t('shipments.bookingUpload.submit')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
