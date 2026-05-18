import { useTranslation } from 'react-i18next'

/**
 * Read-only vendor from Operations → Vendors & Partners (not editable in financial model).
 */
export default function ShipmentFinOpsVendorReadonly({ label, partner }) {
  const { t } = useTranslation()
  const name = String(partner?.name || '').trim()

  return (
    <div className="shipment-fin-ops-vendor-readonly">
      <span className="shipment-fin-ops-vendor-readonly__label">{label}</span>
      {name ? (
        <span className="shipment-fin-ops-vendor-readonly__value" title={name}>
          {name}
        </span>
      ) : (
        <span className="shipment-fin-ops-vendor-readonly__empty">
          {t('shipments.fin.opsVendorNotSet', 'Not assigned in Operations / غير محدد في العمليات')}
        </span>
      )}
    </div>
  )
}

