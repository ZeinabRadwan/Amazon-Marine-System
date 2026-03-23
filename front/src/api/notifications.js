/**
 * Notifications API – matches back/postman_collection.json Notifications module.
 * - GET  /notifications              – List My Notifications (query: page, per_page)
 * - GET  /notifications/unread-count – Unread Notifications Count
 * - POST /notifications/:id/read     – Mark Notification Read
 * - POST /notifications/read-all     – Mark All Notifications Read
 */

import { getApiBaseUrl } from './apiBaseUrl'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * GET {{base_url}}/notifications?page=1&per_page=20
 */
export async function listNotifications(token, params = {}) {
  const { page = 1, per_page = 20 } = params
  const q = new URLSearchParams({ page: String(page), per_page: String(per_page) })
  const res = await fetch(`${getBaseUrl()}/notifications?${q}`, {
    method: 'GET',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load notifications (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/notifications/unread-count
 */
export async function getUnreadCount(token) {
  const res = await fetch(`${getBaseUrl()}/notifications/unread-count`, {
    method: 'GET',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get unread count (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/notifications/:id/read
 */
export async function markNotificationRead(token, notificationId) {
  const res = await fetch(`${getBaseUrl()}/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to mark as read (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/notifications/read-all
 */
export async function markAllNotificationsRead(token) {
  const res = await fetch(`${getBaseUrl()}/notifications/read-all`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to mark all as read (${res.status})`)
  return data
}
