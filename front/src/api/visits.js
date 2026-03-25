/**
 * Visits API – matches back/postman_collection.json Visits module.
 * GET  /visits/stats, /visits/charts, /visits/follow-ups-pending
 * GET  /visits?client_id=&vendor_id=&visitable_type=&user_id=&from=&to=
 * POST /visits
 * GET  /visits/:id
 * PUT  /visits/:id
 * DELETE /visits/:id
 * GET  /vendors/:vendorId/visits (nested)
 */

import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

const getBaseUrl = getApiBaseUrl

export const VISITABLE_TYPE_CLIENT = 'App\\Models\\Client'
export const VISITABLE_TYPE_VENDOR = 'App\\Models\\Vendor'

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/** Map UI filter to Laravel morph class for GET /visits?visitable_type= */
export function visitableTypeForListQuery(kind) {
  if (kind === 'client') return VISITABLE_TYPE_CLIENT
  if (kind === 'vendor') return VISITABLE_TYPE_VENDOR
  return ''
}

/** GET /visits/stats and /visits/charts expect client | vendor (not full class names). */
export function visitableTypeForStatsQuery(kind) {
  if (kind === 'client' || kind === 'vendor') return kind
  return ''
}

/**
 * @param {string} token
 * @param {Record<string, string|number|undefined>} params – client_id, vendor_id, visitable_type, user_id, from, to
 */
export async function listVisits(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.client_id != null && params.client_id !== '') searchParams.set('client_id', String(params.client_id))
  if (params.vendor_id != null && params.vendor_id !== '') searchParams.set('vendor_id', String(params.vendor_id))
  if (params.visitable_type != null && params.visitable_type !== '') {
    searchParams.set('visitable_type', String(params.visitable_type))
  }
  if (params.user_id != null && params.user_id !== '') searchParams.set('user_id', String(params.user_id))
  if (params.from != null && params.from !== '') searchParams.set('from', String(params.from))
  if (params.to != null && params.to !== '') searchParams.set('to', String(params.to))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/visits${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list visits (${res.status})`)
  return data
}

export async function getVisitStats(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from != null && params.from !== '') searchParams.set('from', String(params.from))
  if (params.to != null && params.to !== '') searchParams.set('to', String(params.to))
  if (params.user_id != null && params.user_id !== '') searchParams.set('user_id', String(params.user_id))
  const vt = params.visitable_type
  if (vt != null && vt !== '') searchParams.set('visitable_type', String(vt))
  const query = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/visits/stats${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load visit stats (${res.status})`)
  return data
}

export async function getVisitCharts(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from != null && params.from !== '') searchParams.set('from', String(params.from))
  if (params.to != null && params.to !== '') searchParams.set('to', String(params.to))
  if (params.user_id != null && params.user_id !== '') searchParams.set('user_id', String(params.user_id))
  if (params.visitable_type != null && params.visitable_type !== '') {
    searchParams.set('visitable_type', String(params.visitable_type))
  }
  const query = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/visits/charts${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load visit charts (${res.status})`)
  return data
}

export async function getFollowUpsPending(token) {
  const res = await apiFetch(`${getBaseUrl()}/visits/follow-ups-pending`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load follow-ups (${res.status})`)
  return data
}

export async function getVisit(token, visitId) {
  const res = await apiFetch(`${getBaseUrl()}/visits/${visitId}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load visit (${res.status})`)
  return data
}

export async function createVisit(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/visits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create visit (${res.status})`)
  return data
}

export async function updateVisit(token, visitId, body) {
  const res = await apiFetch(`${getBaseUrl()}/visits/${visitId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update visit (${res.status})`)
  return data
}

export async function deleteVisit(token, visitId) {
  const res = await apiFetch(`${getBaseUrl()}/visits/${visitId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete visit (${res.status})`)
  return data
}

/**
 * GET /vendors/:vendorId/visits
 */
export async function listVendorVisits(token, vendorId) {
  const res = await apiFetch(`${getBaseUrl()}/vendors/${vendorId}/visits`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list vendor visits (${res.status})`)
  return data
}
