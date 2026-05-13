/**
 * SD Forms API – matches back/postman_collection.json SD Forms module.
 * List, stats, charts, CRUD, submit, send-to-operations, link-shipment, email-operations, pdf, export.
 */

import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * GET {{base_url}}/sd-forms – List SD Forms
 * Query: status, sales_rep_id, client_id, search, from, to, sort, direction, page, per_page
 */
export async function listSDForms(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.status != null && params.status !== '') searchParams.set('status', params.status)
  if (params.sales_rep_id != null && params.sales_rep_id !== '') searchParams.set('sales_rep_id', String(params.sales_rep_id))
  if (params.client_id != null && params.client_id !== '') searchParams.set('client_id', String(params.client_id))
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.from != null && params.from !== '') searchParams.set('from', params.from)
  if (params.to != null && params.to !== '') searchParams.set('to', params.to)
  if (params.sort != null) searchParams.set('sort', params.sort)
  if (params.direction != null) searchParams.set('direction', params.direction)
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/sd-forms${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list SD forms (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/booking-confirmation/sd-forms – SD forms for booking-confirmation upload (admin + operations only).
 * Query: per_page (max 2000)
 */
export async function listSDFormsForBookingConfirmation(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/booking-confirmation/sd-forms${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || data.error || `Failed to load SD forms (${res.status})`)
  }
  return data
}

/**
 * GET {{base_url}}/sd-forms/stats – SD Forms Stats
 */
export async function getSDFormStats(token) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/stats`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get SD form stats (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/sd-forms/charts?months=6 – SD Forms Charts
 */
export async function getSDFormCharts(token, params = {}) {
  const months = params.months != null ? params.months : 6
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/charts?months=${months}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get SD form charts (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/sd-forms/:id – Show SD Form
 */
export async function getSDForm(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${id}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get SD form (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/sd-forms – Create SD Form (draft)
 */
export async function createSDForm(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create SD form (${res.status})`)
  return data
}

/**
 * PUT {{base_url}}/sd-forms/:id – Update SD Form
 */
export async function updateSDForm(token, id, body) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update SD form (${res.status})`)
  return data
}

/**
 * DELETE {{base_url}}/sd-forms/:id – Delete SD Form
 */
export async function deleteSDForm(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to delete SD form (${res.status})`)
  }
  return res.json().catch(() => ({}))
}

/**
 * POST {{base_url}}/sd-forms/:id/submit – Submit SD Form
 */
export async function submitSDForm(token, id, body = {}) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to submit SD form (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/sd-forms/:id/send-to-operations – Send to Operations
 */
export async function sendSDFormToOperations(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${id}/send-to-operations`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to send to operations (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/sd-forms/:id/link-shipment – Link Shipment. Body: { shipment_id }
 */
export async function linkSDFormShipment(token, id, body) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${id}/link-shipment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to link shipment (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/sd-forms/:id/email-operations – Email to Operations
 */
export async function emailSDFormToOperations(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${id}/email-operations`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const raw = await res.text()
  let data = {}
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    data = {}
  }
  if (!res.ok) {
    const fallback = raw ? raw.slice(0, 300) : ''
    throw new Error(data.message || data.error || fallback || `Failed to email operations (${res.status})`)
  }
  return data
}

/**
 * GET {{base_url}}/sd-forms/:id/pdf – Download SD Form PDF (returns blob)
 */
export async function getSDFormPdf(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${id}/pdf`, { headers: authHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to get PDF (${res.status})`)
  }
  return res.blob()
}

/**
 * GET {{base_url}}/sd-forms/export – Export SD Forms. Query: ids (optional, comma-separated)
 */
export async function exportSDForms(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.ids != null && params.ids !== '') searchParams.set('ids', params.ids)
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/sd-forms/export${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export (${res.status})`)
  }
  return res.blob()
}

/**
 * GET /sd-forms/:id/booking-confirmations
 */
export async function listSDFormBookingConfirmations(token, sdFormId) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${encodeURIComponent(sdFormId)}/booking-confirmations`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load booking confirmations (${res.status})`)
  return data
}

/**
 * POST /sd-forms/:id/booking-confirmations (multipart: file)
 */
export async function uploadSDFormBookingConfirmation(token, sdFormId, file, onUploadProgress) {
  const formData = new FormData()
  formData.append('file', file)
  if (typeof onUploadProgress === 'function') {
    const url = `${getBaseUrl()}/sd-forms/${encodeURIComponent(sdFormId)}/booking-confirmations`
    const json = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      xhr.setRequestHeader('Accept', 'application/json')
      xhr.upload.onprogress = onUploadProgress
      xhr.onerror = () => reject(new Error('Network error during upload'))
      xhr.onload = () => {
        let parsed = {}
        try {
          parsed = JSON.parse(xhr.responseText || '{}')
        } catch {
          parsed = {}
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed)
        } else {
          reject(new Error(parsed.message || parsed.error || `Upload failed (${xhr.status})`))
        }
      }
      xhr.send(formData)
    })
    return json
  }
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${encodeURIComponent(sdFormId)}/booking-confirmations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Upload failed (${res.status})`)
  return data
}

/**
 * POST /sd-forms/:id/confirm-booking (multipart: file)
 * Operations confirms a booking, uploading a confirmation document. Updates status to booking_confirmed.
 */
export async function confirmSDFormBooking(token, sdFormId, file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${encodeURIComponent(sdFormId)}/confirm-booking`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to confirm booking (${res.status})`)
  return data
}

/**
 * POST /sd-forms/:id/cancel-booking
 * Operations cancels a booking, providing a reason. Updates status to booking_cancelled.
 */
export async function cancelSDFormBooking(token, sdFormId, reason) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${encodeURIComponent(sdFormId)}/cancel-booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ reason }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to cancel booking (${res.status})`)
  return data
}

/**
 * POST /sd-forms/:id/convert-to-shipment
 * Admin / form owner marks the SD form as fully completed and converted to an active shipment.
 */
export async function convertSDFormToShipment(token, sdFormId) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${encodeURIComponent(sdFormId)}/convert-to-shipment`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to convert SD form (${res.status})`)
  return data
}

/**
 * POST /sd-forms/:id/reopen-converted
 * Admin-only. Reopen a converted SD form back to an editable operations state.
 */
export async function reopenConvertedSDForm(token, sdFormId) {
  const res = await apiFetch(`${getBaseUrl()}/sd-forms/${encodeURIComponent(sdFormId)}/reopen-converted`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to reopen SD form (${res.status})`)
  return data
}

export async function downloadSDFormBookingConfirmation(token, sdFormId, confirmationId) {
  const res = await apiFetch(
    `${getBaseUrl()}/sd-forms/${encodeURIComponent(sdFormId)}/booking-confirmations/${encodeURIComponent(confirmationId)}/download`,
    { headers: authHeaders(token) }
  )
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.message || json.error || `Download failed (${res.status})`)
  }
  const blob = await res.blob()
  const contentDisposition = res.headers.get('Content-Disposition')
  let filename = ''
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/)
    if (match) filename = match[1]
  }
  return { blob, filename }
}
