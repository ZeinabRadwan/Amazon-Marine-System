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
