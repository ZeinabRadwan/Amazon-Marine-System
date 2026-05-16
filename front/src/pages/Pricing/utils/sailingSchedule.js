/** Canonical weekday names (API / OfferFormModal); display order Sat → Fri */
export const WEEK_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

/** JS Date#getDay(): 0 = Sunday … 6 = Saturday */
const JS_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function parseWeeklySailingDays(offer) {
  if (!offer?.weekly_sailing_days) return []
  return String(offer.weekly_sailing_days)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((d) => WEEK_DAYS.includes(d))
}

export function normalizeOfferSailingDates(offer) {
  const raw = offer?.sailing_dates
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.map((d) => String(d || '').trim().slice(0, 10)).filter(Boolean))].sort()
}

/**
 * @returns {'fixed'|'weekly'|null}
 */
export function detectSailingScheduleMode(offer) {
  if (!offer) return null
  const fixed = normalizeOfferSailingDates(offer)
  if (fixed.length > 0) return 'fixed'
  const weekly = parseWeeklySailingDays(offer)
  if (weekly.length > 0) return 'weekly'
  return null
}

export function buildSailingScheduleFromOffer(offer) {
  const mode = detectSailingScheduleMode(offer)
  if (!mode) return null
  return {
    mode,
    fixedDates: mode === 'fixed' ? normalizeOfferSailingDates(offer) : [],
    weeklyWeekdays: mode === 'weekly' ? parseWeeklySailingDays(offer) : [],
    validFrom: offer.valid_from ? String(offer.valid_from).slice(0, 10) : null,
    validTo: offer.valid_to ? String(offer.valid_to).slice(0, 10) : null,
  }
}

export function weekdayNameForDate(isoDate) {
  const d = parseIsoDate(isoDate)
  if (!d) return null
  return JS_DAY_NAMES[d.getDay()]
}

export function parseIsoDate(iso) {
  const s = String(iso || '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0)
  return Number.isNaN(dt.getTime()) ? null : dt
}

export function isDateAllowedForSchedule(isoDate, schedule) {
  if (!isoDate || !schedule) return false
  const d = parseIsoDate(isoDate)
  if (!d) return false
  if (schedule.validFrom) {
    const min = parseIsoDate(schedule.validFrom)
    if (min && d < min) return false
  }
  if (schedule.validTo) {
    const max = parseIsoDate(schedule.validTo)
    if (max && d > max) return false
  }
  if (schedule.mode === 'fixed') {
    return schedule.fixedDates.includes(isoDate)
  }
  if (schedule.mode === 'weekly') {
    const day = JS_DAY_NAMES[d.getDay()]
    return schedule.weeklyWeekdays.includes(day)
  }
  return false
}

export function sanitizeSelectedSailingDate(isoDate, schedule) {
  const d = String(isoDate || '').trim().slice(0, 10)
  if (!d || !schedule) return ''
  return isDateAllowedForSchedule(d, schedule) ? d : ''
}

/** Read-only display: fixed ISO dates or weekly_sailing_days string from a price offer (no filtering). */
export function formatSailingScheduleFromOffer(offer, dash = '—') {
  if (!offer) return dash
  const dates = normalizeOfferSailingDates(offer)
  if (dates.length) return dates.join(', ')
  const weekly = offer.weekly_sailing_days
  if (weekly != null && String(weekly).trim()) return String(weekly).trim()
  return dash
}

/** Read-only display: sailing data stored on a quotation (no transformation). */
export function formatSailingScheduleFromQuote(quote, dash = '—') {
  if (!quote) return dash
  const dates = (quote.sailing_dates || [])
    .map((d) => String(d || '').trim().slice(0, 10))
    .filter(Boolean)
  if (dates.length) return dates.join(', ')
  const weekdays = Array.isArray(quote.sailing_weekdays) ? quote.sailing_weekdays.filter(Boolean) : []
  if (weekdays.length) return weekdays.join(', ')
  return dash
}

/** Form snapshot (schedule_type + sailing_dates + sailing_weekdays) for create payload display. */
export function formatSailingScheduleFromForm(form, dash = '—') {
  if (!form) return dash
  const dates = (form.sailing_dates || [])
    .map((d) => String(d || '').trim().slice(0, 10))
    .filter(Boolean)
  if (dates.length) return dates.join(', ')
  const weekdays = Array.isArray(form.sailing_weekdays) ? form.sailing_weekdays.filter(Boolean) : []
  if (weekdays.length) return weekdays.join(', ')
  return dash
}

/** Sync sailing fields on the quote form from a linked sea offer (system-driven, not user-selected). */
export function sailingFieldsFromOffer(offer) {
  if (!offer) {
    return { sailing_dates: [], schedule_type: null, sailing_weekdays: [] }
  }
  const schedule = buildSailingScheduleFromOffer(offer)
  const mode = schedule?.mode || null
  return {
    sailing_dates: mode === 'fixed' ? normalizeOfferSailingDates(offer) : [],
    schedule_type: mode,
    sailing_weekdays: mode === 'weekly' ? parseWeeklySailingDays(offer) : [],
  }
}
