/**
 * Shipments API – list shipments and tracking updates.
 * GET  /shipments                      – List shipments (optional include=latest_tracking_update)
 * GET  /shipments/:id/tracking-updates – List tracking updates for a shipment
 * POST /shipments/:id/tracking-updates – Create tracking update
 */

const getBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL
  if (base) return base
  const host = import.meta.env.VITE_API_URL
  return host ? `${host.replace(/\/$/, '')}/api/v1` : 'http://localhost:8000/api/v1'
}

function authHeaders(token) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * GET {{base_url}}/shipments
 * Query: page, per_page, sort, direction, status, bl_number, search|q, include=latest_tracking_update
 * Response: { data: Shipment[], meta: { current_page, last_page, per_page, total } }
 */
export async function listShipments(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  if (params.sort != null) searchParams.set('sort', params.sort)
  if (params.direction != null) searchParams.set('direction', params.direction)
  if (params.status != null && params.status !== '') searchParams.set('status', params.status)
  if (params.bl_number != null && params.bl_number !== '') searchParams.set('bl_number', params.bl_number)
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.q != null && params.q !== '') searchParams.set('q', params.q)
  if (params.include != null) searchParams.set('include', params.include)
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/shipments${query ? `?${query}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to list shipments (${res.status})`)
  }
  return json
}

/**
 * GET {{base_url}}/shipments/:shipmentId/tracking-updates
 * Response: { data: [{ id, shipment_id, update_text, created_by_id, created_at, updated_at, created_by: { id, name, ... } }] }
 */
export async function getShipmentTrackingUpdates(token, shipmentId) {
  const res = await fetch(`${getBaseUrl()}/shipments/${shipmentId}/tracking-updates`, {
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
  const res = await fetch(`${getBaseUrl()}/shipments/${shipmentId}/tracking-updates`, {
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
