/**
 * Settings & Sessions API – matches back/postman_collection.json "Settings & Sessions" module.
 * - GET  /settings
 * - PUT  /settings/company/profile
 * - PUT  /settings/company/location
 * - PUT  /settings/system/preferences
 * - PUT  /settings/notifications/preferences
 * - PUT  /settings/sessions
 * - GET  /sessions/today
 * - GET  /sessions/history
 * - POST /sessions/logout-others
 * - GET  /activities
 * - CRUD /shipment-statuses
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

export async function getSettings(token) {
  const res = await apiFetch(`${getBaseUrl()}/settings`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load settings (${res.status})`)
  return data
}

export async function updateCompanyProfile(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/settings/company/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update company profile (${res.status})`)
  return data
}

export async function updateAttendancePolicy(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/settings/attendance/policy`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to save attendance policy (${res.status})`)
  return data
}

export async function updateCompanyLocation(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/settings/company/location`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update company location (${res.status})`)
  return data
}

export async function updateSystemPreferences(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/settings/system/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update system preferences (${res.status})`)
  return data
}

export async function updateNotificationPreferences(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/settings/notifications/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update notification preferences (${res.status})`)
  return data
}

export async function updateSessionSettings(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/settings/sessions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update session settings (${res.status})`)
  return data
}

export async function getTodaySession(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.user_id != null && params.user_id !== '') searchParams.set('user_id', String(params.user_id))
  const q = searchParams.toString()
  const url = `${getBaseUrl()}/sessions/today${q ? `?${q}` : ''}`
  const res = await apiFetch(url, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load today session (${res.status})`)
  return data
}

export async function listSessionsHistory(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.user_id != null && params.user_id !== '') searchParams.set('user_id', String(params.user_id))
  const q = searchParams.toString()
  const url = `${getBaseUrl()}/sessions/history${q ? `?${q}` : ''}`
  const res = await apiFetch(url, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load sessions history (${res.status})`)
  return data
}

export async function logoutOtherSessions(token) {
  const res = await apiFetch(`${getBaseUrl()}/sessions/logout-others`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to logout other sessions (${res.status})`)
  return data
}

export async function listActivities(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.event) searchParams.set('event', params.event)
  if (params.subject_type) searchParams.set('subject_type', params.subject_type)
  if (params.subject_id != null && params.subject_id !== '') searchParams.set('subject_id', String(params.subject_id))
  if (params.user_id != null && params.user_id !== '') searchParams.set('user_id', String(params.user_id))
  const q = searchParams.toString()
  const url = `${getBaseUrl()}/activities${q ? `?${q}` : ''}`
  const res = await apiFetch(url, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load activity history (${res.status})`)
  return data
}

export async function listShipmentStatuses(token) {
  const res = await apiFetch(`${getBaseUrl()}/shipment-statuses`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load shipment statuses (${res.status})`)
  return data
}

export async function createShipmentStatus(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipment-statuses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create shipment status (${res.status})`)
  return data
}

export async function updateShipmentStatus(token, id, body) {
  const res = await apiFetch(`${getBaseUrl()}/shipment-statuses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update shipment status (${res.status})`)
  return data
}

export async function deleteShipmentStatus(token, id) {
  const res = await apiFetch(`${getBaseUrl()}/shipment-statuses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete shipment status (${res.status})`)
  return data
}

