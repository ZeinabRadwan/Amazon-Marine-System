import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

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

export async function listSeaPricingRegions(token, params = {}, fetchInit = {}) {
  const searchParams = new URLSearchParams()
  if (params.q) searchParams.set('q', String(params.q))
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/pricing/offers/sea-regions${query ? `?${query}` : ''}`
  const res = await apiFetch(url, { headers: authHeaders(token), ...fetchInit })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list regions (${res.status})`)
  return data
}

export async function listOffers(token, params = {}, fetchInit = {}) {
  const searchParams = new URLSearchParams()
  if (params.pricing_type) searchParams.set('pricing_type', params.pricing_type)
  if (params.region) searchParams.set('region', params.region)
  if (params.pod) searchParams.set('pod', params.pod)
  if (params.pol) searchParams.set('pol', params.pol)
  if (params.pricing_item_code) searchParams.set('pricing_item_code', params.pricing_item_code)
  if (params.shipping_line) searchParams.set('shipping_line', params.shipping_line)
  if (params.inland_port) searchParams.set('inland_port', params.inland_port)
  if (params.destination) searchParams.set('destination', params.destination)
  if (params.status) searchParams.set('status', params.status)
  if (params.q) searchParams.set('q', params.q)
  if (params.per_page) searchParams.set('per_page', String(params.per_page))
  if (params.page) searchParams.set('page', String(params.page))

  const query = searchParams.toString()
  const url = `${getBaseUrl()}/pricing/offers${query ? `?${query}` : ''}`

  const res = await apiFetch(url, { headers: authHeaders(token), ...fetchInit })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list offers (${res.status})`)
  return data
}

export async function getOffer(token, id) {
  const url = `${getBaseUrl()}/pricing/offers/${id}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get offer (${res.status})`)
  return data
}

export async function createOffer(token, payload) {
  const url = `${getBaseUrl()}/pricing/offers`
  const res = await apiFetch(url, {
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
  const res = await apiFetch(url, {
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
  const res = await apiFetch(url, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to activate offer (${res.status})`)
  return data
}

export async function archiveOffer(token, id) {
  const url = `${getBaseUrl()}/pricing/offers/${id}/archive`
  const res = await apiFetch(url, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to archive offer (${res.status})`)
  return data
}

export async function listQuotes(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.client_id) searchParams.set('client_id', String(params.client_id))
  if (params.q) searchParams.set('q', params.q)
  if (params.per_page) searchParams.set('per_page', String(params.per_page))
  if (params.page) searchParams.set('page', String(params.page))

  const query = searchParams.toString()
  const url = `${getBaseUrl()}/pricing/quotes${query ? `?${query}` : ''}`

  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list quotes (${res.status})`)
  return data
}

export async function getQuote(token, id) {
  const url = `${getBaseUrl()}/pricing/quotes/${id}`
  const res = await apiFetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get quote (${res.status})`)
  return data
}

export async function createQuote(token, payload) {
  const url = `${getBaseUrl()}/pricing/quotes`
  const res = await apiFetch(url, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create quote (${res.status})`)
  return data
}

export async function updateQuote(token, id, payload) {
  const url = `${getBaseUrl()}/pricing/quotes/${id}`
  const res = await apiFetch(url, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update quote (${res.status})`)
  return data
}

export async function acceptQuote(token, id) {
  const url = `${getBaseUrl()}/pricing/quotes/${id}/accept`
  const res = await apiFetch(url, { method: 'POST', headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to accept quote (${res.status})`)
  return data
}

export async function rejectQuote(token, id) {
  const url = `${getBaseUrl()}/pricing/quotes/${id}/reject`
  const res = await apiFetch(url, { method: 'POST', headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to reject quote (${res.status})`)
  return data
}

/** GET quotation PDF (Bearer auth; blob — open via object URL). */
export async function downloadQuotePdf(token, quoteId, options = {}) {
  const locale = options.locale && String(options.locale).toLowerCase().startsWith('ar') ? 'ar' : 'en'
  const res = await apiFetch(`${getBaseUrl()}/pricing/quotes/${encodeURIComponent(quoteId)}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf',
      'X-App-Locale': locale,
    },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to download quotation PDF (${res.status})`)
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') || ''
  const m = cd.match(/filename="?([^";]+)"?/i)
  const filename = m?.[1]?.trim() || `quote-${quoteId}.pdf`
  return { blob, filename }
}
