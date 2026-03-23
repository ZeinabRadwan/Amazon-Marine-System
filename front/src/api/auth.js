/**
 * Auth API – matches back/postman_collection.json Auth module.
 * Base URL: http://localhost:8000/api/v1 (or VITE_API_BASE_URL).
 */

import { getApiBaseUrl } from './apiBaseUrl'

const getBaseUrl = getApiBaseUrl

/**
 * POST {{base_url}}/auth/login
 * Body: { email, password }
 * Returns: { token?, user? } or error response
 */
export async function login(email, password) {
  const res = await fetch(`${getBaseUrl()}/auth/login`, {
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
  const res = await fetch(`${getBaseUrl()}/profile`, {
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
  const res = await fetch(`${getBaseUrl()}/profile`, {
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
  const res = await fetch(`${getBaseUrl()}/profile/avatar`, {
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
  const res = await fetch(`${getBaseUrl()}/profile/password`, {
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
  await fetch(`${getBaseUrl()}/auth/logout`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
}
