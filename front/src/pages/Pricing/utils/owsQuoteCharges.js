/** OWS is informational only — never in quotation totals or auto calculations. */

const OWS_MARKER_RE = /__OWS_DATA_B64__=(.+?)__/s

function encodeOwsPayload(data) {
  const json = JSON.stringify(data)
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(json)))
  }
  return json
}

function decodeOwsPayload(b64) {
  if (typeof atob !== 'undefined') {
    return decodeURIComponent(escape(atob(b64)))
  }
  return b64
}

export function stripOwsFromNotes(notes) {
  let s = String(notes || '')
  s = s.replace(/\n\n__OWS_DATA_B64__=[\s\S]*?__/g, '')
  s = s.replace(/^__OWS_DATA_B64__=[\s\S]*?__(\n\n|\n)?/m, '')
  return s.trim()
}

export function parseOwsDataFromNotes(notes) {
  const m = String(notes || '').match(OWS_MARKER_RE)
  if (!m?.[1]) return null
  try {
    const raw = decodeOwsPayload(m[1])
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    return normalizeOwsData(data)
  } catch {
    return null
  }
}

export function mergeOwsIntoNotes(notes, ows) {
  const base = stripOwsFromNotes(notes)
  const normalized = normalizeOwsData(ows)
  if (!normalized?.enabled) return base
  const marker = `__OWS_DATA_B64__=${encodeOwsPayload(normalized)}__`
  return base ? `${base}\n\n${marker}` : marker
}

function parseWeight(v) {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

function parsePrice(v) {
  if (v == null || v === '') return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function normalizeOwsData(raw) {
  if (!raw || typeof raw !== 'object') return null
  const enabled = Boolean(raw.enabled)
  if (!enabled) return { enabled: false, mode: 'fixed', fixed: null, ranges: [] }

  const mode = raw.mode === 'range' ? 'range' : 'fixed'
  const unit = String(raw.fixed?.unit || raw.ranges?.[0]?.unit || 'KG').toUpperCase() || 'KG'

  if (mode === 'fixed') {
    const weight = parseWeight(raw.fixed?.weight)
    const price = parsePrice(raw.fixed?.price)
    const currency = String(raw.fixed?.currency || 'USD').toUpperCase()
    if (weight == null && price == null) return { enabled: false, mode: 'fixed', fixed: null, ranges: [] }
    return {
      enabled: true,
      mode: 'fixed',
      fixed: { weight, unit, price, currency },
      ranges: [],
    }
  }

  const ranges = (Array.isArray(raw.ranges) ? raw.ranges : [])
    .map((r) => ({
      from: parseWeight(r?.from),
      to: parseWeight(r?.to),
      unit: String(r?.unit || unit).toUpperCase() || 'KG',
      price: parsePrice(r?.price),
      currency: String(r?.currency || 'USD').toUpperCase(),
    }))
    .filter((r) => r.from != null || r.to != null || r.price != null)

  if (!ranges.length) return { enabled: false, mode: 'range', fixed: null, ranges: [] }

  return { enabled: true, mode: 'range', fixed: null, ranges }
}

export function isImportSeaOffer(offer) {
  return offer?.pricing_type === 'sea' && String(offer?.pricing_direction || 'export') === 'import'
}

export function extractOwsFromOffer(offer) {
  if (!isImportSeaOffer(offer)) return null
  const data =
    normalizeOwsData(offer?.ows_data) || parseOwsDataFromNotes(offer?.notes)
  if (!data?.enabled) return null
  return { showFootnote: true, ows: data }
}

export function buildOwsFreeTimeDataPayload(owsMeta) {
  if (!owsMeta?.showFootnote || !owsMeta?.ows) return null
  return {
    ows: {
      deferred: true,
      ...owsMeta.ows,
    },
  }
}

export function resolveOwsMeta(quote) {
  const stored = quote?.free_time_data?.ows
  if (stored?.enabled || stored?.deferred) {
    return { showFootnote: true, ows: normalizeOwsData(stored) }
  }
  return null
}

export function shouldShowOwsFootnote(quoteOrOffer, owsMeta) {
  if (owsMeta?.showFootnote) return true
  if (quoteOrOffer?.pricing_type === 'sea') {
    return Boolean(extractOwsFromOffer(quoteOrOffer)?.showFootnote)
  }
  return false
}

function formatMoney(amount, currency) {
  if (amount == null || !Number.isFinite(amount)) return ''
  return `${amount} ${String(currency || 'USD').toUpperCase()}`
}

function formatWeightRange(from, to, unit) {
  const u = String(unit || 'KG').toUpperCase()
  if (from != null && to != null) return `${from}–${to} ${u}`
  if (from != null) return `${from} ${u}`
  if (to != null) return `${to} ${u}`
  return ''
}

/** Sales detail — English informational line(s). */
export function formatOwsSalesLines(ows) {
  const data = normalizeOwsData(ows)
  if (!data?.enabled) return []

  if (data.mode === 'fixed' && data.fixed) {
    const { weight, unit, price, currency } = data.fixed
    const w = weight != null ? `${weight} ${unit}` : ''
    const p = formatMoney(price, currency)
    if (w && p) return [`OWS: ${w} → ${p}`, `OWS: ${p} for ${w}`]
    if (p) return [`OWS: ${p}`]
    if (w) return [`OWS: ${w}`]
    return []
  }

  return (data.ranges || [])
    .map((r) => {
      const range = formatWeightRange(r.from, r.to, r.unit)
      const p = formatMoney(r.price, r.currency)
      if (range && p) return `OWS: ${range} → ${p}`
      if (p) return `OWS: ${p}`
      return range ? `OWS: ${range}` : ''
    })
    .filter(Boolean)
}

/** Quotation footnote — short English, no calculations. */
export function formatOwsQuoteFootnote(ows) {
  const data = normalizeOwsData(ows)
  if (!data?.enabled) return ''

  if (data.mode === 'fixed' && data.fixed) {
    const { weight, unit, price, currency } = data.fixed
    const range = weight != null ? formatWeightRange(weight, weight, unit) : ''
    const p = formatMoney(price, currency)
    if (range && p) return `for ${range}`
    if (p) return p
    if (range) return `for ${range}`
    return ''
  }

  const first = (data.ranges || [])[0]
  if (!first) return ''
  const range = formatWeightRange(first.from, first.to, first.unit)
  const p = formatMoney(first.price, first.currency)
  if (range && p) return `for ${range}`
  if (p) return p
  if (range) return `for ${range}`
  return ''
}

export const defaultOwsFormState = () => ({
  enabled: false,
  mode: 'fixed',
  fixed: { weight: '', unit: 'KG', price: '', currency: 'USD' },
  ranges: [{ id: 'ows-r1', from: '', to: '', unit: 'KG', price: '', currency: 'USD' }],
})

export function owsFormStateFromData(data) {
  const normalized = normalizeOwsData(data)
  if (!normalized?.enabled) return defaultOwsFormState()

  if (normalized.mode === 'fixed' && normalized.fixed) {
    const f = normalized.fixed
    return {
      enabled: true,
      mode: 'fixed',
      fixed: {
        weight: f.weight != null ? String(f.weight) : '',
        unit: f.unit || 'KG',
        price: f.price != null ? String(f.price) : '',
        currency: f.currency || 'USD',
      },
      ranges: defaultOwsFormState().ranges,
    }
  }

  return {
    enabled: true,
    mode: 'range',
    fixed: defaultOwsFormState().fixed,
    ranges: (normalized.ranges || []).map((r, idx) => ({
      id: `ows-r${idx + 1}`,
      from: r.from != null ? String(r.from) : '',
      to: r.to != null ? String(r.to) : '',
      unit: r.unit || 'KG',
      price: r.price != null ? String(r.price) : '',
      currency: r.currency || 'USD',
    })),
  }
}

export function owsFormStateToPayload(form) {
  if (!form?.enabled) return { enabled: false, mode: 'fixed', fixed: null, ranges: [] }

  if (form.mode === 'fixed') {
    return normalizeOwsData({
      enabled: true,
      mode: 'fixed',
      fixed: {
        weight: form.fixed?.weight,
        unit: form.fixed?.unit,
        price: form.fixed?.price,
        currency: form.fixed?.currency,
      },
    })
  }

  return normalizeOwsData({
    enabled: true,
    mode: 'range',
    ranges: (form.ranges || []).map((r) => ({
      from: r.from,
      to: r.to,
      unit: r.unit,
      price: r.price,
      currency: r.currency,
    })),
  })
}
