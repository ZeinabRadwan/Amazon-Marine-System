/**
 * Map shipment.status (free text) to pipeline step index 0–3 for UI strip.
 * Aligned with ShipmentController::stats normalization concept.
 */

const STEPS = ['booked', 'in_transit', 'customs_clearance', 'delivered']

export function normalizeStatusToPipelineKey(status) {
  if (status == null || status === '') return null
  const v = String(status).toLowerCase().trim()
  if (v.includes('deliver') || v.includes('تسليم')) return 'delivered'
  if (v.includes('customs') || v.includes('جمرك') || v.includes('clearance') || v.includes('تخليص')) {
    return 'customs_clearance'
  }
  if (v.includes('transit') || v.includes('طريق')) return 'in_transit'
  if (v.includes('book') || v.includes('حجز')) return 'booked'
  return null
}

/** Active step index 0–3, or 0 if unknown */
export function getPipelineStepIndex(status) {
  const key = normalizeStatusToPipelineKey(status)
  if (!key) return 0
  const idx = STEPS.indexOf(key)
  return idx >= 0 ? idx : 0
}

export const PIPELINE_STEP_KEYS = STEPS
