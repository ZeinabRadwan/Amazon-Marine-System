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
  if (params.currency_id != null && params.currency_id !== '') searchParams.set('currency_id', String(params.currency_id))
  if (params.search != null && params.search !== '') searchParams.set('search', String(params.search))
  if (params.month != null && params.month !== '') searchParams.set('month', String(params.month))
  if (params.sort != null && params.sort !== '') searchParams.set('sort', String(params.sort))
  if (params.per_page != null && params.per_page !== '') searchParams.set('per_page', String(params.per_page))
  if (params.page != null && params.page !== '') searchParams.set('page', String(params.page))
  const q = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/invoices${q ? `?${q}` : ''}`, { headers: authHeaders(token, false) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to list invoices (${res.status})`)
  }
  return { data: json.data ?? [], meta: json.meta ?? null }
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
  const currencyId =
    body.currency_id ??
    (body.currency_code ? INVOICE_CURRENCY_CODE_TO_ID[String(body.currency_code).toUpperCase()] : undefined)
  const invoiceTypeId =
    body.invoice_type_id ??
    (String(body.invoice_type || '').toLowerCase() === 'vendor' ? 1 : 0)

  const payload = {
    invoice_type_id: invoiceTypeId,
    shipment_id: body.shipment_id ?? null,
    client_id: body.client_id,
    issue_date: body.issue_date,
    due_date: body.due_date ?? null,
    currency_id: currencyId,
    notes: body.notes ?? null,
    is_vat_invoice: body.is_vat_invoice ?? false,
    items: body.items ?? [],
  }

  const res = await fetch(`${getBaseUrl()}/invoices`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
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
  const currencyId =
    body.currency_id ??
    (body.currency_code ? INVOICE_CURRENCY_CODE_TO_ID[String(body.currency_code).toUpperCase()] : undefined)

  const payload = {
    amount: body.amount,
    currency_id: currencyId,
    method: body.method,
    reference: body.reference ?? null,
    paid_at: body.paid_at ?? null,
  }

  const res = await fetch(`${getBaseUrl()}/invoices/${invoiceId}/payments`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to record payment (${res.status})`)
  }
  return json.data ?? json
}

export async function getInvoicesSummary(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.months != null && params.months !== '') searchParams.set('months', String(params.months))
  const q = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/invoices/summary${q ? `?${q}` : ''}`, { headers: authHeaders(token, false) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to load invoices summary (${res.status})`)
  return json
}

export async function issueInvoice(token, invoiceId) {
  const res = await fetch(`${getBaseUrl()}/invoices/${invoiceId}/issue`, {
    method: 'POST',
    headers: authHeaders(token, false),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to issue invoice (${res.status})`)
  return json.data ?? json
}

export async function cancelInvoice(token, invoiceId) {
  const res = await fetch(`${getBaseUrl()}/invoices/${invoiceId}/cancel`, {
    method: 'POST',
    headers: authHeaders(token, false),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `Failed to cancel invoice (${res.status})`)
  return json.data ?? json
}

export async function exportInvoicesCsv(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.invoice_type) searchParams.set('invoice_type', String(params.invoice_type))
  if (params.status) searchParams.set('status', String(params.status))
  if (params.client_id) searchParams.set('client_id', String(params.client_id))
  if (params.shipment_id) searchParams.set('shipment_id', String(params.shipment_id))
  if (params.currency_id) searchParams.set('currency_id', String(params.currency_id))
  if (params.search) searchParams.set('search', String(params.search))
  if (params.month) searchParams.set('month', String(params.month))
  if (Array.isArray(params.ids) && params.ids.length) searchParams.set('ids', params.ids.join(','))

  const q = searchParams.toString()
  const res = await fetch(`${getBaseUrl()}/invoices/export${q ? `?${q}` : ''}`, {
    headers: authHeaders(token, false),
  })

  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.message || json.error || `Failed to export invoices (${res.status})`)
  }

  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoices-export-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
