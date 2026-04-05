import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

/**
 * Fetches the list of documents by type.
 * @param {string} token
 * @param {'company' | 'template'} type
 */
export async function getDocuments(token, type) {
  const url = `${getApiBaseUrl()}/documents?type=${encodeURIComponent(type)}`
  const res = await apiFetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to fetch documents')
  }
  return res.json()
}

/**
 * Uploads a new document.
 * @param {string} token
 * @param {FormData} formData
 */
export async function uploadDocument(token, formData) {
  const url = `${getApiBaseUrl()}/documents`
  const res = await apiFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.message || 'Failed to upload document')
  }
  return res.json()
}

/**
 * Deletes a document by ID.
 * @param {string} token
 * @param {number} id
 */
export async function deleteDocument(token, id) {
  const url = `${getApiBaseUrl()}/documents/${id}`
  const res = await apiFetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })
  if (!res.ok) {
    throw new Error('Failed to delete document')
  }
  return res.json()
}

/**
 * GET a file from an absolute or relative API URL with Bearer auth (preview / download).
 * @param {string} token
 * @param {string} fileUrl
 * @returns {Promise<{ blob: Blob, contentType: string }>}
 */
export async function fetchDocumentBlob(token, fileUrl) {
  if (!fileUrl) {
    throw new Error('Missing file URL')
  }
  const res = await apiFetch(fileUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    throw new Error('Failed to load file')
  }
  const blob = await res.blob()
  const contentType = (res.headers.get('content-type') || blob.type || '').split(';')[0].trim()
  return { blob, contentType }
}

/**
 * Downloads using `download_url` from the documents list (or any authenticated file URL).
 * @param {string} token
 * @param {string} downloadUrl
 * @param {string} filename
 */
export async function downloadDocumentFromUrl(token, downloadUrl, filename) {
  const { blob } = await fetchDocumentBlob(token, downloadUrl)
  const safeName = filename || 'document'
  const objectUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.setAttribute('download', safeName)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(objectUrl)
}
