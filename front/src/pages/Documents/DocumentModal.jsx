import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Upload, FileText, Check } from 'lucide-react'

export default function DocumentModal({ isOpen, onClose, onUpload }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({ name: '', type: 'company' })
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!formData.name) {
        setFormData(prev => ({ ...prev, name: selectedFile.name.split('.')[0] }))
      }
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
      setFile(null)
      setFormData({ name: '', type: 'company' })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1F2937] border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Upload size={20} className="text-blue-500" />
            {t('documents.uploadTitle', 'Upload Document')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">{t('documents.name', 'Document Name')}</label>
            <input
              type="text"
              className="w-full bg-[#111827] border border-gray-700 rounded-lg px-4 py-2.5 focus:border-blue-500 outline-none transition-all"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder={t('documents.namePlaceholder', 'Example: Commercial Register')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('documents.type', 'Document Type')}</label>
            <select
              className="w-full bg-[#111827] border border-gray-700 rounded-lg px-4 py-2.5 focus:border-blue-500 outline-none transition-all"
              value={formData.type}
              onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
            >
              <option value="company">{t('documents.companyDocs', 'Company Documents')}</option>
              <option value="template">{t('documents.templates', 'Templates')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">{t('documents.file', 'File')}</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div 
              onClick={triggerFileInput}
              className="document-modal__upload-zone"
            >
              {file ? (
                <div className="flex flex-col items-center gap-2 text-green-500">
                  <Check size={32} />
                  <span className="text-sm font-semibold">{file.name}</span>
                </div>
              ) : (
                <>
                    <Upload size={32} className="text-gray-400" />
                    <div className="text-sm text-gray-400">
                        {t('documents.dragAndDrop', 'Click to upload or drag and drop')}
                        <p className="text-xs mt-1">(PDF, DOCX, JPG, PNG)</p>
                    </div>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-900/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors font-semibold"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
            >
              {submitting ? t('common.uploading', 'Uploading...') : (
                <>
                    <Check size={18} />
                    {t('documents.uploadAction', 'Upload & Save')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
