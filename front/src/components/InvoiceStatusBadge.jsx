import { CheckCircle2, Clock3, AlertTriangle, AlertOctagon, CircleDot } from 'lucide-react'
import { getInvoiceStatusBadgeMeta } from '../utils/invoiceStatusBadgeMap'
import './InvoiceStatusBadge.css'

function StatusIcon({ icon }) {
  if (icon === 'check') return <CheckCircle2 className="invoice-status-badge__icon" aria-hidden />
  if (icon === 'clock') return <Clock3 className="invoice-status-badge__icon" aria-hidden />
  if (icon === 'alert') return <AlertTriangle className="invoice-status-badge__icon" aria-hidden />
  if (icon === 'alert_octagon') return <AlertOctagon className="invoice-status-badge__icon" aria-hidden />
  return <CircleDot className="invoice-status-badge__icon" aria-hidden />
}

export default function InvoiceStatusBadge({ status, t }) {
  const meta = getInvoiceStatusBadgeMeta(status, t)
  return (
    <span className={`invoice-status-badge invoice-status-badge--${meta.tone}`} title={meta.label}>
      <StatusIcon icon={meta.icon} />
      <span className="invoice-status-badge__label">{meta.label}</span>
    </span>
  )
}

