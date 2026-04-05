import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Upload, Check } from 'lucide-react'
import './Documents.css'

export default function DocumentModal({ isOpen, onClose, onUpload }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({ name: '', type: 'company' })
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setFormData({ name: '', type: 'company' })
      setError(null)
      setSubmitting(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setFormData((prev) => {
        if (prev.name.trim()) return prev
        const base = selectedFile.name.replace(/\.[^.]+$/, '')
        return { ...prev, name: base || selectedFile.name }
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError(t('documents.error.noFile', 'Please select a file'))
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onUpload(formData.name, formData.type, file)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="document-modal">
      <button type="button" className="document-modal__backdrop" onClick={onClose} aria-label={t('common.close', 'Close')} />
      <div className="document-modal__panel" role="dialog" aria-modal="true" aria-labelledby="document-modal-title">
        <div className="document-modal__header">
          <h2 id="document-modal-title" className="document-modal__title">
            <Upload size={22} className="document-modal__title-icon" aria-hidden />
            {t('documents.uploadTitle', 'Upload Document')}
          </h2>
          <button type="button" className="document-modal__icon-btn" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="document-modal__form">
          <div className="document-modal__field">
            <label className="document-modal__label" htmlFor="document-modal-name">
              {t('documents.name', 'Document Name')}
            </label>
            <input
              id="document-modal-name"
              type="text"
              className="document-modal__input"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder={t('documents.namePlaceholder', 'Example: Commercial Register')}
              required
            />
          </div>

          <div className="document-modal__field">
            <label className="document-modal__label" htmlFor="document-modal-type">
              {t('documents.type', 'Document Type')}
            </label>
            <select
              id="document-modal-type"
              className="document-modal__select"
              value={formData.type}
              onChange={(e) => setFormData((p) => ({ ...p, type: e.target.value }))}
            >
              <option value="company">{t('documents.companyDocs', 'Company Documents')}</option>
              <option value="template">{t('documents.templates', 'Templates')}</option>
            </select>
          </div>

          <div className="document-modal__field">
            <span className="document-modal__label">{t('documents.file', 'File')}</span>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="document-modal__file-input" />
            <button
              type="button"
              className={`document-modal__upload-zone ${file ? 'document-modal__upload-zone--has-file' : ''}`}
              onClick={triggerFileInput}
            >
              {file ? (
                <div className="document-modal__file-picked">
                  <Check size={28} className="document-modal__file-picked-icon" aria-hidden />
                  <span className="document-modal__file-name">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload size={32} className="document-modal__upload-icon" aria-hidden />
                  <span className="document-modal__upload-hint">{t('documents.dragAndDrop', 'Click to upload or drag and drop')}</span>
                  <span className="document-modal__upload-formats">PDF, DOCX, JPG, PNG, …</span>
                </>
              )}
            </button>
          </div>

          {error ? (
            <div className="document-modal__error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="document-modal__actions">
            <button type="button" className="document-modal__btn document-modal__btn--secondary" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button type="submit" className="document-modal__btn document-modal__btn--primary" disabled={submitting}>
              {submitting ? (
                t('documents.uploading', 'Uploading...')
              ) : (
                <>
                  <Check size={18} aria-hidden />
                  {t('documents.uploadActionConfirm', 'Upload & Save')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
