/**
 * Invoices API – client/vendor invoices, items, payments (financial.* permissions).
 */

import { getApiBaseUrl } from './apiBaseUrl'

const getBaseUrl = getApiBaseUrl

function authHeaders(token, json = true) {
  const h = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

/** Matches InvoiceController currency_id (1 USD, 2 EGP, 3 EUR). */
export const INVOICE_CURRENCY_CODE_TO_ID = {
  USD: 1,
  EGP: 2,
  EUR: 3,
}

export const INVOICE_CURRENCY_ID_TO_CODE = {
  1: 'USD',
  2: 'EGP',
  3: 'EUR',
}

/**
 * @param {string} token
 * @param {{
 *   shipment_id?: number|string,
 *   invoice_type?: string,
 *   status?: string,
 *   client_id?: number|string,
 * }} params
 */
export async function listInvoices(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.shipment_id != null && params.shipment_id !== '') {
    searchParams.set('shipment_id', String(params.shipment_id))
  }
  if (params.invoice_type != null && params.invoice_type !== '') {
    searchParams.set('invoice_type', String(params.invoice_type))
  }
  if (params.status != null && params.status !== '') searchParams.set('status', String(params.status))
  if (params.client_id != null && params.client_id !== '') searchParams.set('client_id', String(params.client_id))
  const q = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/invoices${q ? `?${q}` : ''}`, { headers: authHeaders(token, false) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to list invoices (${res.status})`)
  }
  return { data: json.data ?? [] }
}

/**
 * @param {string} token
 * @param {number} invoiceId
 */
export async function getInvoice(token, invoiceId) {
  const res = await fetch(`${getBaseUrl()}/invoices/${invoiceId}`, { headers: authHeaders(token, false) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load invoice (${res.status})`)
  }
  return json.data ?? json
}

/**
 * @param {string} token
 * @param {{
 *   invoice_type_id: 0|1,
 *   shipment_id?: number|null,
 *   client_id: number,
 *   issue_date: string,
 *   due_date?: string|null,
 *   currency_id: number,
 *   notes?: string|null,
 *   is_vat_invoice?: boolean,
 *   items: Array<{ description: string, quantity: number, unit_price: number }>,
 * }} body
 */
export async function createInvoice(token, body) {
  const res = await fetch(`${getBaseUrl()}/invoices`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to create invoice (${res.status})`)
  }
  return json.data ?? json
}

/**
 * @param {string} token
 * @param {number} invoiceId
 * @param {{
 *   due_date?: string|null,
 *   notes?: string|null,
 *   items?: Array<{ description: string, quantity: number, unit_price: number }>,
 * }} body
 */
export async function updateInvoice(token, invoiceId, body) {
  const res = await fetch(`${getBaseUrl()}/invoices/${invoiceId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to update invoice (${res.status})`)
  }
  return json.data ?? json
}

/**
 * @param {string} token
 * @param {number} invoiceId
 * @param {{
 *   amount: number,
 *   currency_id: number,
 *   method: string,
 *   reference?: string|null,
 *   paid_at?: string|null,
 * }} body
 */
export async function recordInvoicePayment(token, invoiceId, body) {
  const res = await fetch(`${getBaseUrl()}/invoices/${invoiceId}/payments`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to record payment (${res.status})`)
  }
  return json.data ?? json
}
