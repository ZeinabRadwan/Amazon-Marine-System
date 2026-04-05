import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function listAdminNotifications(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.event_key) searchParams.set('event_key', params.event_key)
  if (params.channel) searchParams.set('channel', params.channel)
  if (params.status) searchParams.set('status', params.status)
  if (params.user_id != null && params.user_id !== '') searchParams.set('user_id', String(params.user_id))
  if (params.causer_id != null && params.causer_id !== '') searchParams.set('causer_id', String(params.causer_id))
  if (params.entity_type) searchParams.set('entity_type', params.entity_type)
  if (params.entity_id != null && params.entity_id !== '') searchParams.set('entity_id', String(params.entity_id))
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  const q = searchParams.toString()
  const url = `${getBaseUrl()}/admin/notifications${q ? `?${q}` : ''}`
  const res = await apiFetch(url, {
    method: 'GET',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load notification logs (${res.status})`)
  return data
}

export async function getAdminNotificationStats(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  const q = searchParams.toString()
  const url = `${getBaseUrl()}/admin/notifications/stats${q ? `?${q}` : ''}`
  const res = await apiFetch(url, {
    method: 'GET',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load notification stats (${res.status})`)
  return data
}

