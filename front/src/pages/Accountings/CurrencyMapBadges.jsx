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
      const cur = String(row?.currency || row?.currency_code || 'USD').toUpperCase().trim() || 'USD'
      const amount = Number(row?.amount ?? row?.value ?? 0)
      acc[cur] = (Number(acc[cur]) || 0) + (Number.isFinite(amount) ? amount : 0)
      return acc
    }, {})
  }
  if (typeof input === 'object') {
    // Always re-key by uppercase so backend variants ("Usd" vs "USD") collapse into a single bucket.
    const out = {}
    for (const [k, v] of Object.entries(input)) {
      const cur = String(k || 'USD').toUpperCase().trim() || 'USD'
      const amount = Number(v ?? 0)
      out[cur] = (Number(out[cur]) || 0) + (Number.isFinite(amount) ? amount : 0)
    }
    return out
  }
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

function formatAmount(amount, locale, { minimumFractionDigits = 2, maximumFractionDigits = 2 } = {}) {
  const n = Number(amount)
  if (!Number.isFinite(n)) {
    return minimumFractionDigits > 0 ? '0.00' : '0'
  }
  return new Intl.NumberFormat(locale || undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
    numberingSystem: 'latn',
  }).format(n)
}

/**
 * @param {{
 *   value: unknown,
 *   className?: string,
 *   size?: 'sm' | 'md',
 *   emptyLabel?: string,
 *   amountFirst?: boolean,
 *   numberLocale?: string,
 *   minimumFractionDigits?: number,
 *   maximumFractionDigits?: number,
 *   zeroFallbackCurrencies?: string[],
 * }} props
 *
 * `zeroFallbackCurrencies` — when the value is empty/all-zero, render a `0.00 X` badge for each
 * listed currency instead of the bare `emptyLabel`. Lets dashboard tiles avoid "—" placeholders
 * and always show an explicit zero value with currency context.
 */
export function CurrencyMapBadges({
  value,
  className = '',
  size = 'md',
  emptyLabel,
  amountFirst = false,
  numberLocale,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  zeroFallbackCurrencies,
}) {
  const { i18n } = useTranslation()
  const localeForAmounts = numberLocale ?? i18n.language
  const amountFormatOptions = { minimumFractionDigits, maximumFractionDigits }
  const normalized = normalizeAccountingCurrencyMap(value)
  let entries = sortCurrencyEntries(Object.entries(normalized)).filter(([, amount]) => Number(amount) !== 0)

  if (!entries.length) {
    const fallbackList = Array.isArray(zeroFallbackCurrencies)
      ? zeroFallbackCurrencies
          .map((c) => String(c || '').toUpperCase().trim())
          .filter((c) => c !== '')
      : []
    if (fallbackList.length) {
      const dedup = Array.from(new Set(fallbackList))
      entries = sortCurrencyEntries(dedup.map((c) => [c, 0]))
    } else {
      const empty = emptyLabel ?? '0'
      return <span className="accounting-currency-empty text-slate-400">{empty}</span>
    }
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
                <span className="accounting-currency-badge__amount">{formatAmount(amount, localeForAmounts, amountFormatOptions)}</span>
                <span className="accounting-currency-badge__code">{label}</span>
              </>
            ) : (
              <>
                <span className="accounting-currency-badge__code">{label}</span>
                <span className="accounting-currency-badge__amount">{formatAmount(amount, localeForAmounts, amountFormatOptions)}</span>
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
