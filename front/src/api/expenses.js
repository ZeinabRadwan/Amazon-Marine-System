/**
 * Expenses API – shipment-linked expenses, categories, CRUD (accounting permissions).
 */

import { getApiBaseUrl } from './apiBaseUrl'

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
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.month != null && params.month !== '') searchParams.set('month', params.month)
  if (params.category != null && params.category !== '') searchParams.set('category', String(params.category))
  if (params.currency != null && params.currency !== '') searchParams.set('currency', params.currency)
  if (params.sort != null && params.sort !== '') searchParams.set('sort', params.sort)
  const query = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/expenses/shipment${query ? `?${query}` : ''}`, {
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
 * @param {string} token
 */
export async function listExpenseCategories(token) {
  const res = await fetch(`${getBaseUrl()}/expense-categories`, {
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
  const res = await fetch(`${getBaseUrl()}/expenses`, {
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
  const res = await fetch(`${getBaseUrl()}/expenses/${id}`, {
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
  const res = await fetch(`${getBaseUrl()}/expenses/${id}`, {
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
  const res = await fetch(`${getBaseUrl()}/expenses/${expenseId}/receipt`, {
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
