import {
  findShipmentStatusOption,
  getShipmentStatusBadgeVariant,
  shipmentStatusLegacyLabel,
  shipmentStatusLocalizedLabel,
} from '../utils/shipmentStatusHelpers'

/**
 * Same pill layout as Clients table (`clients-status-badge` + variant modifiers in Clients.css).
 */
export default function ShipmentStatusBadge({ statusOptions = [], rawStatus, lang, t }) {
  const opt = findShipmentStatusOption(statusOptions, rawStatus)
  const label = opt ? shipmentStatusLocalizedLabel(opt, lang) : shipmentStatusLegacyLabel(rawStatus, t)
  const variant = getShipmentStatusBadgeVariant(opt, rawStatus)

  return (
    <span className={`clients-status-badge clients-status-badge--${variant}`} title={label}>
      {label}
    </span>
  )
}
