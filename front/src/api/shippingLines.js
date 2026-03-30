/**
 * Shipping lines API – SD Forms dropdown. GET/POST /shipping-lines.
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

export async function listShippingLines(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.q != null && params.q !== '') searchParams.set('q', params.q)
  if (params.active != null && params.active !== '') searchParams.set('active', String(params.active))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/shipping-lines${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list shipping lines (${res.status})`)
  return data
}

export async function createShippingLine(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipping-lines`, {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create shipping line (${res.status})`)
  return data
}
