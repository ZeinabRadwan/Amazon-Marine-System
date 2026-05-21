/**
 * Localized display name for bank / operational treasury accounts.
 * Prefers bilingual name_en / name_ar, then legacy bank_name / account_name.
 */
export function treasuryAccountDisplayName(acc, locale) {
  if (!acc) return ''
  const isAr = String(locale || '').toLowerCase().startsWith('ar')
  const en = String(acc.name_en || '').trim()
  const ar = String(acc.name_ar || '').trim()
  const primary = isAr ? ar || en : en || ar
  if (primary) return primary

  const bank = String(acc.bank_name || '').trim()
  const name = String(acc.account_name || '').trim()
  if (bank && name && bank !== name) return `${bank} — ${name}`
  return bank || name || ''
}

/**
 * Resolves the receiving account label on a payment for lists, timeline, and history.
 */
export function resolvePaymentSourceAccountLabel(payment, bankAccounts, locale) {
  if (!payment) return ''

  const explicit =
    payment.source_account_label ||
    payment.source_account_name ||
    payment.target_account_label
  if (explicit && String(explicit).trim()) return String(explicit).trim()

  const nested = payment.source_account || payment.sourceAccount
  if (nested) {
    const fromNested = treasuryAccountDisplayName(nested, locale)
    if (fromNested) return fromNested
  }

  const bank = String(payment.bank_name || '').trim()
  const acct = String(payment.bank_account_name || '').trim()
  if (bank && acct && bank !== acct) return `${bank} — ${acct}`
  if (bank || acct) return bank || acct

  const accountId = payment.source_account_id ?? nested?.id
  if (accountId != null && Array.isArray(bankAccounts)) {
    const found = bankAccounts.find((b) => Number(b.id) === Number(accountId))
    const fromList = treasuryAccountDisplayName(found, locale)
    if (fromList) return fromList
  }

  return ''
}
