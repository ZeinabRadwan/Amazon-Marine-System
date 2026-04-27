/**
 * Expenses API – shipment-linked expenses, categories, CRUD (accounting permissions).
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
 * @param {string} token
 * @param {{ bl?: string, search?: string, month?: string, category?: string, currency?: string, sort?: string }} params
 */
export async function listShipmentExpenses(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.bl != null && params.bl !== '') searchParams.set('bl', String(params.bl))
  if (params.shipment_id != null && params.shipment_id !== '') searchParams.set('shipment_id', String(params.shipment_id))
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.month != null && params.month !== '') searchParams.set('month', params.month)
  if (params.category != null && params.category !== '') searchParams.set('category', String(params.category))
  if (params.currency != null && params.currency !== '') searchParams.set('currency', params.currency)
  if (params.sort != null && params.sort !== '') searchParams.set('sort', params.sort)
  const query = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/expenses/shipment${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load shipment expenses (${res.status})`)
  }
  const data = json.data ?? json
  return { data: Array.isArray(data) ? data : [] }
}

/**
 * GET /expenses/summary?months=
 * @param {string} token
 * @param {{ months?: number }} [params]
 */
export async function getExpensesSummary(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.months != null && params.months !== '') searchParams.set('months', String(params.months))
  const query = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/expenses/summary${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load expenses summary (${res.status})`)
  }
  return json.data ?? json
}

/**
 * GET /expenses/general
 * @param {string} token
 * @param {{ search?: string, month?: string, category?: string, currency?: string, sort?: string }} params
 */
export async function listGeneralExpenses(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.month != null && params.month !== '') searchParams.set('month', params.month)
  if (params.category != null && params.category !== '') searchParams.set('category', String(params.category))
  if (params.currency != null && params.currency !== '') searchParams.set('currency', params.currency)
  if (params.sort != null && params.sort !== '') searchParams.set('sort', params.sort)
  const query = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/expenses/general${query ? `?${query}` : ''}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load general expenses (${res.status})`)
  }
  const data = json.data ?? json
  return { data: Array.isArray(data) ? data : [] }
}

/**
 * GET /expenses/export — CSV stream.
 * @param {string} token
 * @param {{ type?: 'all'|'shipment'|'general', search?: string, month?: string, currency?: string }} params
 * @returns {Promise<Blob>}
 */
export async function exportExpensesCsv(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.type != null && params.type !== '') searchParams.set('type', String(params.type))
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.month != null && params.month !== '') searchParams.set('month', params.month)
  if (params.currency != null && params.currency !== '') searchParams.set('currency', params.currency)
  const query = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/expenses/export${query ? `?${query}` : ''}`, {
    headers: { ...authHeaders(token), Accept: 'text/csv,*/*' },
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = `Export failed (${res.status})`
    try {
      const j = JSON.parse(text)
      if (j.message) msg = j.message
      else if (typeof j.error === 'string') msg = j.error
    } catch {
      if (text) msg = text.slice(0, 300)
    }
    throw new Error(msg)
  }
  return res.blob()
}

/**
 * @param {string} token
 */
export async function listExpenseCategories(token) {
  const res = await apiFetch(`${getBaseUrl()}/expense-categories`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load expense categories (${res.status})`)
  }
  return { data: json.data ?? [] }
}

/**
 * @param {string} token
 * @param {{
 *   type: 'shipment' | 'general',
 *   expense_category_id: number,
 *   shipment_id?: number,
 *   description: string,
 *   amount: number,
 *   currency_code: string,
 *   expense_date: string,
 *   payment_method?: string,
 *   invoice_number?: string,
 *   vendor_id?: number,
 * }} body
 */
export async function createExpense(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/expenses`, {
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

/**
 * @param {string} token
 * @param {number} id
 * @param {Record<string, unknown>} body
 */
export async function updateExpense(token, id, body) {
  const res = await apiFetch(`${getBaseUrl()}/expenses/${id}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to update expense (${res.status})`)
  }
  return json.data ?? json
}

/**
 * @param {string} token
 * @param {number} id
 */
export async function deleteExpense(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/expenses/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to delete expense (${res.status})`)
  }
  return json
}

/**
 * @param {string} token
 * @param {number} expenseId
 * @param {File} file
 */
export async function uploadExpenseReceipt(token, expenseId, file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await apiFetch(`${getBaseUrl()}/expenses/${expenseId}/receipt`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: fd,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to upload receipt (${res.status})`)
  }
  return json.data ?? json
}

/**
 * Streams/downloads the stored receipt file for an expense.
 * @param {string} token
 * @param {number} expenseId
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function downloadExpenseReceipt(token, expenseId) {
  const res = await apiFetch(`${getBaseUrl()}/expenses/${expenseId}/receipt`, {
    headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.message || json.error || `Failed to download receipt (${res.status})`)
  }
  const blob = await res.blob()
  const cd = res.headers.get('Content-Disposition') || ''
  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(cd)
  const filename = match ? match[1].replace(/['"]/g, '') : `receipt-${expenseId}`
  return { blob, filename }
}

/**
 * Rename stored receipt filename for an expense.
 * @param {string} token
 * @param {number} expenseId
 * @param {string} name
 */
export async function renameExpenseReceipt(token, expenseId, name) {
  const res = await apiFetch(`${getBaseUrl()}/expenses/${expenseId}/receipt`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to rename receipt (${res.status})`)
  }
  return json.data ?? json
}

/**
 * Delete stored receipt for an expense only.
 * @param {string} token
 * @param {number} expenseId
 */
export async function deleteExpenseReceipt(token, expenseId) {
  const res = await apiFetch(`${getBaseUrl()}/expenses/${expenseId}/receipt`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to delete receipt (${res.status})`)
  }
  return json.data ?? json
}

/**
 * Returns the receipt download URL for direct use in an anchor tag (with token).
 * @param {string} token
 * @param {number} expenseId
 */
export function getExpenseReceiptUrl(expenseId) {
  return `${getBaseUrl()}/expenses/${expenseId}/receipt`
}
