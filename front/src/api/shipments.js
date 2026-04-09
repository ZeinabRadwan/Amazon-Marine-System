/**
 * Shipments API – list, CRUD, stats, charts, export, notes (list/create/patch/delete), tracking updates.
 */

import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

const getBaseUrl = getApiBaseUrl

function authHeaders(token, json = true) {
  const h = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

function appendShipmentListParams(searchParams, params = {}) {
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  if (params.sort != null) searchParams.set('sort', params.sort)
  if (params.direction != null) searchParams.set('direction', params.direction)
  if (params.status != null && params.status !== '') searchParams.set('status', params.status)
  if (params.operations_status != null && params.operations_status !== '') {
    searchParams.set('operations_status', String(params.operations_status))
  }
  if (params.client_id != null && params.client_id !== '') searchParams.set('client_id', String(params.client_id))
  if (params.sales_rep_id != null && params.sales_rep_id !== '') {
    searchParams.set('sales_rep_id', String(params.sales_rep_id))
  }
  if (params.line_vendor_id != null && params.line_vendor_id !== '') {
    searchParams.set('line_vendor_id', String(params.line_vendor_id))
  }
  if (params.month != null && params.month !== '') searchParams.set('month', params.month)
  if (params.from != null && params.from !== '') searchParams.set('from', params.from)
  if (params.to != null && params.to !== '') searchParams.set('to', params.to)
  if (params.sd_number != null && params.sd_number !== '') searchParams.set('sd_number', params.sd_number)
  if (params.bl_number != null && params.bl_number !== '') searchParams.set('bl_number', params.bl_number)
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.q != null && params.q !== '') searchParams.set('q', params.q)
  if (params.include != null) searchParams.set('include', params.include)
}

/**
 * GET {{base_url}}/shipments
 * Response: { data: Shipment[], meta: { current_page, last_page, per_page, total, from, to } }
 */
export async function listShipments(token, params = {}) {
  const searchParams = new URLSearchParams()
  appendShipmentListParams(searchParams, params)
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/shipments${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to list shipments (${res.status})`)
  }
  return json
}

export async function getShipment(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to load shipment (${res.status})`)
  return json
}

export async function createShipment(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to create shipment (${res.status})`)
  return json
}

export async function updateShipment(token, shipmentId, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to update shipment (${res.status})`)
  return json
}

export async function deleteShipment(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to delete shipment (${res.status})`)
  return json
}

function filenameFromContentDisposition(cd) {
  if (!cd || typeof cd !== 'string') return null
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd)
  if (star) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      return star[1].trim()
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(cd)
  if (quoted) return quoted[1]
  const plain = /filename=([^;]+)/i.exec(cd)
  if (plain) return plain[1].trim().replace(/^["']|["']$/g, '')
  return null
}

/** GET shipment PDF (binary). Uses same auth as other shipment routes. */
export async function downloadShipmentPdf(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf',
    },
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.message || json.error || `Failed to export PDF (${res.status})`)
  }
  const blob = await res.blob()
  const filename =
    filenameFromContentDisposition(res.headers.get('Content-Disposition')) || `shipment-${shipmentId}.pdf`
  return { blob, filename }
}

export async function getShipmentStats(token) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/stats`, { headers: authHeaders(token) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to load shipment stats (${res.status})`)
  return json
}

export async function getShipmentCharts(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.months != null) searchParams.set('months', String(params.months))
  const query = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/shipments/charts${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to load shipment charts (${res.status})`)
  return json
}

/** Same filters as list (optional ids comma-separated). Returns CSV blob. */
export async function exportShipments(token, params = {}) {
  const searchParams = new URLSearchParams()
  appendShipmentListParams(searchParams, params)
  if (params.ids != null && params.ids !== '') searchParams.set('ids', String(params.ids))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/shipments/export${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token, false) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export shipments (${res.status})`)
  }
  return res.blob()
}

export async function listShipmentNotes(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/notes`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to load notes (${res.status})`)
  const data = json.data ?? json
  return { data: Array.isArray(data) ? data : [] }
}

export async function postShipmentNote(token, shipmentId, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/notes`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to add note (${res.status})`)
  return json
}

export async function patchShipmentNote(token, shipmentId, noteId, body) {
  const res = await apiFetch(
    `${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/notes/${encodeURIComponent(noteId)}`,
    {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to update note (${res.status})`)
  return json
}

export async function deleteShipmentNote(token, shipmentId, noteId) {
  const res = await apiFetch(
    `${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/notes/${encodeURIComponent(noteId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    }
  )
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to delete note (${res.status})`)
  return json
}

/**
 * GET {{base_url}}/shipments/:shipmentId/tracking-updates
 */
export async function getShipmentTrackingUpdates(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${shipmentId}/tracking-updates`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load tracking updates (${res.status})`)
  }
  const data = json.data ?? json.tracking_updates ?? json
  return { data: Array.isArray(data) ? data : [] }
}

/**
 * POST {{base_url}}/shipments/:shipmentId/tracking-updates
 * Body: { update_text: string }
 */
export async function postShipmentTrackingUpdate(token, shipmentId, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${shipmentId}/tracking-updates`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to add tracking update (${res.status})`)
  }
  return json
}

/**
 * POST {{base_url}}/shipments/:shipmentId/notify-sales-financials
 */
export async function notifyShipmentSalesFinancials(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${shipmentId}/notify-sales-financials`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to notify sales (${res.status})`)
  }
  return json
}

export async function getShipmentOperations(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/operations`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load operations (${res.status})`)
  }
  return json
}

export async function updateShipmentOperations(token, shipmentId, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/operations`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to update operations (${res.status})`)
  }
  return json
}

export async function getShipmentTasks(token, shipmentId) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/tasks`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load tasks (${res.status})`)
  }
  return json
}

export async function bulkUpdateShipmentTasks(token, shipmentId, tasks) {
  const res = await apiFetch(`${getBaseUrl()}/shipments/${encodeURIComponent(shipmentId)}/tasks`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ tasks }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to update tasks (${res.status})`)
  }
  return json
}
