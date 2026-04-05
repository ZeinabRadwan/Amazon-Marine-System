import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

/**
 * Fetches the list of documents by type.
 * @param {string} token
 * @param {'company' | 'template'} type
 * @returns {Promise<{ data: Array<{ id: number, name: string, type: string, mime_type: string, size: number, uploaded_by_name: string, created_at: string }> }>}
 */
export async function getDocuments(token, type) {
  const url = `${getApiBaseUrl()}/documents?type=${type}`
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
 * @returns {Promise<{ data: { id: number, name: string, type: string, created_at: string } }>}
 */
export async function uploadDocument(token, formData) {
  const url = `${getApiBaseUrl()}/documents`
  const res = await apiFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      // Note: Do NOT set Content-Type for FormData; the browser will set it with the correct boundary.
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
 * @returns {Promise<{ message: string }>}
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
 * Downloads a document by ID.
 * @param {string} token
 * @param {number} id
 * @param {string} filename
 */
export async function downloadDocument(token, id, filename) {
  const url = `${getApiBaseUrl()}/documents/${id}/download` // Assuming /download endpoint exists based on standard practices, but the user didn't specify.
  // Wait, the user said "we should also have download option and logic".
  // Let's assume the API provides a way. Often it's just a file link or a /download endpoint.
  // Since the GET /documents returns names and mime types, we can use the location if provided or a specialized endpoint.
  // I will implement a generic fetch and blob download if the specific endpoint isn't documented.
  
  // NOTE: If the backend provides a direct URL, we can use that. 
  // Let's check the GET response again. It doesn't have a URL.
  // I'll assume standard download behavior.
  
  const res = await apiFetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  
  if (!res.ok) {
    throw new Error('Failed to download document')
  }

  const blob = await res.blob()
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(downloadUrl)
}
