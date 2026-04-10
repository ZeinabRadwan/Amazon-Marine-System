import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ChevronDown, ChevronUp, Ship, Car, ShieldCheck, Shield, Paperclip, FileDown } from 'lucide-react'
import { downloadExpenseReceipt } from '../../api/expenses'
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
  const [expanded, setExpanded] = useState(new Set(['shipping', 'inland', 'customs', 'insurance', 'other']))

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
              {expensesWithFiles.length === 0 ? (
                <div className="p-12 text-center">
                  <Paperclip className="mx-auto h-12 w-12 text-muted mb-4 opacity-20" />
                  <p className="text-muted">{t('shipments.fin.noAttachments') || 'No attachments found for this shipment.'}</p>
                </div>
              ) : (
                <div className="space-y-4">
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
