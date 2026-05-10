import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

const DISPLAY_CURRENCY_ORDER = ['EGP', 'USD', 'EUR']

/**
 * Locale-aware decimals/grouping with digits locked to Latin (0–9). Arabic UI keeps `ar-EG` rules
 * but avoids Eastern Arabic numerals (Unicode numberingSystem `latn`).
 */
const SHIPMENT_MONEY_NUMBER_FORMAT_OPTIONS = Object.freeze({
  maximumFractionDigits: 2,
  numberingSystem: 'latn',
})

/**
 * Formats numeric amount only (no currency). Use in table cells that have a separate currency column.
 */
export function formatShipmentMoneyDigits(amount, numberLocale) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return '0'
  const loc = numberLocale || 'en-US'
  return new Intl.NumberFormat(loc, SHIPMENT_MONEY_NUMBER_FORMAT_OPTIONS).format(n)
}

/** Same ordering as shipment financial badges (EGP → USD → EUR → rest A–Z). */
export function orderShipmentCurrencyMapEntries(map) {
  const entries = Object.entries(map || {}).filter(([, v]) => Number(v) !== 0)
  const primary = new Set(DISPLAY_CURRENCY_ORDER)
  const out = []
  for (const code of DISPLAY_CURRENCY_ORDER) {
    const hit = entries.find(([c]) => c === code)
    if (hit) out.push(hit)
  }
  entries
    .filter(([c]) => !primary.has(c))
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach((e) => out.push(e))
  return out
}

/**
 * True when money should show amount before ISO code (Arabic UI): "60 EGP".
 * False for English: "EGP 60".
 */
export function useShipmentMoneyCurrencyAfterAmount() {
  const { i18n } = useTranslation()
  return Boolean(i18n.language?.startsWith('ar'))
}

/**
 * Plain string for native `<input value={...} />` (readonly). Matches ShipmentMoney visual order.
 */
export function formatShipmentMoneyPlain(amount, currencyCode, numberLocale, currencyAfterAmount) {
  const digits = formatShipmentMoneyDigits(amount, numberLocale)
  const code = String(currencyCode ?? '').trim().toUpperCase() || '—'
  return currencyAfterAmount ? `${digits} ${code}` : `${code} ${digits}`
}

export function formatShipmentMoneyMapPlain(map, numberLocale, currencyAfterAmount, separator = ' · ') {
  const ordered = orderShipmentCurrencyMapEntries(map)
  if (!ordered.length) return '—'
  return ordered
    .map(([c, v]) => formatShipmentMoneyPlain(Number(v), c, numberLocale, currencyAfterAmount))
    .join(separator)
}

/**
 * Single currency + amount: isolated LTR span so digits stay stable inside RTL layout.
 */
export function ShipmentMoneyInner({
  amount,
  currencyCode,
  numberLocale,
  currencyAfterAmount,
  className = '',
  sign,
}) {
  const digits = formatShipmentMoneyDigits(amount, numberLocale)
  const code = String(currencyCode ?? '').trim().toUpperCase() || '—'
  const signChar = sign === '+' ? '+' : sign === '-' ? '−' : ''

  return (
    <span className={`shipment-fin-money ${className}`.trim()} dir="ltr" translate="no">
      {signChar ? <span className="shipment-fin-money__sign">{signChar}</span> : null}
      {currencyAfterAmount ? (
        <>
          <span className="shipment-fin-money__digits">{digits}</span>
          <span className="shipment-fin-money__gap"> </span>
          <span className="shipment-fin-money__code">{code}</span>
        </>
      ) : (
        <>
          <span className="shipment-fin-money__code">{code}</span>
          <span className="shipment-fin-money__gap"> </span>
          <span className="shipment-fin-money__digits">{digits}</span>
        </>
      )}
    </span>
  )
}

export function ShipmentMoney(props) {
  const currencyAfterAmount = useShipmentMoneyCurrencyAfterAmount()
  return <ShipmentMoneyInner {...props} currencyAfterAmount={currencyAfterAmount} />
}

/** Amount only (same digits rules); keeps tabular alignment in numeric columns. */
export function ShipmentMoneyDigits({ amount, numberLocale, className = '', sign }) {
  const digits = formatShipmentMoneyDigits(amount, numberLocale)
  const signChar = sign === '+' ? '+' : sign === '-' ? '−' : ''
  return (
    <span className={`shipment-fin-money shipment-fin-money--digits-only ${className}`.trim()} dir="ltr" translate="no">
      {signChar ? <span className="shipment-fin-money__sign">{signChar}</span> : null}
      <span className="shipment-fin-money__digits">{digits}</span>
    </span>
  )
}

/**
 * Multiple currencies separated by middots (or custom separator). Whole group is one LTR isolate.
 */
export function ShipmentMoneyMap({
  map,
  numberLocale,
  className = '',
  emptyLabel = '—',
  separator = ' · ',
}) {
  const currencyAfterAmount = useShipmentMoneyCurrencyAfterAmount()
  const ordered = orderShipmentCurrencyMapEntries(map)
  if (!ordered.length) {
    return <span className={className}>{emptyLabel}</span>
  }
  const sep = String(separator)
  return (
    <span className={`shipment-fin-money-map ${className || ''}`.trim()} dir="ltr" translate="no">
      {ordered.map(([c, v], i) => (
        <Fragment key={c}>
          {i > 0 ? (
            <span className="shipment-fin-money-map__dot" aria-hidden>
              {sep}
            </span>
          ) : null}
          <ShipmentMoneyInner
            amount={Number(v)}
            currencyCode={c}
            numberLocale={numberLocale}
            currencyAfterAmount={currencyAfterAmount}
          />
        </Fragment>
      ))}
    </span>
  )
}
