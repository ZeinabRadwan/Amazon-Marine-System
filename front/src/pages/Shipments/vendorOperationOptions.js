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
