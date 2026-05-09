/**
 * Accounting currency display: one badge per currency — never merged into a single string.
 * Badge colours: USD green, EUR blue, EGP orange; other currencies use a neutral badge.
 */

import { useTranslation } from 'react-i18next'

export function normalizeAccountingCurrencyMap(input) {
  if (!input) return {}
  if (typeof input === 'number') return { USD: Number(input) || 0 }
  if (Array.isArray(input)) {
    return input.reduce((acc, row) => {
      const cur = String(row?.currency || row?.currency_code || 'USD').toUpperCase()
      const amount = Number(row?.amount ?? row?.value ?? 0)
      acc[cur] = (Number(acc[cur]) || 0) + amount
      return acc
    }, {})
  }
  if (typeof input === 'object') return { ...input }
  return {}
}

export function currencyBadgeModifier(code) {
  const c = String(code || '').toUpperCase()
  if (c === 'USD') return 'usd'
  if (c === 'EUR') return 'eur'
  if (c === 'EGP') return 'egp'
  return 'default'
}

function sortCurrencyEntries(entries) {
  const priority = ['EGP', 'USD', 'EUR']
  return [...entries].sort(([a], [b]) => {
    const ua = String(a).toUpperCase()
    const ub = String(b).toUpperCase()
    const ia = priority.indexOf(ua)
    const ib = priority.indexOf(ub)
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    }
    return ua.localeCompare(ub)
  })
}

function formatAmount(amount, locale) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '0.00'
  return new Intl.NumberFormat(locale || undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

/**
 * @param {{ value: unknown, className?: string, size?: 'sm' | 'md', emptyLabel?: string, amountFirst?: boolean, numberLocale?: string }} props
 */
export function CurrencyMapBadges({
  value,
  className = '',
  size = 'md',
  emptyLabel,
  amountFirst = false,
  numberLocale,
}) {
  const { i18n } = useTranslation()
  const localeForAmounts = numberLocale ?? i18n.language
  const normalized = normalizeAccountingCurrencyMap(value)
  const entries = sortCurrencyEntries(Object.entries(normalized)).filter(([, amount]) => Number(amount) !== 0)
  const empty = emptyLabel ?? '—'

  if (!entries.length) {
    return <span className="accounting-currency-empty text-slate-400">{empty}</span>
  }

  const sizeClass = size === 'sm' ? 'accounting-currency-stack--sm' : ''

  return (
    <span className={`accounting-currency-stack ${sizeClass} ${className}`.trim()}>
      {entries.map(([code, amount]) => {
        const mod = currencyBadgeModifier(code)
        const label = String(code).toUpperCase()
        return (
          <span
            key={label}
            className={`accounting-currency-badge accounting-currency-badge--${mod}${amountFirst ? ' accounting-currency-badge--amount-first' : ''}`}
          >
            {amountFirst ? (
              <>
                <span className="accounting-currency-badge__amount">{formatAmount(amount, localeForAmounts)}</span>
                <span className="accounting-currency-badge__code">{label}</span>
              </>
            ) : (
              <>
                <span className="accounting-currency-badge__code">{label}</span>
                <span className="accounting-currency-badge__amount">{formatAmount(amount, localeForAmounts)}</span>
              </>
            )}
          </span>
        )
      })}
    </span>
  )
}

/**
 * Code-only pill (e.g. table “Currency” column).
 */
export function CurrencyCodeBadge({ code, className = '' }) {
  const raw = String(code || '').trim()
  if (!raw || raw === '—') {
    return <span className="text-slate-400">—</span>
  }
  const label = raw.toUpperCase()
  const mod = currencyBadgeModifier(label)
  return (
    <span className={`accounting-currency-badge accounting-currency-badge--code-only accounting-currency-badge--${mod} ${className}`.trim()}>
      {label}
    </span>
  )
}

/** Plain multi-currency text for CSV exports (separate currencies, no merging numbers). */
export function currencyMapToExportPlain(value) {
  const normalized = normalizeAccountingCurrencyMap(value)
  const entries = sortCurrencyEntries(Object.entries(normalized)).filter(([, amount]) => Number(amount) !== 0)
  if (!entries.length) return ''
  return entries.map(([c, a]) => `${String(c).toUpperCase()} ${Number(a).toFixed(2)}`).join(' | ')
}
