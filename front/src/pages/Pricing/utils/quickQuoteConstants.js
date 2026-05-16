/** Container types for quick quotation route (fixed list). */
export const QUICK_CONTAINER_OPTIONS = [
  "20' Dry",
  "40' Dry",
  "40' High Cube",
  "20' Reefer",
  "40' Reefer",
  'Flat Rack',
  'Open Top',
]

export const QUICK_INLAND_VEHICLE_OPTIONS = [
  "20' Dry",
  "40' Dry",
  "Twin 20'",
  "40' Reefer",
]

/**
 * Fixed core ocean rows for quick quotation (not dropdown-selectable).
 */
export function createQuickOceanCoreRows(t, quoteCodeLabel) {
  const ts = Date.now()
  const row = (code, name, included = true) => ({
    sourceKey: `q-${ts}-${code}`,
    code,
    name,
    description: '',
    cost_amount: '',
    selling_amount: '',
    currency: 'USD',
    included,
    quickCore: true,
  })
  return [
    row('OF', t('pricing.quickOceanOF', 'Ocean freight (OF)'), true),
    row('THC', quoteCodeLabel('THC'), true),
    row('BL', t('pricing.quickOceanBL', 'B/L fee'), true),
    row('TELEX', quoteCodeLabel('TELEX'), true),
    row('ISPS', quoteCodeLabel('ISPS'), false),
  ]
}

export function createQuickInlandStarterRows(t, { includeGenerator = false } = {}) {
  const ts = Date.now()
  const rows = [
    {
      sourceKey: `inland-${ts}-main`,
      code: 'INLAND',
      name: t('pricing.inlandTransport', 'Inland transport'),
      description: '',
      cost_amount: '',
      selling_amount: '',
      currency: 'EGP',
      included: true,
      quickCore: true,
    },
  ]
  if (includeGenerator) {
    rows.push({
      sourceKey: `inland-${ts}-gen`,
      code: 'INLAND',
      name: t('pricing.inlandGeneratorLine', 'Generator (inland)'),
      description: 'generator',
      cost_amount: '',
      selling_amount: '',
      currency: 'EGP',
      included: true,
      quickCore: true,
    })
  }
  return rows
}

export function isQuickReeferContainer(containerType) {
  return String(containerType || '')
    .toLowerCase()
    .includes('reefer')
}
