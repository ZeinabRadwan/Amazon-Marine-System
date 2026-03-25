import { getApiBaseUrl } from './apiBaseUrl'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function authHeadersFormData(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function listOffers(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.pricing_type) searchParams.set('pricing_type', params.pricing_type)
  if (params.region) searchParams.set('region', params.region)
  if (params.pod) searchParams.set('pod', params.pod)
  if (params.shipping_line) searchParams.set('shipping_line', params.shipping_line)
  if (params.inland_port) searchParams.set('inland_port', params.inland_port)
  if (params.destination) searchParams.set('destination', params.destination)
  if (params.status) searchParams.set('status', params.status)
  if (params.q) searchParams.set('q', params.q)
  if (params.per_page) searchParams.set('per_page', String(params.per_page))
  if (params.page) searchParams.set('page', String(params.page))

  const query = searchParams.toString()
  const url = `${getBaseUrl()}/pricing/offers${query ? `?${query}` : ''}`
  
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list offers (${res.status})`)
  return data
}

export async function getOffer(token, id) {
  const url = `${getBaseUrl()}/pricing/offers/${id}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get offer (${res.status})`)
  return data
}

export async function createOffer(token, payload) {
  const url = `${getBaseUrl()}/pricing/offers`
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create offer (${res.status})`)
  return data
}

export async function updateOffer(token, id, payload) {
  const url = `${getBaseUrl()}/pricing/offers/${id}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update offer (${res.status})`)
  return data
}

export async function activateOffer(token, id) {
  const url = `${getBaseUrl()}/pricing/offers/${id}/activate`
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to activate offer (${res.status})`)
  return data
}

export async function archiveOffer(token, id) {
  const url = `${getBaseUrl()}/pricing/offers/${id}/archive`
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to archive offer (${res.status})`)
  return data
}
