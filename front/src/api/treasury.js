/**
 * Treasury API – summary, entries CRUD, transfers, expenses.
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

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.search) searchParams.set('search', params.search)
  if (params.type) searchParams.set('type', params.type)
  if (params.account) searchParams.set('account', params.account)
  if (params.currency) searchParams.set('currency', params.currency)
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.months != null && params.months !== '') searchParams.set('months', String(params.months))
  if (params.category_id != null && params.category_id !== '') {
    searchParams.set('category_id', String(params.category_id))
  }
  return searchParams.toString()
}

/**
 * GET /treasury/summary?months=
 * @param {string} token
 * @param {{ months?: number }} [params]
 */
export async function getTreasurySummary(token, params = {}) {
  const q = buildQuery(params)
  const res = await apiFetch(`${getBaseUrl()}/treasury/summary${q ? `?${q}` : ''}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load treasury summary (${res.status})`)
  }
  return json.data ?? json
}

/**
 * GET /treasury/entries
 * @param {string} token
 * @param {{ from?: string, to?: string, search?: string, type?: 'in'|'out', sort?: 'date'|'amount' }} [params]
 */
export async function getTreasuryEntries(token, params = {}) {
  const q = buildQuery(params)
  const res = await apiFetch(`${getBaseUrl()}/treasury/entries${q ? `?${q}` : ''}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load treasury entries (${res.status})`)
  }
  const data = json.data ?? json
  return { data: Array.isArray(data) ? data : [] }
}

/**
 * POST /treasury/entries
 * @param {string} token
 * @param {{
 *   entry_type: 'in'|'out',
 *   source: string,
 *   amount: number,
 *   currency_code: string,
 *   entry_date: string,
 *   description?: string,
 *   notes?: string,
 * }} body
 */
export async function createTreasuryEntry(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/treasury/entries`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to create treasury entry (${res.status})`)
  }
  return json.data ?? json
}

/**
 * PUT /treasury/entries/{id}
 */
export async function updateTreasuryEntry(token, id, body) {
  const res = await apiFetch(`${getBaseUrl()}/treasury/entries/${id}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to update treasury entry (${res.status})`)
  }
  return json.data ?? json
}

/**
 * DELETE /treasury/entries/{id}
 */
export async function deleteTreasuryEntry(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/treasury/entries/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to delete treasury entry (${res.status})`)
  }
  return json
}

/**
 * POST /treasury/transfers
 */
export async function createTreasuryTransfer(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/treasury/transfers`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to record transfer (${res.status})`)
  }
  return json
}

/**
 * GET /treasury/expenses
 */
export async function getTreasuryExpenses(token, params = {}) {
  const q = buildQuery(params)
  const res = await apiFetch(`${getBaseUrl()}/treasury/expenses${q ? `?${q}` : ''}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load treasury expenses (${res.status})`)
  }
  const data = json.data ?? json
  return { data: Array.isArray(data) ? data : [] }
}

/**
 * POST /treasury/expenses
 */
export async function createTreasuryExpense(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/treasury/expenses`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to create expense (${res.status})`)
  }
  return json.data ?? json
}
