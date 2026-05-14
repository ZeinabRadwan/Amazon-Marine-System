import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  ClipboardList,
  FileText,
  Ship,
  UserRound,
  CalendarDays,
} from 'lucide-react'
import {
  formatNotificationRelativeTime,
  getNotificationBusinessType,
  parseNotificationData,
  getNotificationDefaultTitle,
} from '../../utils/notificationsDisplay'
import './NotificationRichCard.css'

const ICON_MAP = {
  fileText: FileText,
  ship: Ship,
  clipboard: ClipboardList,
  user: UserRound,
  calendar: CalendarDays,
  bell: Bell,
}

const TYPE_ICON = {
  'sd_form.sent_to_operations': 'fileText',
  'sd_form.booking_confirmation_uploaded': 'fileText',
  'shipment.notify_sales_financials': 'ship',
  'shipment.operation_task_reminder': 'clipboard',
  'client_follow_up.reminder': 'user',
  'excuse.decision': 'calendar',
}

function str(v) {
  if (v == null) return ''
  return String(v).trim()
}

function NotificationTypeIcon({ name, className }) {
  const Cmp = ICON_MAP[name] || Bell
  return <Cmp className={className} aria-hidden />
}

function directionBadgeClass(direction) {
  const d = str(direction).toLowerCase()
  if (d === 'export') return 'notif-rich-card__badge notif-rich-card__badge--direction notif-rich-card__badge--export'
  if (d === 'import') return 'notif-rich-card__badge notif-rich-card__badge--direction notif-rich-card__badge--import'
  return 'notif-rich-card__badge notif-rich-card__badge--direction notif-rich-card__badge--neutral'
}

function statusBadgeClass(status) {
  const s = str(status).toLowerCase()
  if (s.includes('approv') || s === 'approved' || s === '1') {
    return 'notif-rich-card__badge notif-rich-card__badge--status-ok'
  }
  if (s.includes('reject') || s === 'rejected') {
    return 'notif-rich-card__badge notif-rich-card__badge--status-danger'
  }
  return 'notif-rich-card__badge notif-rich-card__badge--status'
}

/**
 * @param {object} props
 * @param {unknown} props.notification raw API row
 * @param {'page'|'dropdown'} props.variant
 * @param {boolean} [props.unread]
 * @param {() => void} [props.onMarkRead]
 * @param {boolean} [props.markingRead]
 * @param {boolean} [props.compact] tighter padding (dropdown)
 */
export default function NotificationRichCard({
  notification,
  variant = 'page',
  unread = false,
  onMarkRead,
  markingRead = false,
  compact = false,
}) {
  const { t, i18n } = useTranslation()
  const data = useMemo(() => parseNotificationData(notification), [notification])
  const businessType = useMemo(() => getNotificationBusinessType(notification), [notification])

  const titleKey = `notifications.types.${businessType.replace(/\./g, '_')}.title`
  const title = useMemo(() => {
    const translated = t(titleKey)
    if (translated && translated !== titleKey) return translated
    return getNotificationDefaultTitle(notification, t)
  }, [t, titleKey, notification])

  const message = str(data.message) || str(data.body) || str(notification?.message) || ''
  const clientName = str(data.client_name)
  const sdNumber = str(data.sd_number)
  const blNumber = str(data.bl_number)
  const pol = str(data.pol)
  const pod = str(data.pod)
  const direction = str(data.shipment_direction)
  const status = str(data.status)
  const taskName = str(data.task_name)

  const refLine = useMemo(() => {
    const parts = []
    if (sdNumber) parts.push(sdNumber)
    else if (blNumber) parts.push(blNumber)
    else if (data.shipment_id != null) parts.push(`#${data.shipment_id}`)
    if (clientName) parts.push(clientName)
    if (parts.length) return parts.join(' · ')
    if (taskName) return taskName
    return ''
  }, [sdNumber, blNumber, clientName, taskName, data.shipment_id])

  const routeLine = pol && pod ? `${pol} → ${pod}` : pol || pod || ''

  const directionLabel = direction
    ? t(`notifications.direction.${direction.toLowerCase()}`, direction)
    : ''
  const statusLabel = (() => {
    if (!status) return ''
    const s = str(status).toLowerCase()
    if (businessType.startsWith('sd_form')) {
      const k = `sdForms.status.${s}`
      const tr = t(k)
      if (tr !== k) return tr
    }
    const k2 = `notifications.statusValue.${s}`
    const tr2 = t(k2)
    if (tr2 !== k2) return tr2
    return status
  })()

  const iconName = TYPE_ICON[businessType] || 'bell'
  const relative = formatNotificationRelativeTime(notification?.created_at, i18n.language)

  const rootClass = [
    'notif-rich-card',
    variant === 'dropdown' ? 'notif-rich-card--dropdown' : 'notif-rich-card--page',
    compact ? 'notif-rich-card--compact' : '',
    unread ? 'notif-rich-card--unread' : 'notif-rich-card--read',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass}>
      {unread ? <span className="notif-rich-card__unread-dot" aria-hidden /> : null}
      <div className="notif-rich-card__icon-wrap">
        <NotificationTypeIcon name={iconName} className="notif-rich-card__icon" />
      </div>
      <div className="notif-rich-card__main">
        <div className="notif-rich-card__head">
          <h3 className="notif-rich-card__title">{title}</h3>
          <time dateTime={notification?.created_at} className="notif-rich-card__time" title={notification?.created_at}>
            {relative}
          </time>
        </div>
        {refLine ? <div className="notif-rich-card__ref">{refLine}</div> : null}
        {routeLine ? <div className="notif-rich-card__route">{routeLine}</div> : null}
        {(directionLabel || statusLabel) && (
          <div className="notif-rich-card__badges">
            {directionLabel ? (
              <span className={directionBadgeClass(direction)}>{directionLabel}</span>
            ) : null}
            {statusLabel ? <span className={statusBadgeClass(status)}>{statusLabel}</span> : null}
          </div>
        )}
        {message ? <p className="notif-rich-card__message">{message}</p> : null}
        {onMarkRead && unread ? (
          <div className="notif-rich-card__footer">
            <button
              type="button"
              className="notif-rich-card__mark-read"
              onClick={(e) => {
                e.stopPropagation()
                onMarkRead()
              }}
              disabled={markingRead}
            >
              {markingRead ? t('notifications.saving') : t('notifications.markRead')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
