/**
 * Customer Services API – stub for future backend integration.
 * Replace with real endpoints when backend is ready.
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

/** Mock list when backend is not ready (404/5xx). */
function mockList(params = {}) {
  const page = Number(params.page) || 1
  const perPage = Number(params.per_page) || 50
  const total = 0
  return {
    data: [],
    meta: { total, last_page: 1, current_page: page, per_page: perPage },
  }
}

/**
 * List customer service items (search/filter/sort/pagination).
 * Returns mock empty data if endpoint is not available (404/501).
 */
export async function listCustomerServices(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.q != null && params.q !== '') searchParams.set('q', params.q)
  if (params.status != null && params.status !== '') searchParams.set('status', params.status)
  if (params.sort != null) searchParams.set('sort', params.sort)
  if (params.direction != null) searchParams.set('direction', params.direction)
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/customer-services${query ? `?${query}` : ''}`
  try {
    const res = await fetch(url, { headers: authHeaders(token) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 404 || res.status === 501) return mockList(params)
      throw new Error(data.message || data.error || `Failed to list (${res.status})`)
    }
    return data
  } catch (err) {
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      return mockList(params)
    }
    throw err
  }
}

/**
 * Get single customer service item.
 */
export async function getCustomerService(token, id) {
  const res = await fetch(`${getBaseUrl()}/customer-services/${id}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get customer service (${res.status})`)
  return data
}

/**
 * Create customer service item.
 */
export async function createCustomerService(token, body) {
  const res = await fetch(`${getBaseUrl()}/customer-services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create (${res.status})`)
  return data
}

/**
 * Update customer service item.
 */
export async function updateCustomerService(token, id, body) {
  const res = await fetch(`${getBaseUrl()}/customer-services/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update (${res.status})`)
  return data
}

/**
 * Delete customer service item.
 */
export async function deleteCustomerService(token, id) {
  const res = await fetch(`${getBaseUrl()}/customer-services/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (res.status === 204) return {}
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/tickets
 * Query: per_page, page, search, status, ticket_type_id, priority_id, client_id, assigned_to_id
 */
export async function listTickets(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.status != null && params.status !== '') searchParams.set('status', params.status)
  if (params.ticket_type_id != null) searchParams.set('ticket_type_id', String(params.ticket_type_id))
  if (params.priority_id != null) searchParams.set('priority_id', String(params.priority_id))
  if (params.client_id != null) searchParams.set('client_id', String(params.client_id))
  if (params.assigned_to_id != null) searchParams.set('assigned_to_id', String(params.assigned_to_id))
  const query = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/tickets${query ? `?${query}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list tickets (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/communication-logs
 * Query: per_page, page, communication_log_type_id, related (client|shipment|ticket)
 */
export async function listCommunicationLogs(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.communication_log_type_id != null) searchParams.set('communication_log_type_id', String(params.communication_log_type_id))
  if (params.related != null && params.related !== '') searchParams.set('related', params.related)
  const query = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/communication-logs${query ? `?${query}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list communication logs (${res.status})`)
  return data
}

// ——— Ticket types ———
export async function listTicketTypes(token) {
  const res = await fetch(`${getBaseUrl()}/ticket-types`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list ticket types (${res.status})`)
  return data
}

export async function getTicketType(token, id) {
  const res = await fetch(`${getBaseUrl()}/ticket-types/${id}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get ticket type (${res.status})`)
  return data
}

export async function updateTicketType(token, id, body) {
  const res = await fetch(`${getBaseUrl()}/ticket-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update ticket type (${res.status})`)
  return data
}

export async function deleteTicketType(token, id) {
  const res = await fetch(`${getBaseUrl()}/ticket-types/${id}`, { method: 'DELETE', headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete ticket type (${res.status})`)
  return data
}

// ——— Ticket stats ———
export async function getTicketStats(token) {
  const res = await fetch(`${getBaseUrl()}/tickets/stats`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get ticket stats (${res.status})`)
  return data
}

// ——— Single ticket ———
export async function getTicket(token, id) {
  const res = await fetch(`${getBaseUrl()}/tickets/${id}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get ticket (${res.status})`)
  return data
}

export async function createTicket(token, body) {
  const res = await fetch(`${getBaseUrl()}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create ticket (${res.status})`)
  return data
}

export async function updateTicket(token, id, body) {
  const res = await fetch(`${getBaseUrl()}/tickets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update ticket (${res.status})`)
  return data
}

export async function deleteTicket(token, id) {
  const res = await fetch(`${getBaseUrl()}/tickets/${id}`, { method: 'DELETE', headers: authHeaders(token) })
  if (res.status === 204) return { message: 'Ticket deleted.' }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete ticket (${res.status})`)
  return data
}
