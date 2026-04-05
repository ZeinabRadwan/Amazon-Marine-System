import { FileText, Download, Trash2, Eye, Folder } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function DocumentCard({ document, onDownload, onDelete, onView }) {
  const { t } = useTranslation()
  const { name, size, mime_type, created_at, id } = document

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
  }

  return (
    <div className="document-card">
      <div className="document-card__icon">
        {mime_type?.includes('directory') ? (
            <Folder size={24} />
        ) : (
            <FileText size={24} />
        )}
      </div>
      <h3 className="document-card__title" title={name}>{name}</h3>
      <div className="document-card__info">
        <p>{(mime_type || '').split('/')[1]?.toUpperCase() || 'FILE'} • {formatSize(size)}</p>
        <p>{formatDate(created_at)}</p>
      </div>
      <div className="document-card__footer">
        <span className="document-status document-status--active">
          {t('documents.status.active', 'Active')}
        </span>
        <div className="document-card__actions">
          <button 
            type="button" 
            className="p-1 hover:text-blue-500 transition-colors" 
            title={t('common.view', 'View')}
            onClick={() => onView?.(document)}
          >
            <Eye size={18} />
          </button>
          <button 
            type="button" 
            className="p-1 hover:text-green-500 transition-colors" 
            title={t('common.download', 'Download')}
            onClick={() => onDownload?.(id, name)}
          >
            <Download size={18} />
          </button>
          <button 
            type="button" 
            className="p-1 hover:text-red-500 transition-colors" 
            title={t('common.delete', 'Delete')}
            onClick={() => {
                if (window.confirm(t('common.confirmDelete', 'Are you sure you want to delete this?'))) {
                    onDelete?.(id)
                }
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
