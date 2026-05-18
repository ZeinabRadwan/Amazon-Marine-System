export const SEA_EXPORT_CORE_LINE_NAMES = ['Ocean Freight', 'THC', 'B/L Fee', 'Telex Release']

export const SEA_IMPORT_CORE_LINE_NAMES = ['Ocean Freight', 'DTHC', 'THC', 'B/L Fee', 'Telex Release']

export function isSeaImportDirection(direction) {
  return String(direction || 'export') === 'import'
}

export function seaCoreLineNamesForDirection(direction, isReefer) {
  const base = isSeaImportDirection(direction) ? SEA_IMPORT_CORE_LINE_NAMES : SEA_EXPORT_CORE_LINE_NAMES
  return isReefer ? [...base, 'Power'] : [...base]
}

/** DTHC stays English in the UI. */
export function isSeaCoreLineEnglishOnly(name) {
  return name === 'DTHC'
}

export function seaCoreLineDisplayLabel(name, t) {
  switch (name) {
    case 'Ocean Freight':
      return t('pricing.oceanFreightAbbr')
    case 'DTHC':
      return 'DTHC'
    case 'THC':
      return t('pricing.defaultLineThc')
    case 'B/L Fee':
      return t('pricing.defaultLineBlFee')
    case 'Telex Release':
      return t('pricing.defaultLineTelex')
    default:
      return name
  }
}
