/**
 * Pricing ocean container types vs inland truck types — separate datasets.
 */

import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/** @param {'ocean_container'|'inland_truck'} dataset */
export async function listPricingFreightUnitTypes(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.dataset) searchParams.set('dataset', params.dataset)
  if (params.q != null && params.q !== '') searchParams.set('q', params.q)
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/pricing/freight-unit-types${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list freight unit types (${res.status})`)
  return data
}

export async function createPricingFreightUnitType(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/pricing/freight-unit-types`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create freight unit type (${res.status})`)
  return data
}
