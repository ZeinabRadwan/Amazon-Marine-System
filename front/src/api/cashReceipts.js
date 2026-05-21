import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function getEligibleCashReceiptCustomers(token, search = '') {
  const sp = new URLSearchParams()
  if (search?.trim()) sp.set('search', search.trim())
  const q = sp.toString()
  const res = await apiFetch(`${getBaseUrl()}/cash-receipts/eligible-customers${q ? `?${q}` : ''}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load customers (${res.status})`)
  return data
}

export async function listCashReceipts(token, params = {}) {
  const sp = new URLSearchParams()
  if (params.client_id) sp.set('client_id', String(params.client_id))
  const q = sp.toString()
  const res = await apiFetch(`${getBaseUrl()}/cash-receipts${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load cash receipts (${res.status})`)
  return data
}

export async function getReceiptablePayments(token, clientId) {
  const res = await apiFetch(
    `${getBaseUrl()}/accounting/customer-statements/${encodeURIComponent(String(clientId))}/receiptable-payments`,
    { headers: authHeaders(token) },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load payments (${res.status})`)
  return data
}

export async function previewCashReceipt(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/cash-receipts/preview`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      data.errors && typeof data.errors === 'object'
        ? Object.values(data.errors).flat().find((m) => typeof m === 'string')
        : data.message || data.error
    throw new Error(msg || `Preview failed (${res.status})`)
  }
  return data.data ?? data
}

export async function createCashReceipt(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/cash-receipts`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      data.errors && typeof data.errors === 'object'
        ? Object.values(data.errors).flat().find((m) => typeof m === 'string')
        : data.message || data.error
    throw new Error(msg || `Failed to create receipt (${res.status})`)
  }
  return data.data ?? data
}

export async function downloadCashReceiptPdf(token, receiptId) {
  const res = await apiFetch(`${getBaseUrl()}/cash-receipts/${encodeURIComponent(String(receiptId))}/pdf`, {
    headers: { Authorization: `Bearer ${token}`, Accept: '*/*' },
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.message || json.error || `Failed to download PDF (${res.status})`)
  }
  const blob = await res.blob()
  return { blob, filename: `cash-receipt-${receiptId}.pdf` }
}

export function openCashReceiptPdf(token, receiptId) {
  return downloadCashReceiptPdf(token, receiptId).then(({ blob, filename }) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  })
}
