import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  Table,
  Presentation,
  FileCode,
  Folder,
  File,
  FileType,
  Download,
  Trash2,
  Eye,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getDocumentKind } from '../utils/documentFileKind'
import { formatDate as globalFormatDate } from '../../../utils/dateUtils'

const KIND_ICONS = {
  pdf: FileType,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  spreadsheet: Table,
  presentation: Presentation,
  archive: Archive,
  code: FileCode,
  document: FileText,
  folder: Folder,
  other: File,
}

export default function DocumentCard({ document, onDownload, onDelete, onView }) {
  const { t } = useTranslation()
  const { name, size, mime_type, created_at, uploaded_by_name, id } = document

  const kind = getDocumentKind(mime_type, name)
  const Icon = KIND_ICONS[kind] || File

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (iso) => {
    return globalFormatDate(iso)
  }

  const typeLabel = (mime_type || '').split('/')[1]?.toUpperCase() || kind.toUpperCase()

  return (
    <div className="document-card">
      <div className="document-card__icon">
        {kind === 'folder' ? <Folder size={24} /> : <Icon size={24} aria-hidden />}
      </div>
      <h3 className="document-card__title" title={name}>{name}</h3>
      <div className="document-card__info">
        <p>{typeLabel} • {formatSize(size)}</p>
        <p>{formatDate(created_at)}</p>
        {uploaded_by_name ? <p className="document-card__author">{uploaded_by_name}</p> : null}
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
            disabled={!document.preview_url}
          >
            <Eye size={18} />
          </button>
          <button
            type="button"
            className="p-1 hover:text-green-500 transition-colors"
            title={t('common.download', 'Download')}
            onClick={() => onDownload?.(document)}
            disabled={!document.download_url}
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
