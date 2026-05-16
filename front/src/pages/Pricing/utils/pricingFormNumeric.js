/** Controlled number input value — empty string when unset (placeholder shows). */
export function displayNumericInputValue(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

/** Parse optional amount; `null` when the field is empty. */
export function parseOptionalAmount(raw) {
  const s = String(raw ?? '').trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Parse optional amount, defaulting empty to `0` (submission / encoding). */
export function parseAmountOrZero(raw) {
  const n = parseOptionalAmount(raw)
  return n == null ? 0 : n
}

/** Parse optional non-negative integer; `null` when empty. */
export function parseOptionalNonNegativeInt(raw) {
  const s = String(raw ?? '').trim()
  if (s === '') return null
  const n = Math.floor(Number(s))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** String for optional integer fields (empty when unset). */
export function formatOptionalNonNegativeInt(raw) {
  const n = parseOptionalNonNegativeInt(raw)
  return n == null ? '' : String(n)
}

/** Map API price to form string; empty when missing, preserves explicit zero. */
export function priceToFormString(price) {
  if (price == null || price === '') return ''
  return String(price)
}
