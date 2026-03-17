/**
 * Attendance API – matches back/postman_collection.json Attendance module.
 * - POST /attendance/check-in   – Check-in (body: { notes? })
 * - POST /attendance/check-out  – Check-out (body: { notes? })
 * - GET  /attendance            – List Attendance (query: user_id, date, from, to)
 * - GET  /attendance/stats      – Attendance Stats (query: date)
 * - GET  /attendance/today      – Attendance Today
 */

const getBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL
  if (base) return base
  const host = import.meta.env.VITE_API_URL
  return host ? `${host.replace(/\/$/, '')}/api/v1` : 'http://localhost:8000/api/v1'
}

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * POST {{base_url}}/attendance/check-in – Check-in
 * Body: { notes?: string }
 */
export async function checkIn(token, body = {}) {
  const res = await fetch(`${getBaseUrl()}/attendance/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Check-in failed (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/attendance/check-out – Check-out
 * Body: { notes?: string }
 */
export async function checkOut(token, body = {}) {
  const res = await fetch(`${getBaseUrl()}/attendance/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Check-out failed (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/attendance – List Attendance
 * Query: user_id, date, from, to
 */
export async function listAttendance(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.user_id != null && params.user_id !== '') searchParams.set('user_id', String(params.user_id))
  if (params.date != null && params.date !== '') searchParams.set('date', params.date)
  if (params.from != null && params.from !== '') searchParams.set('from', params.from)
  if (params.to != null && params.to !== '') searchParams.set('to', params.to)
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/attendance${query ? `?${query}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list attendance (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/attendance/stats – Attendance Stats
 * Query: date (YYYY-MM-DD, default today)
 */
export async function getAttendanceStats(token, params = {}) {
  const date = params.date != null && params.date !== '' ? params.date : ''
  const url = `${getBaseUrl()}/attendance/stats${date ? `?date=${encodeURIComponent(date)}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get attendance stats (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/attendance/today – Attendance Today
 */
export async function getAttendanceToday(token) {
  const res = await fetch(`${getBaseUrl()}/attendance/today`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get today's attendance (${res.status})`)
  return data
}
