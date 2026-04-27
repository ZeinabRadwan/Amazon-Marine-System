import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Ship,
  Car,
  ShieldCheck,
  Shield,
  Paperclip,
  FileDown,
  Trash2,
  Loader2,
  Upload,
  Pencil,
  Check,
  Eye,
  FileText,
  FileImage,
  Wallet,
  Hash,
  Building2,
} from 'lucide-react'
import { downloadExpenseReceipt } from '../../api/expenses'
import { listShipmentAttachments, uploadShipmentAttachment, deleteShipmentAttachment, downloadShipmentAttachment, updateShipmentAttachment } from '../../api/shipments'
import { BUCKET_DEFS, expenseBucket, ATTACHMENTS_MODAL_TITLE_KEY } from './shipmentFinUtils'
import '../SDForms/SDForms.css'

export default function ShipmentAttachmentsModal({ open, shipment, expenses, loading, onClose, token, onAlert }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('shipment')
  const [directAttachments, setDirectAttachments] = useState([])
  const [directLoading, setDirectLoading] = useState(false)
  const [uploadQueue, setUploadQueue] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const fileInputRef = useRef(null)

  const isUploading = uploadQueue.some((u) => u.status === 'uploading')

  useEffect(() => {
    if (open && shipment?.id) {
      loadDirectAttachments()
    }
  }, [open, shipment?.id])

  useEffect(() => {
    if (!open) {
      setActiveTab('shipment')
      setUploadQueue([])
      setDragActive(false)
      setEditingId(null)
      setEditingName('')
      setSavingEdit(false)
      setDeletingId(null)
      setPendingDelete(null)
    }
  }, [open])

  const emitAlert = (type, message) => {
    if (typeof onAlert === 'function') {
      onAlert({ type, message })
      return
    }
    if (type === 'error') alert(message)
  }

  const loadDirectAttachments = async () => {
    if (!token || !shipment?.id) return
    setDirectLoading(true)
    try {
      const res = await listShipmentAttachments(token, shipment.id)
      setDirectAttachments(res.data || [])
    } catch (err) {
      console.error('Failed to load direct attachments', err)
    } finally {
      setDirectLoading(false)
    }
  }

  const isAllowedFile = (file) => {
    const extension = (file.name.split('.').pop() || '').toLowerCase()
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'txt']
    if (allowedExts.includes(extension)) return true
    const mime = file.type || ''
    if (mime.startsWith('image/')) return true
    if (mime.includes('pdf') || mime.includes('word') || mime.includes('excel') || mime.includes('text')) return true
    return false
  }

  const queueFiles = async (filesList) => {
    const files = Array.from(filesList || [])
    if (!files.length || !token || !shipment?.id) return
    const validFiles = files.filter(isAllowedFile)
    if (!validFiles.length) {
      emitAlert('error', t('shipments.attachments.uploadFailed') || 'فشل رفع الملف')
      return
    }

    const now = Date.now()
    const queued = validFiles.map((file, index) => ({
      id: `${now}-${index}-${file.name}`,
      name: file.name,
      progress: 0,
      status: 'uploading',
    }))
    setUploadQueue((prev) => [...queued, ...prev].slice(0, 8))

    let hasError = false
    await Promise.all(
      validFiles.map(async (file, index) => {
        const itemId = queued[index].id
        try {
          await uploadShipmentAttachment(token, shipment.id, file, (event) => {
            if (!event?.total) return
            const progress = Math.max(0, Math.min(100, Math.round((event.loaded * 100) / event.total)))
            setUploadQueue((prev) => prev.map((item) => (item.id === itemId ? { ...item, progress } : item)))
          })
          setUploadQueue((prev) => prev.map((item) => (item.id === itemId ? { ...item, progress: 100, status: 'success' } : item)))
        } catch (err) {
          hasError = true
          setUploadQueue((prev) => prev.map((item) => (item.id === itemId ? { ...item, status: 'error', error: err?.message } : item)))
        }
      })
    )

    await loadDirectAttachments()
    emitAlert(
      hasError ? 'error' : 'success',
      hasError
        ? t('shipments.attachments.uploadFailed') || 'فشل رفع الملف'
        : t('shipments.attachments.uploadSuccess') || 'تم رفع الملف بنجاح'
    )
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDeleteDirect = async () => {
    if (!pendingDelete || !token || !shipment?.id) return
    setDeletingId(pendingDelete.id)
    try {
      await deleteShipmentAttachment(token, shipment.id, pendingDelete.id)
      setDirectAttachments((prev) => prev.filter((a) => a.id !== pendingDelete.id))
      setPendingDelete(null)
      emitAlert('success', t('shipments.attachments.deleteSuccess') || 'Attachment deleted.')
    } catch (err) {
      console.error('Delete failed', err)
      emitAlert('error', err?.message || t('shipments.attachments.deleteFailed') || 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const handleStartEdit = (attachment) => {
    setEditingId(attachment.id)
    const parts = attachment.name.split('.')
    setEditingName(parts.length > 1 ? parts.slice(0, -1).join('.') : attachment.name)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async (attachment) => {
    if (!token || !shipment?.id || !editingName.trim()) return
    setSavingEdit(true)
    try {
      const ext = attachment?.name?.includes('.') ? `.${attachment.name.split('.').pop()}` : ''
      await updateShipmentAttachment(token, shipment.id, attachment.id, { name: `${editingName.trim()}${ext}` })
      await loadDirectAttachments()
      setEditingId(null)
      setEditingName('')
      emitAlert('success', t('shipments.attachments.renameSuccess') || 'Attachment renamed.')
    } catch (err) {
      console.error('Update failed', err)
      emitAlert('error', err?.message || t('shipments.attachments.renameFailed') || 'Update failed')
    } finally {
      setSavingEdit(false)
    }
  }

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'attachment'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleDownloadDirect = async (attachment) => {
    if (!token || !shipment?.id || !attachment?.id) return
    try {
      const { blob, filename } = await downloadShipmentAttachment(token, shipment.id, attachment.id)
      downloadBlob(blob, filename || attachment.name || 'attachment')
    } catch (err) {
      console.error('Download failed', err)
      emitAlert('error', t('shipments.fin.errorDownload') || 'Download failed')
    }
  }

  const handlePreviewDirect = async (attachment) => {
    if (!token || !shipment?.id || !attachment?.id) return
    try {
      const { blob } = await downloadShipmentAttachment(token, shipment.id, attachment.id)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
    } catch (err) {
      console.error('Preview failed', err)
      emitAlert('error', t('clients.errorAttachmentPreview') || 'Could not open preview.')
    }
  }

  const expensesWithFiles = useMemo(() => (expenses || []).filter((ex) => ex.has_receipt || ex.receipt_path), [expenses])

  const grouped = useMemo(() => {
    const buckets = { shipping: [], inland: [], customs: [], insurance: [], other: [] }
    for (const ex of expensesWithFiles) buckets[expenseBucket(ex)].push(ex)
    return buckets
  }, [expensesWithFiles])

  const handleDownloadExpense = async (expense) => {
    if (!token || !expense.id) return
    try {
      const { blob, filename } = await downloadExpenseReceipt(token, expense.id)
      downloadBlob(blob, filename || expense.receipt_path?.split('/').pop() || 'attachment')
    } catch (err) {
      console.error('Download failed', err)
      emitAlert('error', t('shipments.fin.errorDownload') || 'Download failed')
    }
  }

  const handlePreviewExpense = async (expense) => {
    if (!token || !expense?.id) return
    try {
      const { blob } = await downloadExpenseReceipt(token, expense.id)
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60000)
    } catch (err) {
      console.error('Preview failed', err)
      emitAlert('error', t('clients.errorAttachmentPreview') || 'Could not open preview.')
    }
  }

  const formatFileSize = (bytes) => {
    const size = Number(bytes || 0)
    if (!Number.isFinite(size) || size <= 0) return '0 KB'
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }

  const fileTypeIcon = (filename = '', mime = '') => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return FileImage
    if (ext === 'pdf' || mime.includes('pdf')) return FileText
    return Paperclip
  }

  const renderUploadQueue = uploadQueue.length > 0 && (
    <div className="mt-3 space-y-2">
      {uploadQueue.map((item) => (
        <div key={item.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{item.name}</div>
            <div className="text-[11px] text-muted">{item.status === 'error' ? t('common.error') || 'Error' : `${item.progress}%`}</div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full transition-all ${item.status === 'error' ? 'bg-red-500' : item.status === 'success' ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )

  if (!open) return null

  return (
    <div className="client-detail-modal shipments-no-print shipment-fin-modal-root" role="dialog" aria-modal="true">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div className="client-detail-modal__box shipment-fin-modal__box" style={{ maxWidth: '860px' }}>
        <header className="client-detail-modal__header client-detail-modal__header--form shipment-fin-modal__header">
          <div className="client-detail-modal__header-inner space-y-2">
            <span className="client-detail-modal__header-label">{t(ATTACHMENTS_MODAL_TITLE_KEY)}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-2.5 py-1 text-xs font-semibold">
                <Hash className="w-3.5 h-3.5" />
                {t('shipments.attachments.idBadge') || 'ID'}: {shipment?.id }
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                {shipment?.client?.company_name || shipment?.client?.name}
              </span>
              <span className="text-xs text-muted">{shipment?.bl_number || '—'}</span>
            </div>
            <div className="sd-form-modal-preview__hint">{t('shipments.attachments.headerHint') || 'Manage shipment and expense attachments in one place.'}</div>
          </div>
          <button type="button" className="client-detail-modal__close" onClick={onClose} aria-label={t('common.close') || 'Close'}>
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <div className="client-detail-modal__tabs shipment-fin-tab-bar">
          <button
            type="button"
            className={`shipment-fin-tab rounded-t-xl transition-all duration-200 ${activeTab === 'shipment' ? 'shipment-fin-tab--active shadow-sm' : ''}`}
            onClick={() => setActiveTab('shipment')}
          >
            <Paperclip className="shipment-fin-tab__icon" />
            {t('shipments.attachments.shipmentTab') || 'مرفقات الشحنة'}
          </button>
          <button
            type="button"
            className={`shipment-fin-tab rounded-t-xl transition-all duration-200 ${activeTab === 'expenses' ? 'shipment-fin-tab--active shadow-sm' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            <Wallet className="shipment-fin-tab__icon" />
            {t('shipments.attachments.expenseTab') || 'مرفقات المصروفات'}
          </button>
        </div>

        <div className="client-detail-modal__body shipment-fin-modal__body">
          {loading ? (
            <div className="p-8 text-center text-muted">{t('common.loading') || 'Loading...'}</div>
          ) : (
            <div className="shipment-fin-panel">
              {activeTab === 'shipment' ? (
                <div className="space-y-4">
                  <div
                    className={`rounded-xl border-2 border-dashed p-5 transition-colors ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30'
                    }`}
                    onDragEnter={(e) => {
                      e.preventDefault()
                      if (!isUploading) setDragActive(true)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (!isUploading) setDragActive(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      if (e.currentTarget === e.target) setDragActive(false)
                    }}
                    onDrop={async (e) => {
                      e.preventDefault()
                      setDragActive(false)
                      if (!isUploading) await queueFiles(e.dataTransfer.files)
                    }}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <Upload className="w-7 h-7 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('shipments.attachments.uploadTitle') || 'Upload attachments'}</h3>
                      <p className="text-xs text-muted">{t('shipments.attachments.uploadHint') || 'Drag & drop files here or click to select'}</p>
                      <p className="text-[11px] text-muted">
                        {t('shipments.attachments.uploadSupported') || 'Supported: PDF, images, DOC, DOCX, XLS, XLSX'}
                      </p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {isUploading ? t('shipments.attachments.uploading') || 'Uploading…' : t('shipments.attachments.uploadAction') || 'Select files'}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => queueFiles(e.target.files)}
                        className="hidden"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
                      />
                    </div>
                    {renderUploadQueue}
                  </div>

                  <div className="shipment-fin-card">
                    <div className="shipment-fin-card__head">
                      <div className="shipment-fin-card__head-main">
                        <Paperclip className="shipment-fin-card__icon" />
                        <div>
                          <h3 className="shipment-fin-card__title">{t('shipments.attachments.directTitle') || 'Shipment Attachments'}</h3>
                          <p className="shipment-fin-card__sub">{t('shipments.attachments.directSub') || 'Documents uploaded directly to this shipment'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800 p-3">
                      {directLoading ? (
                        <div className="p-4 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted" />
                        </div>
                      ) : directAttachments.length === 0 ? (
                        <div className="p-8 text-center text-muted text-sm italic">{t('shipments.attachments.noDirect') || 'No direct attachments yet.'}</div>
                      ) : (
                        <div className="space-y-2">
                          {directAttachments.map((a) => {
                            const TypeIcon = fileTypeIcon(a.name, a.mime_type || '')
                            return (
                              <div
                                key={a.id}
                                className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2.5 flex items-start justify-between gap-3 hover:shadow-sm transition-shadow"
                              >
                                <div className="min-w-0 flex items-start gap-2.5">
                                  <TypeIcon className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                  <div className="min-w-0">
                                    {editingId === a.id ? (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                          value={editingName}
                                          onChange={(e) => setEditingName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit(a)
                                            if (e.key === 'Escape') handleCancelEdit()
                                          }}
                                          autoFocus
                                        />
                                        {a.name.includes('.') ? <span className="text-xs text-muted">.{a.name.split('.').pop()}</span> : null}
                                      </div>
                                    ) : (
                                      <>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{a.name}</p>
                                        <p className="text-[11px] text-muted">{a.mime_type || 'file'} · {formatFileSize(a.size)}</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0 flex flex-wrap justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  {editingId === a.id ? (
                                    <>
                                      <button
                                        onClick={() => handleSaveEdit(a)}
                                        disabled={savingEdit || isUploading}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-all disabled:opacity-50"
                                        title={t('common.save') || 'Save'}
                                        aria-label={t('common.save') || 'Save'}
                                      >
                                        {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        disabled={savingEdit}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-all disabled:opacity-50"
                                        title={t('common.cancel') || 'Cancel'}
                                        aria-label={t('common.cancel') || 'Cancel'}
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleStartEdit(a)}
                                        disabled={isUploading}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-all disabled:opacity-50"
                                        title={t('shipments.attachments.renameAction') || 'تسمية / Rename'}
                                        aria-label={t('shipments.attachments.renameAction') || 'تسمية / Rename'}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handlePreviewDirect(a)}
                                        disabled={isUploading}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md transition-all disabled:opacity-50"
                                        title={t('shipments.attachments.preview') || 'Preview'}
                                        aria-label={t('shipments.attachments.preview') || 'Preview'}
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDownloadDirect(a)}
                                        disabled={isUploading}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-all disabled:opacity-50"
                                        title={t('common.download') || 'Download'}
                                        aria-label={t('common.download') || 'Download'}
                                      >
                                        <FileDown className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setPendingDelete(a)}
                                        disabled={isUploading}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-all disabled:opacity-50"
                                        title={t('common.delete') || 'Delete'}
                                        aria-label={t('common.delete') || 'Delete'}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="client-detail-modal__section-title m-0">{t('shipments.attachments.expenseDocuments') || 'Expense Attachments'}</h3>
                  {expensesWithFiles.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted text-sm italic">{t('shipments.fin.noAttachments') || 'No expense documents found.'}</p>
                    </div>
                  ) : (
                    <>
                      {BUCKET_DEFS.map((bucket) => {
                        const bucketExpenses = grouped[bucket.id] || []
                        if (bucketExpenses.length === 0) return null
                        const Icon = bucket.id === 'shipping' ? Ship : bucket.id === 'inland' ? Car : bucket.id === 'customs' ? ShieldCheck : Shield
                        return (
                          <div key={bucket.id} className="shipment-fin-card">
                            <div className="shipment-fin-card__head">
                              <div className="shipment-fin-card__head-main">
                                <Icon className="shipment-fin-card__icon" />
                                <div>
                                  <h3 className="shipment-fin-card__title">{t(bucket.titleKey)}</h3>
                                  <p className="shipment-fin-card__sub">{t(bucket.subKey)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-2">
                              {bucketExpenses.map((ex) => (
                                <div
                                  key={ex.id}
                                  className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2.5 flex items-start justify-between gap-3 hover:shadow-sm transition-shadow"
                                >
                                  <div className="min-w-0 flex items-start gap-2.5">
                                    <FileText className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ex.description || t('shipments.fin.noDescription')}</p>
                                      <p className="text-[11px] text-muted">
                                        {ex.category_name} {ex.amount > 0 ? `· ${ex.amount} ${ex.currency_code}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="shrink-0 flex flex-wrap justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handlePreviewExpense(ex)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md transition-all"
                                      title={t('shipments.attachments.preview') || 'Preview'}
                                      aria-label={t('shipments.attachments.preview') || 'Preview'}
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDownloadExpense(ex)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-all"
                                      title={t('common.download') || 'Download'}
                                      aria-label={t('common.download') || 'Download'}
                                    >
                                      <FileDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                      {grouped.other && grouped.other.length > 0 ? (
                        <div className="shipment-fin-card">
                          <div className="shipment-fin-card__head">
                            <div className="shipment-fin-card__head-main">
                              <Paperclip className="shipment-fin-card__icon" />
                              <div>
                                <h3 className="shipment-fin-card__title">{t('shipments.fin.bucketOtherTitle')}</h3>
                                <p className="shipment-fin-card__sub">{t('shipments.fin.bucketOtherSub')}</p>
                              </div>
                            </div>
                          </div>
                          <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-2">
                            {grouped.other.map((ex) => (
                              <div
                                key={ex.id}
                                className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2.5 flex items-start justify-between gap-3 hover:shadow-sm transition-shadow"
                              >
                                <div className="min-w-0 flex items-start gap-2.5">
                                  <FileText className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ex.description || t('shipments.fin.noDescription')}</p>
                                    <p className="text-[11px] text-muted">
                                      {ex.category_name} {ex.amount > 0 ? `· ${ex.amount} ${ex.currency_code}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <div className="shrink-0 flex flex-wrap justify-end gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handlePreviewExpense(ex)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md transition-all"
                                    title={t('shipments.attachments.preview') || 'Preview'}
                                    aria-label={t('shipments.attachments.preview') || 'Preview'}
                                  >
                                    <Eye className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDownloadExpense(ex)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-all"
                                    title={t('common.download') || 'Download'}
                                    aria-label={t('common.download') || 'Download'}
                                  >
                                    <FileDown className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {pendingDelete ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45" onClick={() => !deletingId && setPendingDelete(null)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 shadow-2xl">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('shipments.attachments.deleteConfirmTitle') || 'Delete attachment?'}</h4>
            <p className="mt-1 text-xs text-muted">{t('shipments.attachments.deleteConfirmMessage') || 'This action cannot be undone.'}</p>
            <p className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{pendingDelete.name}</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="client-detail-modal__btn client-detail-modal__btn--secondary"
                onClick={() => setPendingDelete(null)}
                disabled={!!deletingId}
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button type="button" className="client-detail-modal__btn client-detail-modal__btn--danger" onClick={handleDeleteDirect} disabled={!!deletingId}>
                {deletingId ? t('common.loading') || 'Loading...' : t('common.delete') || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
