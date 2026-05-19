/**
 * Vendor `type` normalization for Shipment Operations (aligned with backend {@see App\Support\VendorTypeAliases}).
 */

const CANONICAL_ALIASES = {
  inland_transport: [
    'inland_transport',
    'inland',
    'transport',
    'contractor',
    'trucker',
    'domestic_transport',
    'domestic',
    'haulage',
    'trucking',
  ],
  customs_clearance: [
    'customs_clearance',
    'customs',
    'broker',
    'customs_broker',
    'customsbroker',
    'clearance',
    'custom_broker',
  ],
  insurance: ['insurance', 'insurer'],
  overseas_agent: ['overseas_agent', 'overseas', 'agent', 'freight_forwarder', 'forwarder', 'nvocc'],
}

export function normalizeVendorType(type) {
  return String(type ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

/**
 * @param {unknown[]} vendors
 * @param {'inland_transport'|'customs_clearance'|'insurance'|'overseas_agent'} canonical
 */
export function vendorsForCanonical(vendors, canonical) {
  const aliases = CANONICAL_ALIASES[canonical] || [canonical]
  const wanted = new Set(aliases.map((a) => normalizeVendorType(a)))
  return (Array.isArray(vendors) ? vendors : []).filter((v) => wanted.has(normalizeVendorType(v?.type)))
}

/**
 * @param {unknown[]} mergedVendorList
 * @param {'inland_transport'|'customs_clearance'|'insurance'|'overseas_agent'} canonical
 * @param {unknown} rawId
 */
export function opsVendorIdIsValid(mergedVendorList, canonical, rawId) {
  const id = Number(rawId)
  if (!Number.isFinite(id) || id <= 0) return true
  return vendorsForCanonical(mergedVendorList, canonical).some((v) => Number(v?.id) === id)
}

/**
 * Clear partner vendor ids that are not in the loaded vendor catalog (deleted or wrong type).
 * @param {object|null|undefined} opsData
 * @param {unknown[]} mergedVendorList
 */
export function sanitizeOpsVendorIds(opsData, mergedVendorList) {
  if (!opsData || typeof opsData !== 'object') return opsData
  const list = Array.isArray(mergedVendorList) ? mergedVendorList : []
  if (list.length === 0) return opsData

  const types = Array.isArray(opsData.service_types) ? opsData.service_types : []
  const patch = {}

  if (
    types.includes('inland_transport') &&
    !opsVendorIdIsValid(list, 'inland_transport', opsData.transport_contractor_id)
  ) {
    patch.transport_contractor_id = ''
  }
  if (
    types.includes('customs_clearance') &&
    !opsVendorIdIsValid(list, 'customs_clearance', opsData.customs_broker_id)
  ) {
    patch.customs_broker_id = ''
  }
  if (
    opsData.insurance_company_id != null &&
    opsData.insurance_company_id !== '' &&
    !opsVendorIdIsValid(list, 'insurance', opsData.insurance_company_id)
  ) {
    patch.insurance_company_id = ''
  }

  const tip = opsData.transport_instruction_profile
  if (tip && typeof tip === 'object' && tip.approved_customs_broker_id) {
    if (!opsVendorIdIsValid(list, 'customs_clearance', tip.approved_customs_broker_id)) {
      patch.transport_instruction_profile = {
        ...tip,
        approved_customs_broker_id: '',
      }
    }
  }

  return Object.keys(patch).length > 0 ? { ...opsData, ...patch } : opsData
}
