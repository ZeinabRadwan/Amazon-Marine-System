/**
 * Customer Services API – integrates with backend Customer Service endpoints.
 * Tickets, Ticket Types, Communication Logs, Shipment Tracking (see api/shipments).
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
 * GET {{base_url}}/tickets
 * Query: per_page, page, search, status, ticket_type_id, priority_id, client_id, assigned_to_id, sort, direction
 * Response: { data: Ticket[], meta: { total, last_page, current_page, per_page } }
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
  if (params.sort != null && params.sort !== '') searchParams.set('sort', params.sort)
  if (params.direction != null && params.direction !== '') searchParams.set('direction', params.direction)
  const query = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/tickets${query ? `?${query}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list tickets (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/tickets/export
 * Query: status, priority_id, client_id
 * Returns: blob (CSV)
 */
export async function exportTickets(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.status != null && params.status !== '') searchParams.set('status', params.status)
  if (params.priority_id != null) searchParams.set('priority_id', String(params.priority_id))
  if (params.client_id != null && params.client_id !== '') searchParams.set('client_id', String(params.client_id))
  const query = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/tickets/export${query ? `?${query}` : ''}`, { headers: authHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export tickets (${res.status})`)
  }
  return res.blob()
}

/**
 * GET {{base_url}}/communication-logs
 * Query: per_page, page, communication_log_type_id, related, client_id, search
 * Response: { data: CommunicationLog[], meta: { total, last_page, current_page, per_page } }
 */
export async function listCommunicationLogs(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.communication_log_type_id != null) searchParams.set('communication_log_type_id', String(params.communication_log_type_id))
  if (params.related != null && params.related !== '') searchParams.set('related', params.related)
  if (params.client_id != null && params.client_id !== '') searchParams.set('client_id', String(params.client_id))
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.sort != null && params.sort !== '') searchParams.set('sort', params.sort)
  if (params.direction != null && params.direction !== '') searchParams.set('direction', params.direction)
  const query = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/communication-logs${query ? `?${query}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list communication logs (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/communication-logs
 * Body: { client_id, communication_log_type_id, subject?, client_said?, issue?, reply? }
 */
export async function createCommunicationLog(token, body) {
  const res = await fetch(`${getBaseUrl()}/communication-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create communication log (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/communication-logs/:id
 */
export async function getCommunicationLog(token, id) {
  const res = await fetch(`${getBaseUrl()}/communication-logs/${id}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get communication log (${res.status})`)
  return data
}

// ——— Ticket types ———
export async function listTicketTypes(token) {
  const res = await fetch(`${getBaseUrl()}/ticket-types`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list ticket types (${res.status})`)
  return data
}

// ——— Ticket priorities ———
export async function listTicketPriorities(token) {
  const res = await fetch(`${getBaseUrl()}/ticket-priorities`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list ticket priorities (${res.status})`)
  return data
}

// ——— Ticket statuses ———
export async function listTicketStatuses(token) {
  const res = await fetch(`${getBaseUrl()}/ticket-statuses`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list ticket statuses (${res.status})`)
  return data
}

// ——— Communication log types ———
export async function listCommunicationLogTypes(token) {
  const res = await fetch(`${getBaseUrl()}/communication-log-types`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list communication log types (${res.status})`)
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

/**
 * POST {{base_url}}/tickets/:id/replies
 * Body: { body: string }
 */
export async function createTicketReply(token, ticketId, body) {
  const res = await fetch(`${getBaseUrl()}/tickets/${ticketId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to add reply (${res.status})`)
  return data
}

export async function deleteTicket(token, id) {
  const res = await fetch(`${getBaseUrl()}/tickets/${id}`, { method: 'DELETE', headers: authHeaders(token) })
  if (res.status === 204) return { message: 'Ticket deleted.' }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete ticket (${res.status})`)
  return data
}
