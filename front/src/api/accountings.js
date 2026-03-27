/**
 * Accounting API endpoints used by the Accountings page.
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
 * GET {{base_url}}/accounting/stats – Accounting Stats
 */
export async function getAccountingsStats(token, params = {}) {
  const months = params.months != null ? params.months : 6
  const res = await apiFetch(`${getBaseUrl()}/accounting/stats?months=${months}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get accounting stats (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/accounting/charts – Accounting Charts
 */
export async function getAccountingsCharts(token, params = {}) {
  const months = params.months != null ? params.months : 6
  const res = await apiFetch(`${getBaseUrl()}/accounting/charts?months=${months}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get accounting charts (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/accounting/summary – Accounting Summary
 */
export async function getAccountingsSummary(token, params = {}) {
  const months = params.months != null ? params.months : 6
  const res = await apiFetch(`${getBaseUrl()}/accounting/summary?months=${months}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get accounting summary (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/accounting/clients – Client account balances
 */
export async function getAccountingsClientAccounts(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.currency) searchParams.set('currency', params.currency)
  if (params.sort) searchParams.set('sort', params.sort)
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/accounting/clients${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load client accounts (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/accounting/partners – Partner (vendor) account balances
 */
export async function getAccountingsPartnerAccounts(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.currency) searchParams.set('currency', params.currency)
  if (params.partner_type) searchParams.set('partner_type', params.partner_type)
  if (params.sort) searchParams.set('sort', params.sort)
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/accounting/partners${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load partner accounts (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/accounting/clients/export – CSV export
 */
export async function exportAccountingsClients(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.ids?.length) searchParams.set('ids', Array.isArray(params.ids) ? params.ids.join(',') : String(params.ids))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/accounting/clients/export${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export client accounts (${res.status})`)
  }
  return res.blob()
}

/**
 * GET {{base_url}}/accounting/partners/export – CSV export
 */
export async function exportAccountingsPartners(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.ids?.length) searchParams.set('ids', Array.isArray(params.ids) ? params.ids.join(',') : String(params.ids))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/accounting/partners/export${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export partner accounts (${res.status})`)
  }
  return res.blob()
}
