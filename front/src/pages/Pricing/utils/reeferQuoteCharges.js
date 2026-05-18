/** Pricing keys excluded from quotation lines / totals (daily rate only — not multiplied). */
export const REEFER_DEFERRED_SOURCE_KEYS = new Set(['powerday'])

/** Quote item codes excluded from quotation lines / totals when container is reefer. */
export const REEFER_DEFERRED_QUOTE_CODES = new Set(['POWER'])

export function extractPowerFreeDaysFromNotes(notes) {
  const m = String(notes || '').match(/__REEFER_POWER_FREE_DAYS__=(\d+)__/)
  return m ? m[1] : ''
}

export function isReeferDeferredSourceKey(sourceKey) {
  return REEFER_DEFERRED_SOURCE_KEYS.has(String(sourceKey || '').toLowerCase())
}

export function isReeferDeferredQuoteCode(code) {
  return REEFER_DEFERRED_QUOTE_CODES.has(String(code || '').toUpperCase())
}

export function isReeferDeferredOceanLine(line) {
  if (!line) return false
  return isReeferDeferredQuoteCode(line.code) || isReeferDeferredSourceKey(line.sourceKey)
}

export function isReeferContainerSpec(containerType, containerSpec) {
  if (containerSpec?.type === 'reefer') return true
  return String(containerType || '')
    .toLowerCase()
    .includes('reefer')
}

export function isReeferSeaOffer(offer) {
  if (!offer || offer.pricing_type !== 'sea') return false
  const p = offer.pricing || {}
  if (p.of20rf?.price != null || p.of40rf?.price != null || p.thc20rf?.price != null || p.thcRf?.price != null) {
    return true
  }
  if (p.powerDay?.price != null || p.pti?.price != null) return true
  const notes = String(offer.notes || '')
  if (/reefer|refrigerat/i.test(notes)) return true
  return false
}

export function filterBillableOceanLines(lines, isReefer) {
  if (!isReefer || !Array.isArray(lines)) return lines || []
  return lines.filter((line) => !isReeferDeferredOceanLine(line))
}

export function extractReeferDeferredFromOffer(offer) {
  const pricing = offer?.pricing || {}
  const powerRaw = pricing.powerDay
  const powerAmount =
    powerRaw?.price != null && powerRaw.price !== '' ? Number(powerRaw.price) : null
  const freeDaysRaw = extractPowerFreeDaysFromNotes(offer?.notes)
  const freePowerDays = freeDaysRaw !== '' ? Math.max(0, Math.floor(Number(freeDaysRaw) || 0)) : null

  const hasPowerRate = powerAmount != null && Number.isFinite(powerAmount) && powerAmount >= 0

  return {
    showPowerFootnote: hasPowerRate,
    powerPerDay: hasPowerRate
      ? { amount: powerAmount, currency: powerRaw?.currency || 'USD' }
      : null,
    freePowerDays,
  }
}

/** Persisted on quote.free_time_data — power rate + free days for sales; not billable totals. */
export function buildReeferFreeTimeDataPayload(deferred) {
  if (!deferred?.showPowerFootnote && deferred?.freePowerDays == null) return null
  return {
    reefer: {
      deferred_power: Boolean(deferred?.showPowerFootnote),
      power_per_day: deferred?.powerPerDay ?? null,
      free_power_days: deferred?.freePowerDays,
    },
  }
}

export function resolveReeferDeferredMeta(quote) {
  const isReefer = isReeferContainerSpec(quote?.container_type, quote?.container_spec)
  if (!isReefer) return null

  const stored = quote?.free_time_data?.reefer
  if (stored && (stored.deferred_power || stored.power_per_day)) {
    return {
      showPowerFootnote: Boolean(stored.deferred_power || stored.power_per_day),
      powerPerDay: stored.power_per_day ?? null,
      freePowerDays: stored.free_power_days ?? null,
    }
  }

  const items = Array.isArray(quote?.items) ? quote.items : []
  const hadPower = items.some((it) => isReeferDeferredQuoteCode(it.code))
  if (hadPower) {
    return { showPowerFootnote: true, powerPerDay: null, freePowerDays: null }
  }

  return null
}

export function shouldShowReeferDeferredPowerFootnote(isReefer, deferredMeta) {
  return Boolean(isReefer && deferredMeta?.showPowerFootnote)
}

/** e.g. "35 USD/day" for quotation footnote */
export function formatReeferPowerPerDayRate(powerPerDay) {
  if (powerPerDay?.amount == null || powerPerDay.amount === '') return ''
  const amt = Number(powerPerDay.amount)
  if (!Number.isFinite(amt)) return ''
  const cur = String(powerPerDay.currency || 'USD').toUpperCase()
  return `${amt} ${cur}/day`
}
