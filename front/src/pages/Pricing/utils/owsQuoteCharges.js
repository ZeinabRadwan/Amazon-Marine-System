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
  if (stored) {
    const ows = normalizeOwsData(stored)
    if (ows?.enabled) {
      return { showFootnote: true, ows }
    }
  }

  const offer = quote?.offer
  if (offer && isImportSeaOffer(offer)) {
    const ows = normalizeOwsData(offer.ows_data)
    if (ows?.enabled) {
      return { showFootnote: true, ows }
    }
  }

  return null
}

export function shouldShowOwsFootnote(quoteOrOffer, owsMeta) {
  if (owsMeta?.ows?.enabled) return true
  if (quoteOrOffer?.pricing_type === 'sea') {
    return Boolean(extractOwsFromOffer(quoteOrOffer)?.ows?.enabled)
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

/** Single English OWS detail (weight/price); optional `OWS:` prefix for sales surfaces. */
function formatOwsDetailCore(row, { isFixed = false } = {}) {
  const unit = String(row?.unit || 'KG').toUpperCase()
  const p = formatMoney(row?.price, row?.currency)

  if (isFixed) {
    const w = row?.weight != null ? `${row.weight} ${unit}` : ''
    if (w && p) return `${w} → ${p}`
    if (p) return p
    if (w) return w
    return ''
  }

  const range = formatWeightRange(row?.from, row?.to, unit)
  if (range && p) return `${range} → ${p}`
  if (p) return p
  if (range) return range
  return ''
}

/** Sales detail — English informational line(s); one line per OWS band. */
export function formatOwsSalesLines(ows) {
  const data = normalizeOwsData(ows)
  if (!data?.enabled) return []

  if (data.mode === 'fixed' && data.fixed) {
    const core = formatOwsDetailCore(data.fixed, { isFixed: true })
    return core ? [`OWS: ${core}`] : []
  }

  return (data.ranges || [])
    .map((r) => {
      const core = formatOwsDetailCore(r, { isFixed: false })
      return core ? `OWS: ${core}` : ''
    })
    .filter(Boolean)
}

function formatOwsQuoteDetailLine(row, isFixed) {
  return formatOwsDetailCore(row, { isFixed })
}

/** Quotation footnote lines — English only, no calculations; one line per OWS band. */
export function formatOwsQuoteFootnoteLines(ows) {
  const data = normalizeOwsData(ows)
  if (!data?.enabled) return []

  if (data.mode === 'fixed' && data.fixed) {
    const detail = formatOwsQuoteDetailLine(data.fixed, true)
    return detail ? [detail] : []
  }

  return (data.ranges || [])
    .map((r) => formatOwsQuoteDetailLine(r, false))
    .filter(Boolean)
}

/** Quotation footnote — short English, no calculations (first band only). */
export function formatOwsQuoteFootnote(ows) {
  return formatOwsQuoteFootnoteLines(ows)[0] || ''
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
