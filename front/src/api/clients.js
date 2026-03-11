/**
 * Clients API – matches back/postman_collection.json Clients module.
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
  if (params.status != null && params.status !== '') searchParams.set('status', params.status)
  if (params.assigned_sales_id != null && params.assigned_sales_id !== '') searchParams.set('assigned_sales_id', params.assigned_sales_id)
  if (params.lead_source_id != null && params.lead_source_id !== '') searchParams.set('lead_source_id', params.lead_source_id)
  if (params.sort != null) searchParams.set('sort', params.sort)
  if (params.direction != null) searchParams.set('direction', params.direction)
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/clients${query ? `?${query}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list clients (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id – Get Client Detail
 */
export async function getClient(token, clientId) {
  const res = await fetch(`${getBaseUrl()}/clients/${clientId}`, {
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
  const res = await fetch(`${getBaseUrl()}/clients`, {
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
  const res = await fetch(`${getBaseUrl()}/clients/${clientId}`, {
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
  const res = await fetch(`${getBaseUrl()}/clients/${clientId}`, {
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
  const res = await fetch(`${getBaseUrl()}/clients/stats`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client stats (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/charts?months=6 – Client Charts
 */
export async function getClientCharts(token, params = {}) {
  const months = params.months != null ? params.months : 6
  const res = await fetch(`${getBaseUrl()}/clients/charts?months=${months}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client charts (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/financial-summary – Financial Summary
 */
export async function getFinancialSummary(token) {
  const res = await fetch(`${getBaseUrl()}/clients/financial-summary`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get financial summary (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/pricing – Pricing List
 */
export async function getPricingList(token) {
  const res = await fetch(`${getBaseUrl()}/clients/pricing`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get pricing list (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/export – Export Clients
 */
export async function exportClients(token, params = {}) {
  const searchParams = new URLSearchParams(params)
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/clients/export${query ? `?${query}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
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
  const res = await fetch(`${getBaseUrl()}/clients/bulk-assign`, {
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
  const res = await fetch(`${getBaseUrl()}/clients/${clientId}/visits`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client visits (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id/shipments?per_page=10 – Get Client Shipments
 */
export async function getClientShipments(token, clientId, params = {}) {
  const perPage = params.per_page != null ? params.per_page : 10
  const res = await fetch(`${getBaseUrl()}/clients/${clientId}/shipments?per_page=${perPage}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get client shipments (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/clients/:id/attachments – Get Client Attachments
 */
export async function getClientAttachments(token, clientId) {
  const res = await fetch(`${getBaseUrl()}/clients/${clientId}/attachments`, { headers: authHeaders(token) })
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
  const res = await fetch(`${getBaseUrl()}/clients/${clientId}/attachments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to upload attachment (${res.status})`)
  return data
}

/**
 * DELETE {{base_url}}/clients/:id/attachments/:attachmentId – Delete Client Attachment
 */
export async function deleteClientAttachment(token, clientId, attachmentId) {
  const res = await fetch(`${getBaseUrl()}/clients/${clientId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to delete attachment (${res.status})`)
  }
  return res.json().catch(() => ({}))
}
