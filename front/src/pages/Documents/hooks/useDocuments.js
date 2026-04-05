import { useState, useCallback, useEffect } from 'react'
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  downloadDocumentFromUrl,
} from '../../../api/documents'
import { compressImageIfNeeded } from '../utils/compressImage'

export function useDocuments(token, type) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDocuments = useCallback(
    async (options = {}) => {
      const { silent = false } = options
      if (!token) return
      if (!silent) setLoading(true)
      setError(null)
      try {
        const data = await getDocuments(token, type)
        setDocuments(data.data || [])
      } catch (err) {
        setError(err.message)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [token, type]
  )

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const upload = async (name, uploadType, file) => {
    if (!token) return
    const fileToSend = await compressImageIfNeeded(file)
    const formData = new FormData()
    formData.append('name', name)
    formData.append('type', uploadType)
    formData.append('file', fileToSend)

    try {
      const res = await uploadDocument(token, formData)
      // List API returns preview_url / download_url; store response alone is often incomplete.
      if (uploadType === type) {
        await fetchDocuments({ silent: true })
      }
      return res.data
    } catch (err) {
      throw new Error(err.message)
    }
  }

  const remove = async (id) => {
    if (!token) return
    const numericId = Number(id)
    try {
      await deleteDocument(token, numericId)
      setDocuments((prev) => prev.filter((doc) => Number(doc.id) !== numericId))
    } catch (err) {
      throw new Error(err.message)
    }
  }

  const download = async (doc) => {
    if (!token || !doc?.download_url) return
    try {
      await downloadDocumentFromUrl(token, doc.download_url, doc.name)
    } catch (err) {
      throw new Error(err.message)
    }
  }

  return {
    documents,
    loading,
    error,
    refresh: fetchDocuments,
    upload,
    remove,
    download,
  }
}
