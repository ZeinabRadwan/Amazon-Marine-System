const DRAFT_VERSION = 1
const KEY_PREFIX = 'amazonMarine.pricingQuoteDraft.v1.'

function storageKey(scope) {
  return `${KEY_PREFIX}${scope}`
}

function safeParse(raw) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

/** @param {{ id?: string|number } | null} initialOffer */
/** @param {boolean} initialQuickMode */
export function getQuoteDraftScope(initialOffer, initialQuickMode) {
  if (initialOffer?.id != null && initialOffer.id !== '') {
    return `pricing-offer-${initialOffer.id}`
  }
  if (initialQuickMode) return 'quick'
  return 'manual'
}

function lineHasAmount(line) {
  if (!line || typeof line !== 'object') return false
  const cost = String(line.cost_amount ?? '').trim()
  const sell = String(line.selling_amount ?? '').trim()
  return Boolean(cost || sell)
}

/** @returns {boolean} */
export function isQuoteDraftMeaningful(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false

  const f = snapshot.form || {}
  if (snapshot.clientAsync?.value || f.client_id?.trim()) return true
  if (f.pol?.trim() || f.pod?.trim() || f.shipping_line?.trim()) return true
  if (f.transit_time?.trim() || f.free_time?.trim()) return true
  if (f.valid_from?.trim() || f.valid_to?.trim() || f.notes?.trim()) return true
  if (f.pricing_offer_id?.trim()) return true
  if (f.container_type && f.container_type !== '40HQ Dry') return true
  if (Number(f.qty) > 1) return true
  if (Array.isArray(f.sailing_dates) && f.sailing_dates.length > 0) return true

  if (Array.isArray(snapshot.oceanLines) && snapshot.oceanLines.some(lineHasAmount)) return true

  if (snapshot.inlandEnabled) return true
  if (snapshot.inlandOfferId?.trim()) return true
  if (String(snapshot.inlandCost ?? '').trim() || String(snapshot.inlandSelling ?? '').trim()) return true
  if (String(snapshot.inlandGenCost ?? '').trim() || String(snapshot.inlandGenSelling ?? '').trim()) return true
  if (Array.isArray(snapshot.inlandLineRows) && snapshot.inlandLineRows.some(lineHasAmount)) return true

  if (snapshot.customsEnabled) return true
  if (Array.isArray(snapshot.customsExtras) && snapshot.customsExtras.length > 0) return true
  if (snapshot.customsExtraName?.trim() || String(snapshot.customsExtraAmount ?? '').trim()) return true
  if (snapshot.officialReceiptsNote?.trim()) return true
  if (snapshot.quickModeReason?.trim()) return true
  if (snapshot.municipality?.trim()) return true
  if (snapshot.pricingTeamConfirmed) return true
  if (snapshot.showCarrierOnPdf === false) return true

  if (snapshot.quickInlandPort?.trim() || snapshot.quickInlandGov?.trim() || snapshot.quickInlandZone?.trim()) {
    return true
  }
  if (snapshot.quickInlandVehicle?.trim()) return true

  const defaultHandling = '50'
  if (Array.isArray(snapshot.handlingLines)) {
    const changed = snapshot.handlingLines.some((h) => {
      const amt = String(h?.amount ?? '').trim()
      const name = String(h?.name ?? '').trim()
      return (amt && amt !== defaultHandling) || (name && name !== 'Handling Fees')
    })
    if (changed) return true
    if (snapshot.handlingLines.length > 1) return true
  }

  return false
}

/**
 * @param {string} scope
 * @returns {object | null}
 */
export function readPricingQuoteDraft(scope) {
  if (typeof window === 'undefined' || !scope) return null
  const parsed = safeParse(window.localStorage.getItem(storageKey(scope)))
  if (!parsed || parsed.version !== DRAFT_VERSION) return null
  if (parsed.draftScope && parsed.draftScope !== scope) return null
  return parsed
}

/**
 * @param {string} scope
 * @param {object} snapshot
 */
export function writePricingQuoteDraft(scope, snapshot) {
  if (typeof window === 'undefined' || !scope || !snapshot) return
  const payload = { ...snapshot, draftScope: scope, version: DRAFT_VERSION }
  try {
    if (!isQuoteDraftMeaningful(payload)) {
      window.localStorage.removeItem(storageKey(scope))
      return
    }
    window.localStorage.setItem(
      storageKey(scope),
      JSON.stringify({
        ...payload,
        savedAt: new Date().toISOString(),
      })
    )
  } catch {
    /* quota / serialization */
  }
}

/** @param {string} scope */
export function clearPricingQuoteDraft(scope) {
  if (typeof window === 'undefined' || !scope) return
  try {
    window.localStorage.removeItem(storageKey(scope))
  } catch {
    /* ignore */
  }
}
