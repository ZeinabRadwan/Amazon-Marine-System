import { useState, useCallback, useEffect } from 'react'
import { getDocuments, uploadDocument, deleteDocument, downloadDocument as downloadApi } from '../../../api/documents'

export function useDocuments(token, type) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchDocuments = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await getDocuments(token, type)
      setDocuments(data.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, type])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const upload = async (name, type, file) => {
    if (!token) return
    const formData = new FormData()
    formData.append('name', name)
    formData.append('type', type)
    formData.append('file', file)
    
    try {
      const res = await uploadDocument(token, formData)
      setDocuments(prev => [res.data, ...prev])
      return res.data
    } catch (err) {
      throw new Error(err.message)
    }
  }

  const remove = async (id) => {
    if (!token) return
    try {
      await deleteDocument(token, id)
      setDocuments(prev => prev.filter(doc => doc.id !== id))
    } catch (err) {
      throw new Error(err.message)
    }
  }

  const download = async (id, name) => {
    if (!token) return
    try {
      await downloadApi(token, id, name)
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
