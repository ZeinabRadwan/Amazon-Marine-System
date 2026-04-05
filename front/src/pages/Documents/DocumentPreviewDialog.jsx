import { useEffect, useState, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Loader2, FileWarning } from 'lucide-react'
import { fetchDocumentBlob } from '../../api/documents'
import { getPreviewRenderMode, PREVIEW_TEXT_MAX_BYTES } from './utils/documentFileKind'
import './Documents.css'

export default function DocumentPreviewDialog({ open, token, document: doc, onClose }) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState('idle')
  const [renderMode, setRenderMode] = useState(null)
  const [error, setError] = useState(null)
  const [objectUrl, setObjectUrl] = useState(null)
  const [textContent, setTextContent] = useState(null)
  const [effectiveType, setEffectiveType] = useState('')
  const blobUrlRef = useRef(null)

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      window.URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setObjectUrl(null)
  }, [])

  useEffect(() => {
    if (!open || !doc?.preview_url || !token) {
      setPhase('idle')
      setRenderMode(null)
      setError(null)
      setTextContent(null)
      setEffectiveType('')
      revokeBlobUrl()
      return undefined
    }

    let cancelled = false
    const previewUrl = doc.preview_url
    const hintType = (doc.mime_type || '').split(';')[0].trim().toLowerCase()
    const fileName = doc.name || ''

    revokeBlobUrl()
    setPhase('loading')
    setRenderMode(null)
    setError(null)
    setTextContent(null)
    setEffectiveType('')

    ;(async () => {
      try {
        const { blob, contentType } = await fetchDocumentBlob(token, previewUrl)
        if (cancelled) return

        let type = (contentType || blob.type || '').split(';')[0].trim().toLowerCase()
        if (!type || type === 'application/octet-stream') {
          type = hintType || type
        }
        setEffectiveType(type)

        const mode = getPreviewRenderMode(type, fileName)

        if (mode === 'text') {
          if (blob.size > PREVIEW_TEXT_MAX_BYTES) {
            if (!cancelled) {
              setError(
                t(
                  'documents.previewTooLarge',
                  'This file is too large to preview here. Download it instead.'
                )
              )
              setPhase('error')
            }
            return
          }
          const text = await blob.text()
          if (!cancelled) {
            setTextContent(text)
            setRenderMode('text')
            setPhase('ready')
          }
          return
        }

        if (mode === 'none') {
          if (!cancelled) {
            setRenderMode('none')
            setPhase('ready')
          }
          return
        }

        const url = window.URL.createObjectURL(blob)
        if (cancelled) {
          window.URL.revokeObjectURL(url)
          return
        }
        blobUrlRef.current = url
        setObjectUrl(url)
        setRenderMode(mode)
        setPhase('ready')
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || t('documents.previewError', 'Could not load preview'))
          setPhase('error')
        }
      }
    })()

    return () => {
      cancelled = true
      revokeBlobUrl()
    }
  }, [open, doc?.id, doc?.preview_url, doc?.mime_type, doc?.name, token, t, revokeBlobUrl])

  const handleClose = () => {
    setPhase('idle')
    setRenderMode(null)
    setError(null)
    setTextContent(null)
    setEffectiveType('')
    revokeBlobUrl()
    onClose?.()
  }

  if (!open || !doc) return null

  const title = doc.name || t('documents.previewTitle', 'Preview')
  const ready = phase === 'ready'
  const showUnsupported = ready && renderMode === 'none'

  return (
    <div className="document-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
      <button type="button" className="document-preview-dialog__backdrop" onClick={handleClose} aria-label={t('common.close', 'Close')} />
      <div className="document-preview-dialog__panel">
        <header className="document-preview-dialog__header">
          <h2 id="document-preview-title" className="document-preview-dialog__title">
            {title}
          </h2>
          <button type="button" className="document-preview-dialog__close" onClick={handleClose}>
            <X size={22} aria-hidden />
          </button>
        </header>
        <div className="document-preview-dialog__body">
          {phase === 'loading' && (
            <div className="document-preview-dialog__state">
              <Loader2 className="document-preview-dialog__spinner" size={40} aria-hidden />
              <p>{t('documents.previewLoading', 'Loading preview…')}</p>
            </div>
          )}
          {phase === 'error' && (
            <div className="document-preview-dialog__state document-preview-dialog__state--error">
              <FileWarning size={40} aria-hidden />
              <p>{error}</p>
            </div>
          )}
          {ready && renderMode === 'pdf' && objectUrl && (
            <iframe className="document-preview-dialog__iframe" title={title} src={objectUrl} />
          )}
          {ready && renderMode === 'image' && objectUrl && (
            <img className="document-preview-dialog__img" src={objectUrl} alt="" />
          )}
          {ready && renderMode === 'video' && objectUrl && (
            <video className="document-preview-dialog__video" controls playsInline src={objectUrl} />
          )}
          {ready && renderMode === 'audio' && objectUrl && (
            <div className="document-preview-dialog__audio-wrap">
              <audio className="document-preview-dialog__audio" controls src={objectUrl} />
            </div>
          )}
          {ready && renderMode === 'text' && textContent !== null && (
            <pre className="document-preview-dialog__pre">{textContent}</pre>
          )}
          {showUnsupported && (
            <div className="document-preview-dialog__state">
              <FileWarning size={40} aria-hidden />
              <p>{t('documents.previewUnsupported', 'Inline preview is not available for this file type. Use download instead.')}</p>
              {effectiveType ? (
                <p className="document-preview-dialog__mime">{effectiveType}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
