/**
 * Attendance API – /api/v1
 * Clock: POST /attendance/clock-in | clock-out (body: latitude?, longitude?, notes?)
 * Legacy aliases: check-in, check-out
 * List: GET /attendance, stats, today
 * Excuses: GET|POST /attendance/excuses
 * Admin: GET /admin/attendance, /admin/attendance/summary, GET|PATCH /admin/excuses
 */

import { getApiBaseUrl } from './apiBaseUrl'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function unwrapPayload(data) {
  if (data && typeof data === 'object' && 'success' in data) {
    if (!data.success && data.message) {
      const err = new Error(data.message)
      err.payload = data.data
      throw err
    }
    return data.data !== undefined ? data.data : data
  }
  return data
}

/**
 * @param {GeolocationPosition} [position]
 */
export function buildClockBody(position, notes = '') {
  const body = {}
  if (notes) body.notes = notes
  if (position?.coords) {
    const lat = position.coords.latitude
    const lng = position.coords.longitude
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      body.latitude = lat
      body.longitude = lng
    }
  }
  return body
}

export async function clockIn(token, body = {}) {
  const res = await fetch(`${getBaseUrl()}/attendance/clock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || data.error || `Clock-in failed (${res.status})`)
  }
  return unwrapPayload(data)
}

export async function clockOut(token, body = {}) {
  const res = await fetch(`${getBaseUrl()}/attendance/clock-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || data.error || `Clock-out failed (${res.status})`)
  }
  return unwrapPayload(data)
}

/** @deprecated use clockIn */
export async function checkIn(token, body = {}) {
  return clockIn(token, body)
}

/** @deprecated use clockOut */
export async function checkOut(token, body = {}) {
  return clockOut(token, body)
}

export async function listAttendance(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.user_id != null && params.user_id !== '') searchParams.set('user_id', String(params.user_id))
  if (params.date != null && params.date !== '') searchParams.set('date', params.date)
  if (params.from != null && params.from !== '') searchParams.set('from', params.from)
  if (params.to != null && params.to !== '') searchParams.set('to', params.to)
  if (params.status != null && params.status !== '') searchParams.set('status', String(params.status))
  if (params.device_type != null && params.device_type !== '') searchParams.set('device_type', String(params.device_type))
  if (params.is_within_radius !== undefined && params.is_within_radius !== null && params.is_within_radius !== '') {
    searchParams.set('is_within_radius', String(params.is_within_radius))
  }
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/attendance${query ? `?${query}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list attendance (${res.status})`)
  return unwrapPayload(data)
}

export async function getAttendanceStats(token, params = {}) {
  const date = params.date != null && params.date !== '' ? params.date : ''
  const url = `${getBaseUrl()}/attendance/stats${date ? `?date=${encodeURIComponent(date)}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get attendance stats (${res.status})`)
  return unwrapPayload(data)
}

export async function getAttendanceToday(token) {
  const res = await fetch(`${getBaseUrl()}/attendance/today`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get today's attendance (${res.status})`)
  return unwrapPayload(data)
}

export async function listMyExcuses(token, params = {}) {
  const q = new URLSearchParams()
  if (params.status) q.set('status', params.status)
  const url = `${getBaseUrl()}/attendance/excuses${q.toString() ? `?${q}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load excuses (${res.status})`)
  return unwrapPayload(data)
}

export async function submitExcuse(token, { date, reason, attachment }) {
  const form = new FormData()
  form.set('date', date)
  form.set('reason', reason)
  if (attachment) form.set('attachment', attachment)
  const res = await fetch(`${getBaseUrl()}/attendance/excuses`, {
    method: 'POST',
    headers: authHeaders(token),
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to submit excuse (${res.status})`)
  return unwrapPayload(data)
}

export async function adminListAttendance(token, params = {}) {
  const q = new URLSearchParams()
  const keys = ['employee_id', 'date_from', 'date_to', 'status', 'device_type', 'is_within_radius', 'page', 'per_page']
  keys.forEach((k) => {
    if (params[k] != null && params[k] !== '') q.set(k, String(params[k]))
  })
  const url = `${getBaseUrl()}/admin/attendance${q.toString() ? `?${q}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Admin attendance failed (${res.status})`)
  return unwrapPayload(data)
}

export async function adminAttendanceSummary(token, params = {}) {
  const q = new URLSearchParams()
  ;['employee_id', 'date_from', 'date_to', 'status', 'device_type', 'is_within_radius'].forEach((k) => {
    if (params[k] != null && params[k] !== '') q.set(k, String(params[k]))
  })
  const url = `${getBaseUrl()}/admin/attendance/summary${q.toString() ? `?${q}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Summary failed (${res.status})`)
  return unwrapPayload(data)
}

export async function adminListExcuses(token, params = {}) {
  const q = new URLSearchParams()
  ;['status', 'employee_id', 'date_from', 'date_to', 'page', 'per_page'].forEach((k) => {
    if (params[k] != null && params[k] !== '') q.set(k, String(params[k]))
  })
  const url = `${getBaseUrl()}/admin/excuses${q.toString() ? `?${q}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Admin excuses failed (${res.status})`)
  return unwrapPayload(data)
}

export async function adminPatchExcuse(token, id, body) {
  const res = await fetch(`${getBaseUrl()}/admin/excuses/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Update failed (${res.status})`)
  return unwrapPayload(data)
}
