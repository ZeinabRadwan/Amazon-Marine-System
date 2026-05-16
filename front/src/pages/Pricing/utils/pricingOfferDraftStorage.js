const DRAFT_VERSION = 1
const KEY_SEA = 'amazonMarine.pricingOfferDraft.v1.sea'
const KEY_INLAND = 'amazonMarine.pricingOfferDraft.v1.inland'

function storageKey(mode) {
  return mode === 'inland' ? KEY_INLAND : KEY_SEA
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

/** @returns {boolean} */
export function isSeaOfferDraftMeaningful(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false
  const f = snapshot.form || {}
  if (String(snapshot.draftFixedSailingDate || '').trim()) return true
  if (f.pol?.trim() || f.pod?.trim() || f.region?.trim() || f.shipping_line?.trim()) return true
  if (String(f.transit_time_days || '').trim()) return true
  if (f.pol_detention?.trim() || f.pol_demurrage?.trim() || f.pod_detention?.trim() || f.pod_demurrage?.trim()) {
    return true
  }
  if (f.valid_from?.trim() || f.valid_to?.trim() || f.notes?.trim()) return true
  if (Array.isArray(f.weekly_days) && f.weekly_days.length > 0) return true
  if (Array.isArray(f.fixed_dates) && f.fixed_dates.length > 0) return true
  if (f.sailing_tab && f.sailing_tab !== 'weekly') return true
  if (Array.isArray(snapshot.seaCustomLines) && snapshot.seaCustomLines.length > 0) return true
  const draft = snapshot.customChargeDraft || {}
  if (draft.name?.trim() || String(draft.amount ?? '').trim()) return true
  if (Array.isArray(snapshot.seaCoreLines) && snapshot.seaCoreLines.some((r) => String(r?.amount ?? '').trim() !== '')) {
    return true
  }
  const re = snapshot.reeferExtras || {}
  if (re.pti_amount?.trim() || re.power_free_days?.trim()) return true
  return false
}

/** @returns {boolean} */
export function isInlandOfferDraftMeaningful(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false
  const f = snapshot.inlandForm || {}
  if (
    f.inland_port?.trim() ||
    f.inland_gov?.trim() ||
    f.inland_area?.trim() ||
    String(f.price ?? '').trim() ||
    String(f.generator_price ?? '').trim() ||
    f.valid_from?.trim() ||
    f.valid_to?.trim() ||
    f.notes?.trim()
  ) {
    return true
  }
  if (f.truck_type && f.truck_type !== 'standard-dry-20') return true
  if (f.currency && f.currency !== 'EGP') return true
  if (f.generator_currency && f.generator_currency !== 'EGP') return true
  return false
}

/**
 * @param {'sea'|'inland'} mode
 * @returns {object | null}
 */
export function readPricingOfferDraft(mode) {
  if (typeof window === 'undefined') return null
  const parsed = safeParse(window.localStorage.getItem(storageKey(mode)))
  if (!parsed || parsed.version !== DRAFT_VERSION) return null
  return parsed
}

/**
 * @param {'sea'|'inland'} mode
 * @param {object} snapshot
 */
export function writePricingOfferDraft(mode, snapshot) {
  if (typeof window === 'undefined' || !snapshot) return
  const meaningful =
    mode === 'inland' ? isInlandOfferDraftMeaningful(snapshot) : isSeaOfferDraftMeaningful(snapshot)
  try {
    if (!meaningful) {
      window.localStorage.removeItem(storageKey(mode))
      return
    }
    window.localStorage.setItem(
      storageKey(mode),
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        ...snapshot,
      })
    )
  } catch {
    /* quota / serialization */
  }
}

/** @param {'sea'|'inland'} mode */
export function clearPricingOfferDraft(mode) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(storageKey(mode))
  } catch {
    /* ignore */
  }
}
