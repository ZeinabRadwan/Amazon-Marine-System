/**
 * Shipment audit log: format Activity rows for the Operations audit tab.
 * Backend stores `properties` (may include `request`); prefer `old_value` / `new_value` when present.
 */

function cleanProperties(properties) {
  if (!properties || typeof properties !== 'object') return {}
  const { request: _r, ...rest } = properties
  return rest
}

function translatePhase(code, t) {
  if (code == null || code === '') return '—'
  return t(`shipments.ops.phase.${code}`, { defaultValue: String(code) })
}

/**
 * @param {object} row
 * @param {import('i18next').TFunction} t
 * @returns {{ user: string, action: string, actionDetail: string, oldValue: string, newValue: string, time: string }}
 */
export function formatShipmentAuditRow(row, t) {
  const props = cleanProperties(row.properties)
  const user = row.causer?.name || (row.causer_id != null ? `#${row.causer_id}` : '—')
  const time = row.created_at || ''

  const event = row.event || ''
  let action = t(`shipments.ops.audit.events.${event}`, { defaultValue: event })
  let actionDetail = props.task_name ? String(props.task_name) : ''

  let oldValue = props.old_value
  let newValue = props.new_value

  if (oldValue === undefined && props.from !== undefined) {
    oldValue = props.from
  }
  if (newValue === undefined && props.to !== undefined) {
    newValue = props.to
  }

  if (event === 'shipment.operational_phase_changed' || event === 'shipment.operations_status_changed') {
    if (event === 'shipment.operational_phase_changed') {
      oldValue = translatePhase(props.from ?? oldValue, t)
      newValue = translatePhase(props.to ?? newValue, t)
    } else {
      oldValue = oldValue != null && oldValue !== '' ? String(oldValue) : '—'
      newValue = newValue != null && newValue !== '' ? String(newValue) : '—'
    }
  }

  if (event === 'shipment.schedule_updated') {
    oldValue = props.old_value ?? (props.before ? JSON.stringify(props.before) : '—')
    newValue = props.new_value ?? (props.after ? JSON.stringify(props.after) : '—')
  }

  if (event === 'shipment.operations_profile_updated') {
    oldValue = props.old_value ?? (props.before ? JSON.stringify(props.before) : '—')
    newValue = props.new_value ?? (props.after ? JSON.stringify(props.after) : '—')
  }

  if (event === 'shipment.tasks_updated') {
    oldValue = '—'
    newValue = props.task_count != null ? String(props.task_count) : JSON.stringify(props)
  }

  if (oldValue === undefined || oldValue === null) {
    oldValue = props.before != null ? (typeof props.before === 'string' ? props.before : JSON.stringify(props.before)) : '—'
  }
  if (newValue === undefined || newValue === null) {
    newValue = props.after != null ? (typeof props.after === 'string' ? props.after : JSON.stringify(props.after)) : '—'
  }

  if (typeof oldValue === 'object') oldValue = JSON.stringify(oldValue)
  if (typeof newValue === 'object') newValue = JSON.stringify(newValue)

  return {
    user,
    action,
    actionDetail,
    oldValue: String(oldValue === '' ? '—' : oldValue),
    newValue: String(newValue === '' ? '—' : newValue),
    time,
    event,
  }
}
