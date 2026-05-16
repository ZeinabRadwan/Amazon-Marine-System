/**
 * Shared helpers for in-app notifications (API shape from Laravel DatabaseNotification).
 */

import { formatDateTime } from './dateUtils'

/** API may return { data: { count } } or legacy shapes */
export function extractUnreadCountFromResponse(res) {
  if (res == null) return 0
  const n = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v))
  if (res.unread_count != null) return n(res.unread_count) || 0
  if (res.count != null) return n(res.count) || 0
  if (res.data?.unread_count != null) return n(res.data.unread_count) || 0
  if (res.data?.count != null) return n(res.data.count) || 0
  return 0
}

/**
 * @param {unknown} notification
 * @returns {Record<string, unknown>}
 */
export function parseNotificationData(notification) {
  let data = notification?.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      data = {}
    }
  }
  if (!data || typeof data !== 'object') data = {}
  return /** @type {Record<string, unknown>} */ (data)
}

function humanizeTypeKey(type) {
  const s = String(type || '').trim()
  if (!s) return ''
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const LARAVEL_TYPE_HINTS = {
  OperationSDFormNotification: 'sd_form.sent_to_operations',
  SdFormBookingConfirmationUploadedNotification: 'sd_form.booking_confirmation_uploaded',
  SdFormInformationRequestedNotification: 'sd_form.information_requested',
  SdFormInformationCompletedNotification: 'sd_form.information_completed',
  ShipmentSalesFinancialsNotification: 'shipment.notify_sales_financials',
  ShipmentOperationTaskReminderNotification: 'shipment.operation_task_reminder',
  ClientFollowUpReminderNotification: 'client_follow_up.reminder',
  ExcuseDecisionNotification: 'excuse.decision',
}

/**
 * Business subtype from payload `type`, or inferred from Laravel `notification.type` class string.
 */
export function getNotificationBusinessType(notification) {
  const data = parseNotificationData(notification)
  if (typeof data.type === 'string' && data.type.trim()) return data.type.trim()
  const lt = String(notification?.type || '')
  const short = lt.split('\\').pop() || ''
  return LARAVEL_TYPE_HINTS[short] || short || 'generic'
}

/**
 * @param {string|undefined|null} iso
 * @param {string} language i18n language (e.g. en, ar)
 */
export function formatNotificationRelativeTime(iso, language) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  const now = Date.now()
  const diffMs = d.getTime() - now
  let diffSec = Math.round(diffMs / 1000)
  const abs = Math.abs(diffSec)
  const loc = language && String(language).toLowerCase().startsWith('ar') ? 'ar' : 'en'
  try {
    const rtf = new Intl.RelativeTimeFormat(loc, { numeric: 'auto' })
    if (abs < 45) return rtf.format(diffSec, 'second')
    const diffMin = Math.round(diffSec / 60)
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
    const diffHour = Math.round(diffMin / 60)
    if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour')
    const diffDay = Math.round(diffHour / 24)
    if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day')
    const diffMonth = Math.round(diffDay / 30)
    if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, 'month')
    const diffYear = Math.round(diffDay / 365)
    return rtf.format(diffYear, 'year')
  } catch {
    return formatDateTime(iso)
  }
}

/**
 * Best navigation target for a notification (relative path).
 * @param {unknown} notification
 * @returns {string|null}
 */
export function getNotificationNavigationPath(notification) {
  const data = parseNotificationData(notification)
  const url = data.url
  if (typeof url === 'string' && url.startsWith('/')) return url
  const bizType = typeof data.type === 'string' ? data.type : getNotificationBusinessType(notification)
  if (typeof bizType === 'string' && bizType.startsWith('sd_form')) return '/sd-forms'
  if (typeof bizType === 'string' && bizType.startsWith('shipment')) return '/shipments'
  if (typeof bizType === 'string' && bizType.startsWith('client_follow_up')) return '/clients'
  if (typeof bizType === 'string' && bizType.startsWith('excuse')) return '/attendance'
  return null
}

/** Title fallback when no i18n / no data.title */
export function getNotificationDefaultTitle(notification, translate) {
  const data = parseNotificationData(notification)
  if (typeof data.title === 'string' && data.title.trim()) return data.title.trim()
  const biz = getNotificationBusinessType(notification)
  const human = humanizeTypeKey(biz)
  return human ? translate('notifications.types._fallback.withType', { type: human }) : translate('notifications.noTitle')
}
