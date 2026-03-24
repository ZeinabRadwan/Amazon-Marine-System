import { getVisitStatusBadgeVariant, getVisitStatusLabel } from './visitStatus'

export default function VisitStatusBadge({ status, t }) {
  const raw = String(status ?? '').trim()
  if (!raw) {
    return <span className="clients-status-badge clients-status-badge--default">{t('visits.statusEmpty', '—')}</span>
  }
  const variant = getVisitStatusBadgeVariant(status)
  const label = getVisitStatusLabel(status, t)
  return (
    <span className={`clients-status-badge clients-status-badge--${variant}`} title={label}>
      {label}
    </span>
  )
}
