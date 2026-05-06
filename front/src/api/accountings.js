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

/**
 * GET {{base_url}}/accounting/partners-ledger – Partner ledger summary
 */
export async function getPartnerLedgerSummary(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.category) searchParams.set('category', params.category)
  if (params.vendor_id) searchParams.set('vendor_id', String(params.vendor_id))
  if (params.status) searchParams.set('status', params.status)
  if (params.date_from) searchParams.set('date_from', params.date_from)
  if (params.date_to) searchParams.set('date_to', params.date_to)
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/accounting/partners-ledger${q ? `?${q}` : ''}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load partner ledger (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/accounting/partners-ledger/{partnerId} – Partner ledger detail rows
 */
export async function getPartnerLedgerDetail(token, partnerId) {
  const res = await apiFetch(`${getBaseUrl()}/accounting/partners-ledger/${partnerId}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || data.error || `Failed to load partner ledger details (${res.status})`)
  }
  return data
}

/**
 * GET {{base_url}}/bank-accounts
 */
export async function listBankAccounts(token) {
  const res = await apiFetch(`${getBaseUrl()}/bank-accounts`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load bank accounts (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/bank-accounts
 */
export async function createBankAccount(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/bank-accounts`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create bank account (${res.status})`)
  return data
}

/**
 * PUT {{base_url}}/bank-accounts/{id}
 */
export async function updateBankAccount(token, id, body) {
  const res = await apiFetch(`${getBaseUrl()}/bank-accounts/${id}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update bank account (${res.status})`)
  return data
}

/**
 * DELETE {{base_url}}/bank-accounts/{id}
 */
export async function deleteBankAccount(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/bank-accounts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete bank account (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/payments – generic record payment endpoint
 */
export async function recordPayment(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/payments`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to record payment (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/payments
 */
export async function listPayments(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.type) searchParams.set('type', params.type)
  if (params.client_id) searchParams.set('client_id', String(params.client_id))
  if (params.vendor_id) searchParams.set('vendor_id', String(params.vendor_id))
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/payments${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list payments (${res.status})`)
  return data
}

export async function getCompanyStatement(token) {
  const res = await apiFetch(`${getBaseUrl()}/accounting/company-statement`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load company statement (${res.status})`)
  return data
}

export async function getCustomerStatements(token, params = {}) {
  const sp = new URLSearchParams()
  if (params.search) sp.set('search', params.search)
  if (params.status) sp.set('status', params.status)
  if (params.date_from) sp.set('date_from', params.date_from)
  if (params.date_to) sp.set('date_to', params.date_to)
  if (params.shipment_id) sp.set('shipment_id', String(params.shipment_id))
  const q = sp.toString()
  const res = await apiFetch(`${getBaseUrl()}/accounting/customer-statements${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load customer statements (${res.status})`)
  return data
}

export async function getCustomerStatementDetail(token, customerId) {
  const res = await apiFetch(`${getBaseUrl()}/accounting/customer-statements/${customerId}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load customer statement detail (${res.status})`)
  return data
}
