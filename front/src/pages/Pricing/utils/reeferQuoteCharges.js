/** Pricing keys on sea rate sheets that stay internal — not billable quotation lines. */
export const REEFER_DEFERRED_SOURCE_KEYS = new Set(['pti', 'powerday'])

/** Quote item codes excluded from quotation lines / totals when container is reefer. */
export const REEFER_DEFERRED_QUOTE_CODES = new Set(['PTI', 'POWER'])

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

export function filterBillableOceanLines(lines, isReefer) {
  if (!isReefer || !Array.isArray(lines)) return lines || []
  return lines.filter((line) => !isReeferDeferredOceanLine(line))
}

export function extractReeferDeferredFromOffer(offer) {
  const pricing = offer?.pricing || {}
  const ptiRaw = pricing.pti
  const powerRaw = pricing.powerDay
  const ptiAmount =
    ptiRaw?.price != null && ptiRaw.price !== '' ? Number(ptiRaw.price) : null
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
    pti:
      ptiAmount != null && Number.isFinite(ptiAmount) && ptiAmount >= 0
        ? { amount: ptiAmount, currency: ptiRaw?.currency || 'USD' }
        : null,
    freePowerDays,
  }
}

/** Persisted on quote.free_time_data for sales reference; not shown as line items. */
export function buildReeferFreeTimeDataPayload(deferred) {
  if (!deferred?.showPowerFootnote) return null
  return {
    reefer: {
      deferred_power: true,
      power_per_day: deferred.powerPerDay,
      pti: deferred.pti,
      free_power_days: deferred.freePowerDays,
    },
  }
}

export function resolveReeferDeferredMeta(quote) {
  const isReefer = isReeferContainerSpec(quote?.container_type, quote?.container_spec)
  if (!isReefer) return null

  const stored = quote?.free_time_data?.reefer
  if (stored?.deferred_power) {
    return {
      showPowerFootnote: true,
      powerPerDay: stored.power_per_day ?? null,
      pti: stored.pti ?? null,
      freePowerDays: stored.free_power_days ?? null,
    }
  }

  const items = Array.isArray(quote?.items) ? quote.items : []
  const hadPower = items.some((it) => isReeferDeferredQuoteCode(it.code))
  if (hadPower) {
    return { showPowerFootnote: true, powerPerDay: null, pti: null, freePowerDays: null }
  }

  return null
}

export function shouldShowReeferDeferredPowerFootnote(isReefer, deferredMeta) {
  return Boolean(isReefer && deferredMeta?.showPowerFootnote)
}
