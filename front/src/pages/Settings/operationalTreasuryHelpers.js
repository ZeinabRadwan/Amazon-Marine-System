/** Operational treasury account types (must match backend {@see BankAccount::OPERATIONAL_ACCOUNT_TYPES}). */
export const OPERATIONAL_ACCOUNT_TYPES = [
  'cash_box',
  'cash_treasury',
  'nsp',
  'vodafone_cash',
  'instapay',
  'petty_cash',
  'mobile_wallet',
  'other',
]

export function normalizeOperationalAccountType(kind) {
  const t = String(kind || '').toLowerCase().trim()
  if (t === 'vodafone') return 'vodafone_cash'
  if (t === 'physical') return 'cash_treasury'
  return t
}

const TYPE_LABEL_KEYS = {
  cash_box: 'settings.cashWallets.kindCashBox',
  cash_treasury: 'settings.cashWallets.kindCashTreasury',
  nsp: 'settings.cashWallets.kindNsp',
  vodafone_cash: 'settings.cashWallets.kindVodafone',
  instapay: 'settings.cashWallets.kindInstapay',
  petty_cash: 'settings.cashWallets.kindPettyCash',
  mobile_wallet: 'settings.cashWallets.kindMobileWallet',
  other: 'settings.cashWallets.kindOther',
}

export function operationalAccountTypeLabel(kind, t) {
  const k = normalizeOperationalAccountType(kind)
  const labelKey = TYPE_LABEL_KEYS[k]
  return labelKey ? t(labelKey) : k || '—'
}

export function formatOperationalBalanceSummary(balanceByCurrency) {
  if (!balanceByCurrency || typeof balanceByCurrency !== 'object') return null
  const entries = Object.entries(balanceByCurrency).filter(([, amt]) => Number(amt) !== 0)
  if (!entries.length) return null
  return entries
    .map(([code, amt]) => `${code} ${Number(amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
    .join(' · ')
}

export const EMPTY_CASH_WALLET_FORM = {
  name_ar: '',
  name_en: '',
  cash_wallet_kind: 'cash_box',
  supported_currencies: [],
  is_active: true,
  notes: '',
}
