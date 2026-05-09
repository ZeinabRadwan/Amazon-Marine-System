/**
 * Cash wallets API — operational treasury wallets (NSP / Vodafone Cash / Cash Treasury).
 * Backed by the same `bank_accounts` table as banks but exposed as a dedicated resource so
 * the Settings module can treat them as an independent entity. The backend auto-seeds the
 * three canonical wallets on every read, so the list is never empty.
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

/** GET {{base_url}}/cash-wallets */
export async function listCashWallets(token) {
  const res = await apiFetch(`${getBaseUrl()}/cash-wallets`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load cash wallets (${res.status})`)
  return data
}

/** GET {{base_url}}/cash-wallets/{id} */
export async function getCashWallet(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/cash-wallets/${id}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load cash wallet (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/cash-wallets
 *
 * @param {string} token
 * @param {{
 *   bank_name: string,
 *   account_name?: string | null,
 *   cash_wallet_kind: 'nsp' | 'vodafone' | 'physical',
 *   supported_currencies?: string[],
 *   is_active?: boolean,
 * }} body
 */
export async function createCashWallet(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/cash-wallets`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create cash wallet (${res.status})`)
  return data
}

/**
 * PATCH {{base_url}}/cash-wallets/{id}
 *
 * Only `bank_name`, `account_name`, and `is_active` may change after creation. The
 * `cash_wallet_kind` is intentionally locked because it pins currency rules and ledger identity.
 *
 * @param {string} token
 * @param {number|string} id
 * @param {{ bank_name?: string, account_name?: string | null, is_active?: boolean }} body
 */
export async function updateCashWallet(token, id, body) {
  const res = await apiFetch(`${getBaseUrl()}/cash-wallets/${id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update cash wallet (${res.status})`)
  return data
}
