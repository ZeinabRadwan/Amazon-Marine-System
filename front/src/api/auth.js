/**
 * Auth API – matches back/postman_collection.json Auth module.
 * Base URL: http://localhost:8000/api/v1 (or VITE_API_BASE_URL).
 */

import { getApiBaseUrl } from './apiBaseUrl'

const getBaseUrl = getApiBaseUrl

function formatCauseChain(err) {
  const chain = []
  let c = err?.cause
  let depth = 0
  while (c != null && depth < 5) {
    chain.push(c instanceof Error ? `${c.name}: ${c.message}` : String(c))
    c = c instanceof Error ? c.cause : null
    depth += 1
  }
  return chain.length ? chain.join(' → ') : ''
}

/**
 * fetch() often rejects with only TypeError "Failed to fetch". Attach URL, origin,
 * optional cause chain, and env hint (dev) so the UI can show actionable context.
 */
function wrapNetworkError(err, url) {
  const name = err?.name || 'Error'
  const baseMsg = err?.message || String(err)
  const isAbort = name === 'AbortError'
  const isOpaqueNetworkFailure =
    name === 'TypeError' &&
    (baseMsg === 'Failed to fetch' ||
      baseMsg === 'Load failed' ||
      /NetworkError|Failed to load/i.test(baseMsg))

  if (!isAbort && !isOpaqueNetworkFailure) {
    return err instanceof Error ? err : new Error(String(err))
  }

  const parts = [`${name}: ${baseMsg}`]
  if (typeof window !== 'undefined') {
    parts.push(`page origin: ${window.location.origin}`)
  }
  parts.push(`request: ${url}`)
  if (import.meta.env.DEV) {
    const fromEnv = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
    parts.push(`env: ${fromEnv ? `VITE_API_* set` : 'VITE_API_* unset (using apiBaseUrl.js defaults)'}`)
  }
  const underlying = formatCauseChain(err)
  if (underlying) parts.push(`underlying: ${underlying}`)
  parts.push(
    'Browsers do not expose whether this was CORS, DNS, TLS, or server down — use DevTools → Network (red row) and Console for the real reason.'
  )

  const wrapped = new Error(parts.join(' | '))
  wrapped.cause = err
  return wrapped
}

async function apiFetch(url, init) {
  try {
    return await fetch(url, init)
  } catch (err) {
    throw wrapNetworkError(err, url)
  }
}

/**
 * POST {{base_url}}/auth/login
 * Body: { email, password }
 * Returns: { token?, user? } or error response
 */
export async function login(email, password) {
  const res = await apiFetch(`${getBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || data.error || `Login failed (${res.status})`)
  }
  return data
}

/**
 * GET {{base_url}}/profile – Profile (me), requires Authorization: Bearer <token>
 */
export async function getProfile(token) {
  const res = await apiFetch(`${getBaseUrl()}/profile`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Unauthorized')
  return data
}

/** Alias for getProfile for backward compatibility */
export async function getMe(token) {
  return getProfile(token)
}

/**
 * PUT {{base_url}}/profile – Update profile, requires Bearer token
 * Body: { name?, email? }
 */
export async function updateProfile(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Update failed (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/profile/avatar – Upload profile avatar (multipart/form-data)
 * Body: FormData with "avatar" file (image: jpg, jpeg, png, max 2MB)
 * Returns: { user } with avatar_url
 */
export async function uploadProfileAvatar(token, file) {
  const formData = new FormData()
  formData.append('avatar', file)
  const res = await apiFetch(`${getBaseUrl()}/profile/avatar`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data.message || data.errors?.avatar?.[0] || data.error || `Upload failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

/**
 * PUT {{base_url}}/profile/password – Change password (self), requires Bearer token
 * Body: { current_password, password, password_confirmation }
 */
export async function changePassword(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/profile/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Change password failed (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/auth/logout – requires Authorization: Bearer <token>
 */
export async function logout(token) {
  await apiFetch(`${getBaseUrl()}/auth/logout`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
}
