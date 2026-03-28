/**
 * Clients API – matches back/postman_collection.json Clients module (15 endpoints).
 * 1. GET  /clients                      – List Clients (search/filter/sort)
 * 2. POST /clients                      – Create Client
 * 3. GET  /clients/:id                  – Get Client Detail
 * 4. PUT  /clients/:id                  – Update Client
 * 5. DELETE /clients/:id                – Delete Client
 * 6. GET  /clients/stats                – Client Stats
 * 7. GET  /clients/charts?months=6      – Client Charts
 * 8. GET  /clients/financial-summary    – Financial Summary
 * 9. GET  /clients/pricing              – Pricing List
 * 10. GET /clients/export               – Export Clients
 * 11. GET /clients/:id/visits           – Get Client Visits
 * 12. GET /clients/:id/shipments        – Get Client Shipments
 * 13. GET /clients/:id/attachments      – Get Client Attachments
 * 14. POST /clients/:id/attachments     – Post Client Attachment
 * 15. DELETE /clients/:id/attachments/:id – Delete Client Attachment
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
 * GET {{base_url}}/clients – List Clients (search/filter/sort/pagination)
 * Query: q, status, assigned_sales_id, lead_source_id, sort, direction, page, per_page
 */
export async function listClients(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.q != null && params.q !== '') searchParams.set('q', params.q)
  if (params.status_id != null && params.status_id !== '') searchParams.set('status', String(params.status_id))
  if (params.assigned_sales_id != null && params.assigned_sales_id !== '') searchParams.set('assigned_sales_id', params.assigned_sales_id)
  if (params.lead_source_id != null && params.lead_source_id !== '') searchParams.set('lead_source_id', params.lead_source_id)
  if (params.client_type != null && params.client_type !== '') searchParams.set('client_type', String(params.client_type))
  if (params.sort != null) searchParams.set('sort', params.sort)
  if (params.direction != null) searchParams.set('direction', params.direction)
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/clients${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list clients (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id – Get Client Detail
 */
export async function getClient(token, clientId) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/clients – Create Client
 */
export async function createClient(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create client (${res.status})`)
  return data
}

/**
 * PUT {{base_url}}/clients/:id – Update Client
 */
export async function updateClient(token, clientId, body) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update client (${res.status})`)
  return data
}

/**
 * DELETE {{base_url}}/clients/:id – Delete Client
 */
export async function deleteClient(token, clientId) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to delete client (${res.status})`)
  }
  return res.json().catch(() => ({}))
}

/**
 * GET {{base_url}}/clients/stats – Client Stats
 */
export async function getClientStats(token) {
  const res = await apiFetch(`${getBaseUrl()}/clients/stats`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client stats (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/charts?months=6 – Client Charts
 */
export async function getClientCharts(token, params = {}) {
  const months = params.months != null ? params.months : 6
  const res = await apiFetch(`${getBaseUrl()}/clients/charts?months=${months}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client charts (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/financial-summary – Financial Summary (global)
 */
export async function getFinancialSummary(token) {
  const res = await apiFetch(`${getBaseUrl()}/clients/financial-summary`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get financial summary (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id/financial-summary – Financial Summary for one client
 */
export async function getClientFinancialSummary(token, clientId) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/financial-summary`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client financial summary (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/pricing – Pricing List (global)
 * Query: search, pricing_tier, min_discount, max_discount, sort, direction
 */
export async function getPricingList(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.pricing_tier != null && params.pricing_tier !== '') searchParams.set('pricing_tier', params.pricing_tier)
  if (params.min_discount != null && params.min_discount !== '') searchParams.set('min_discount', String(params.min_discount))
  if (params.max_discount != null && params.max_discount !== '') searchParams.set('max_discount', String(params.max_discount))
  if (params.sort != null) searchParams.set('sort', params.sort)
  if (params.direction != null) searchParams.set('direction', params.direction)
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/clients/pricing${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get pricing list (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id/pricing – Pricing List for one client
 */
export async function getClientPricingList(token, clientId) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/pricing`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client pricing list (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/export – Export Clients
 */
export async function exportClients(token, params = {}) {
  const searchParams = new URLSearchParams(params)
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/clients/export${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export clients (${res.status})`)
  }
  return res.blob()
}

/**
 * POST {{base_url}}/clients/bulk-assign – Bulk Assign Sales
 * Body: { client_ids: number[], assigned_sales_id: number }
 */
export async function bulkAssignSales(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/clients/bulk-assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to bulk assign (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id/visits – Get Client Visits
 */
export async function getClientVisits(token, clientId) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/visits`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client visits (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id/shipments – Get Client Shipments
 * Query: per_page, page
 */
export async function getClientShipments(token, clientId, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  else searchParams.set('per_page', '10')
  if (params.page != null) searchParams.set('page', String(params.page))
  const query = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/shipments?${query}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client shipments (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id/attachments – Get Client Attachments
 */
export async function getClientAttachments(token, clientId) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/attachments`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client attachments (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/clients/:id/attachments – Post Client Attachment (multipart/form-data)
 */
export async function postClientAttachment(token, clientId, file) {
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to upload attachment (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id/attachments/:attachmentId/download – Download Client Attachment (returns blob).
 * Pass absoluteDownloadUrl from the attachments list `url` when the API provides it.
 */
export async function getClientAttachmentDownload(token, clientId, attachmentId, absoluteDownloadUrl) {
  const url =
    typeof absoluteDownloadUrl === 'string' && absoluteDownloadUrl.startsWith('http')
      ? absoluteDownloadUrl
      : `${getBaseUrl()}/clients/${clientId}/attachments/${attachmentId}/download`
  const res = await apiFetch(url, {
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to download attachment (${res.status})`)
  }
  return res.blob()
}

/**
 * DELETE {{base_url}}/clients/:id/attachments/:attachmentId – Delete Client Attachment
 */
export async function deleteClientAttachment(token, clientId, attachmentId) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to delete attachment (${res.status})`)
  }
  return res.json().catch(() => ({}))
}

/**
 * GET {{base_url}}/clients/:id/notes – List Client Notes (Quick Notes)
 */
export async function getClientNotes(token, clientId) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/notes`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client notes (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/clients/:id/notes – Create Client Note (Quick Note)
 * Body: { content?: string } or sales-guidance fields (current_need, pain_points, opportunity, special_requirements)
 */
export async function postClientNote(token, clientId, body = {}) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create note (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id/follow-ups – List Client Follow-ups
 */
export async function getClientFollowUps(token, clientId) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/follow-ups`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get follow-ups (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/clients/:id/follow-ups – Create Client Follow-up
 * Body: { type: 'phone'|'email'|'visit'|'whatsapp'|'meeting', occurred_at, summary?, next_follow_up_at? }
 */
function firstValidationMessage(data) {
  if (!data?.errors || typeof data.errors !== 'object') return null
  const msgs = Object.values(data.errors)
    .flat()
    .filter((m) => typeof m === 'string' && m.trim() !== '')
  return msgs.length ? msgs.join(' ') : null
}

export async function postClientFollowUp(token, clientId, body) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/follow-ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const v = firstValidationMessage(data)
    throw new Error(
      v || data.message || data.error || `Failed to create follow-up (${res.status})`,
    )
  }
  return data
}

/**
 * GET {{base_url}}/follow-ups/my-summary — Upcoming / due today / overdue (current user portfolio).
 */
export async function getFollowUpMySummary(token) {
  const res = await apiFetch(`${getBaseUrl()}/follow-ups/my-summary`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load follow-up summary (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/clients/:id/shipments – Create Client Shipment (New Shipment Action)
 * Body: optional origin_port_id, destination_port_id, shipment_direction, mode, shipment_type, status, container_*, loading_*, cargo_description, is_reefer, etc.
 */
export async function createClientShipment(token, clientId, body = {}) {
  const res = await apiFetch(`${getBaseUrl()}/clients/${clientId}/shipments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create shipment (${res.status})`)
  return data
}
