/** localStorage draft for Shipment Detail → Operations tab (until user clicks Save). */

const PREFIX = 'amazonMarine.shipmentOpsDraft.v1.'

function storageKey(shipmentId) {
  return `${PREFIX}${String(shipmentId)}`
}

/**
 * @param {unknown} shipmentId
 * @returns {{ version: number, savedAt: string, opsData: object, tasks: array } | null}
 */
export function readShipmentOperationsDraft(shipmentId) {
  if (shipmentId == null || shipmentId === '') return null
  try {
    const raw = localStorage.getItem(storageKey(shipmentId))
    if (!raw) return null
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object' || j.version !== 1) return null
    if (!j.opsData || typeof j.opsData !== 'object') return null
    const tasks = Array.isArray(j.tasks) ? j.tasks : []
    return { ...j, tasks }
  } catch {
    return null
  }
}

/**
 * @param {unknown} shipmentId
 * @param {{ opsData: object, tasks: array }} payload
 */
export function writeShipmentOperationsDraft(shipmentId, payload) {
  if (shipmentId == null || shipmentId === '') return
  const body = {
    version: 1,
    savedAt: new Date().toISOString(),
    opsData: JSON.parse(JSON.stringify(payload.opsData)),
    tasks: JSON.parse(JSON.stringify(payload.tasks)),
  }
  localStorage.setItem(storageKey(shipmentId), JSON.stringify(body))
}

export function clearShipmentOperationsDraft(shipmentId) {
  if (shipmentId == null || shipmentId === '') return
  try {
    localStorage.removeItem(storageKey(shipmentId))
  } catch {
    /* ignore */
  }
}

/** Deep-merge saved draft onto freshly loaded API `base` (transport_instruction_profile merged). */
export function mergeOpsDraftIntoLoadedState(base, draftOps) {
  if (!base || typeof base !== 'object') return base
  if (!draftOps || typeof draftOps !== 'object') return base
  const merged = { ...base, ...draftOps }
  const bTip = base.transport_instruction_profile
  const dTip = draftOps.transport_instruction_profile
  if (dTip && typeof dTip === 'object') {
    merged.transport_instruction_profile = {
      ...(typeof bTip === 'object' && bTip ? bTip : {}),
      ...dTip,
    }
  }
  if (!Array.isArray(merged.service_types) || merged.service_types.length === 0) {
    merged.service_types = Array.isArray(base.service_types) && base.service_types.length > 0 ? base.service_types : ['sea_freight']
  }
  return merged
}
