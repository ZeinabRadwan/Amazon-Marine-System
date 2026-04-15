import { useMemo, useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, ChevronUp, Ship, Car, ShieldCheck, Shield, Paperclip, FileDown, Plus, Trash2, Loader2, Upload, Pencil, Check } from 'lucide-react'
import { downloadExpenseReceipt } from '../../api/expenses'
import { listShipmentAttachments, uploadShipmentAttachment, deleteShipmentAttachment, downloadShipmentAttachment, updateShipmentAttachment } from '../../api/shipments'
import { BUCKET_DEFS, expenseBucket, ATTACHMENTS_MODAL_TITLE_KEY } from './shipmentFinUtils'
import '../SDForms/SDForms.css'

export default function ShipmentAttachmentsModal({
  open,
  shipment,
  expenses,
  loading,
  onClose,
  token,
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(new Set(['direct', 'shipping', 'inland', 'customs', 'insurance', 'other']))
  const [directAttachments, setDirectAttachments] = useState([])
  const [directLoading, setDirectLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (open && shipment?.id) {
      loadDirectAttachments()
    }
  }, [open, shipment?.id])

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

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !token || !shipment?.id) return

    setUploading(true)
    try {
      await uploadShipmentAttachment(token, shipment.id, file)
      await loadDirectAttachments()
    } catch (err) {
      console.error('Upload failed', err)
      alert(t('common.error') || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteDirect = async (attachmentId) => {
    if (!token || !shipment?.id) return
    if (!window.confirm(t('common.confirmDelete') || 'Are you sure?')) return

    try {
      await deleteShipmentAttachment(token, shipment.id, attachmentId)
      setDirectAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (err) {
      console.error('Delete failed', err)
      alert(t('common.error') || 'Delete failed')
    }
  }

  const handleStartEdit = (attachment) => {
    setEditingId(attachment.id)
    // Strip extension for the input
    const parts = attachment.name.split('.')
    if (parts.length > 1) {
      setEditingName(parts.slice(0, -1).join('.'))
    } else {
      setEditingName(attachment.name)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async (attachmentId) => {
    if (!token || !shipment?.id || !editingName.trim()) return
    setSavingEdit(true)
    try {
      await updateShipmentAttachment(token, shipment.id, attachmentId, { name: editingName.trim() })
      await loadDirectAttachments()
      setEditingId(null)
      setEditingName('')
    } catch (err) {
      console.error('Update failed', err)
      alert(t('common.error') || 'Update failed')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDownloadDirect = async (attachment) => {
    if (!token || !shipment?.id || !attachment?.id) return
    try {
      const { blob, filename } = await downloadShipmentAttachment(token, shipment.id, attachment.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || attachment.name || 'attachment'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed', err)
      alert(t('shipments.fin.errorDownload') || 'Download failed')
    }
  }

  const toggleCard = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter only expenses with attachments
  const expensesWithFiles = useMemo(() => {
    return (expenses || []).filter(ex => ex.has_receipt || ex.receipt_path)
  }, [expenses])

  const grouped = useMemo(() => {
    const buckets = { shipping: [], inland: [], customs: [], insurance: [], other: [] }
    for (const ex of expensesWithFiles) {
      buckets[expenseBucket(ex)].push(ex)
    }
    return buckets
  }, [expensesWithFiles])

  const handleDownload = async (expense) => {
    if (!token || !expense.id) return
    try {
      const { blob, filename } = await downloadExpenseReceipt(token, expense.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || expense.receipt_path?.split('/').pop() || 'attachment'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed', err)
      alert(t('shipments.fin.errorDownload') || 'Download failed')
    }
  }

  if (!open) return null

  return (
    <div className="client-detail-modal shipments-no-print shipment-fin-modal-root" role="dialog" aria-modal="true">
      <div className="client-detail-modal__backdrop" onClick={onClose} />
      <div 
        className="client-detail-modal__box shipment-fin-modal__box" 
        style={{ maxWidth: '800px' }}
      >
        <header className="client-detail-modal__header client-detail-modal__header--form shipment-fin-modal__header">
          <div className="client-detail-modal__header-inner">
            <span className="client-detail-modal__header-label">{t(ATTACHMENTS_MODAL_TITLE_KEY)}</span>
            <h2 className="client-detail-modal__title shipment-fin-modal__title-bl">
              {shipment?.bl_number || shipment?.id || '—'}
            </h2>
            <div className="sd-form-modal-preview__hint">
              {shipment?.client?.company_name || shipment?.client?.name || '—'}
            </div>
          </div>
          <button 
            type="button" 
            className="client-detail-modal__close" 
            onClick={onClose} 
            aria-label={t('common.close') || 'Close'}
          >
            <X className="client-detail-modal__close-icon" aria-hidden />
          </button>
        </header>

        <div className="client-detail-modal__body shipment-fin-modal__body">
          {loading ? (
            <div className="p-8 text-center text-muted">
              {t('common.loading') || 'Loading...'}
            </div>
          ) : (
            <div className="shipment-fin-panel">
              <div className="space-y-4">
                {/* Direct Attachments Section */}
                <div className="shipment-fin-card">
                  <div className="shipment-fin-card__head">
                    <div className="shipment-fin-card__head-main" onClick={() => toggleCard('direct')} style={{ cursor: 'pointer', flex: 1 }}>
                      <Paperclip className="shipment-fin-card__icon" />
                      <div>
                        <h3 className="shipment-fin-card__title">{t('shipments.attachments.directTitle') || 'Shipment Attachments'}</h3>
                        <p className="shipment-fin-card__sub">{t('shipments.attachments.directSub') || 'Documents uploaded directly to this shipment'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        {t('common.add') || 'Add'}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button type="button" onClick={() => toggleCard('direct')}>
                        {expanded.has('direct') ? <ChevronUp className="h-5 w-5 text-muted" /> : <ChevronDown className="h-5 w-5 text-muted" />}
                      </button>
                    </div>
                  </div>

                  {expanded.has('direct') && (
                    <div className="border-t border-gray-100 dark:border-gray-800">
                      {directLoading ? (
                        <div className="p-4 text-center">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted" />
                        </div>
                      ) : directAttachments.length === 0 ? (
                        <div className="p-8 text-center text-muted text-sm italic">
                          {t('shipments.attachments.noDirect') || 'No direct attachments yet.'}
                        </div>
                      ) : (
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                            {directAttachments.map((a) => (
                              <tr key={a.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                <td className="px-4 py-3">
                                  {editingId === a.id ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveEdit(a.id)
                                          if (e.key === 'Escape') handleCancelEdit()
                                        }}
                                        autoFocus
                                      />
                                      {a.name.includes('.') && (
                                        <span className="text-xs text-muted">.{a.name.split('.').pop()}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div className="font-medium text-gray-900 dark:text-gray-100">
                                        {a.name}
                                      </div>
                                      <div className="text-xs text-muted mt-0.5">
                                        {a.mime_type} · {(a.size / 1024).toFixed(1)} KB
                                      </div>
                                    </>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-2">
                                    {editingId === a.id ? (
                                      <>
                                        <button
                                          onClick={() => handleSaveEdit(a.id)}
                                          disabled={savingEdit}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/30 dark:hover:bg-green-900/50 rounded-lg transition-all disabled:opacity-50"
                                          title={t('common.save') || 'Save'}
                                        >
                                          {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                          {t('common.save') || 'Save'}
                                        </button>
                                        <button
                                          onClick={handleCancelEdit}
                                          disabled={savingEdit}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 dark:hover:bg-gray-900/50 rounded-lg transition-all disabled:opacity-50"
                                          title={t('common.cancel') || 'Cancel'}
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          {t('common.cancel') || 'Cancel'}
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleStartEdit(a)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 dark:hover:bg-gray-900/50 rounded-lg transition-all"
                                          title={t('common.edit') || 'Edit'}
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                          {t('common.edit') || 'Edit'}
                                        </button>
                                        <button
                                          onClick={() => handleDownloadDirect(a)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-all"
                                        >
                                          <FileDown className="w-3.5 h-3.5" />
                                          {t('common.download') || 'Download'}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteDirect(a.id)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition-all"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          {t('common.delete') || 'Delete'}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-gray-800 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('shipments.attachments.expenseDocuments') || 'Documents from Expenses'}
                    </span>
                  </div>
                </div>

                {expensesWithFiles.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-muted text-sm italic">{t('shipments.fin.noAttachments') || 'No expense documents found.'}</p>
                  </div>
                ) : (
                  <>
                    {BUCKET_DEFS.map((bucket) => {
                      const bucketExpenses = grouped[bucket.id] || []
                      if (bucketExpenses.length === 0) return null

                      const isExpanded = expanded.has(bucket.id)
                      const Icon = bucket.id === 'shipping' ? Ship : bucket.id === 'inland' ? Car : bucket.id === 'customs' ? ShieldCheck : Shield
                      
                      return (
                        <div key={bucket.id} className="shipment-fin-card">
                          <button type="button" className="shipment-fin-card__head" onClick={() => toggleCard(bucket.id)}>
                            <div className="shipment-fin-card__head-main">
                              <Icon className="shipment-fin-card__icon" />
                              <div>
                                  <h3 className="shipment-fin-card__title">{t(bucket.titleKey)}</h3>
                                  <p className="shipment-fin-card__sub">{t(bucket.subKey)}</p>
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-muted" /> : <ChevronDown className="h-5 w-5 text-muted" />}
                          </button>
                          
                          {isExpanded && (
                            <div className="border-t border-gray-100 dark:border-gray-800">
                              <table className="w-full text-sm">
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                  {bucketExpenses.map((ex) => (
                                    <tr key={ex.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                      <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                          {ex.description || t('shipments.fin.noDescription')}
                                        </div>
                                        <div className="text-xs text-muted mt-0.5">
                                          {ex.category_name} {ex.amount > 0 && `· ${ex.amount} ${ex.currency_code}`}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <button
                                          onClick={() => handleDownload(ex)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-all"
                                        >
                                          <FileDown className="w-3.5 h-3.5" />
                                          {t('common.download') || 'Download'}
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Other/Uncategorized */}
                    {grouped.other && grouped.other.length > 0 && (
                      <div className="shipment-fin-card">
                        <button type="button" className="shipment-fin-card__head" onClick={() => toggleCard('other')}>
                          <div className="shipment-fin-card__head-main">
                            <Paperclip className="shipment-fin-card__icon" />
                            <div>
                              <h3 className="shipment-fin-card__title">{t('shipments.fin.bucketOtherTitle')}</h3>
                              <p className="shipment-fin-card__sub">{t('shipments.fin.bucketOtherSub')}</p>
                            </div>
                          </div>
                          {expanded.has('other') ? <ChevronUp className="h-5 w-5 text-muted" /> : <ChevronDown className="h-5 w-5 text-muted" />}
                        </button>
                        {expanded.has('other') && (
                          <div className="border-t border-gray-100 dark:border-gray-800">
                            <table className="w-full text-sm">
                              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                {grouped.other.map((ex) => (
                                  <tr key={ex.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                                    <td className="px-4 py-3">
                                      <div className="font-medium text-gray-900 dark:text-gray-100">
                                        {ex.description || t('shipments.fin.noDescription')}
                                      </div>
                                      <div className="text-xs text-muted mt-0.5">
                                        {ex.category_name} {ex.amount > 0 && `· ${ex.amount} ${ex.currency_code}`}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <button
                                        onClick={() => handleDownload(ex)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-all"
                                      >
                                        <FileDown className="w-3.5 h-3.5" />
                                        {t('common.download') || 'Download'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
