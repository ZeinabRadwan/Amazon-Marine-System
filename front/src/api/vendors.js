/**
 * Vendors API – matches back/postman_collection.json Vendors module.
 */

import { getApiBaseUrl } from './apiBaseUrl'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function listVendors(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.type != null && params.type !== '') searchParams.set('type', String(params.type))
  if (params.search != null && params.search !== '') searchParams.set('search', String(params.search))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/vendors${query ? `?${query}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list vendors (${res.status})`)
  return data
}

export async function getVendorStats(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.type != null && params.type !== '') searchParams.set('type', String(params.type))
  if (params.currency != null && params.currency !== '') searchParams.set('currency', String(params.currency))
  const query = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/vendors/stats${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load vendor stats (${res.status})`)
  return data
}

export async function getVendorCharts(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.type != null && params.type !== '') searchParams.set('type', String(params.type))
  if (params.months != null) searchParams.set('months', String(params.months))
  const query = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/vendors/charts${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load vendor charts (${res.status})`)
  return data
}

export async function exportVendors(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.type != null && params.type !== '') searchParams.set('type', String(params.type))
  if (params.search != null && params.search !== '') searchParams.set('search', String(params.search))
  if (params.has_balance != null && params.has_balance !== '') searchParams.set('has_balance', String(params.has_balance))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/vendors/export${query ? `?${query}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export vendors (${res.status})`)
  }
  return res.blob()
}

export async function getVendor(token, vendorId) {
  const res = await fetch(`${getBaseUrl()}/vendors/${vendorId}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get vendor (${res.status})`)
  return data
}

export async function createVendor(token, body) {
  const res = await fetch(`${getBaseUrl()}/vendors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create vendor (${res.status})`)
  return data
}

export async function updateVendor(token, vendorId, body) {
  const res = await fetch(`${getBaseUrl()}/vendors/${vendorId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update vendor (${res.status})`)
  return data
}

export async function deleteVendor(token, vendorId) {
  const res = await fetch(`${getBaseUrl()}/vendors/${vendorId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete vendor (${res.status})`)
  return data
}

/**
 * GET /vendors/:id/visits
 */
export async function getVendorVisits(token, vendorId) {
  const res = await fetch(`${getBaseUrl()}/vendors/${vendorId}/visits`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get vendor visits (${res.status})`)
  return data
}
