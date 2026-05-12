/** @typedef {'sea_freight'|'inland_transport'|'customs_clearance'} ShipmentServiceTypeId */

/** @type {ShipmentServiceTypeId[]} */
export const SERVICE_TYPE_IDS = ['sea_freight', 'inland_transport', 'customs_clearance']

/**
 * Fixed operational phases (backend `ShipmentOperationalPhase`).
 * Order matches business flow.
 * @type {readonly string[]}
 */
export const OPERATIONAL_PHASE_ORDER = Object.freeze([
  'doc_review',
  'container_allocation',
  'loading_in_progress',
  'customs_procedures_done',
  'awaiting_draft_bl',
  'preparing_shipment_docs',
  'vessel_sailed',
  'awaiting_client_payment',
  'bank_payment_in_progress',
  'customs_release_in_progress',
  'customs_released',
  'shipment_complete',
])
