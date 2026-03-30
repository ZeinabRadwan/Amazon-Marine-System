/**
 * Ports API – POL/POD for SD Forms (and client lookups). GET /ports from Postman.
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
 * GET {{base_url}}/ports – List ports. Query: q, active (boolean string)
 */
export async function listPorts(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.q != null && params.q !== '') searchParams.set('q', params.q)
  if (params.active != null && params.active !== '') searchParams.set('active', String(params.active))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/ports${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list ports (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/ports – Create port. Body: { name, code?, country?, active? }
 */
export async function createPort(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/ports`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create port (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/ports/:id – Show port
 */
export async function getPort(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/ports/${encodeURIComponent(id)}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load port (${res.status})`)
  return data
}

/**
 * PUT {{base_url}}/ports/:id – Update port
 */
export async function updatePort(token, id, body) {
  const res = await apiFetch(`${getBaseUrl()}/ports/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update port (${res.status})`)
  return data
}

/**
 * DELETE {{base_url}}/ports/:id – Delete port
 */
export async function deletePort(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/ports/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete port (${res.status})`)
  return data
}
