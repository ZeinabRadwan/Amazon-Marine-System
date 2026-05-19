/**
 * Cost-invoice partner-section rules (aligned with ShipmentController::upsertCostInvoice).
 * Vendors from Operations live in section_meta; line items are only required when amounts exist.
 */

/**
 * @param {{
 *   inlandItemsCount: number,
 *   customsItemsCount: number,
 *   sectionMeta: Record<string, unknown>,
 *   t: (key: string, opts?: object) => string,
 * }} params
 * @returns {string|null} First validation error message, or null if valid.
 */
export function validateCostInvoicePartnerSections({ inlandItemsCount, customsItemsCount, sectionMeta, t }) {
  const inlandVendorId = Number(sectionMeta?.inland?.contractor_vendor_id || 0)
  const customsVendorId = Number(sectionMeta?.customs?.customs_broker_vendor_id || 0)

  if (inlandItemsCount > 0 && inlandVendorId <= 0) {
    return t(
      'shipments.fin.opsInlandContractorRequired',
      'Assign the inland contractor in Operations → Vendors & Partners before saving cost items.'
    )
  }
  if (customsItemsCount > 0 && customsVendorId <= 0) {
    return t(
      'shipments.fin.opsCustomsBrokerRequired',
      'Assign the customs broker in Operations → Vendors & Partners before saving cost items.'
    )
  }

  return null
}
