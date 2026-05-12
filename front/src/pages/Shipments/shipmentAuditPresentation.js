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

function asDisplayString(v) {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  const s = String(v)
  return s === '' ? '—' : s
}

/**
 * @param {object} row
 * @param {import('i18next').TFunction} t
 * @returns {{ user: string, action: string, actionDetail: string, oldValue: string, newValue: string, time: string, event: string }}
 */
export function formatShipmentAuditRow(row, t) {
  const props = cleanProperties(row.properties)
  const user = row.causer?.name || (row.causer_id != null ? `#${row.causer_id}` : '—')
  const time = row.created_at || ''
  const event = row.event || ''

  const action = t(`shipments.ops.audit.events.${event}`, { defaultValue: event })
  const actionDetail = props.task_name ? String(props.task_name) : ''

  let oldValue = props.old_value
  let newValue = props.new_value

  if (event === 'shipment.operational_phase_changed') {
    oldValue = translatePhase(props.from ?? oldValue, t)
    newValue = translatePhase(props.to ?? newValue, t)
  } else if (event === 'shipment.operations_status_changed') {
    oldValue = asDisplayString(props.from ?? oldValue)
    newValue = asDisplayString(props.to ?? newValue)
  } else if (event === 'shipment.schedule_updated' || event === 'shipment.operations_profile_updated') {
    oldValue = props.old_value ?? asDisplayString(props.before)
    newValue = props.new_value ?? asDisplayString(props.after)
  } else if (event === 'shipment.tasks_updated') {
    oldValue = '—'
    newValue = props.task_count != null ? String(props.task_count) : asDisplayString(props)
  } else if (
    props.action === 'TASK_DELEGATED' ||
    event === 'shipment.operation_task_delegated'
  ) {
    const performer = props.performed_by?.name || user
    const fromN =
      props.previous_assignee?.name ||
      t('shipments.ops.audit.unassigned', { defaultValue: 'Unassigned' })
    const toN =
      props.new_assignee?.name || t('shipments.ops.audit.unassigned', { defaultValue: 'Unassigned' })
    const taskName = props.task_name || ''
    oldValue = '—'
    newValue = t('shipments.ops.audit.taskDelegatedLine', {
      performer,
      taskName,
      fromAssignee: fromN,
      toAssignee: toN,
    })
  } else {
    if (oldValue === undefined || oldValue === null) {
      oldValue = props.from !== undefined ? props.from : props.before
    }
    if (newValue === undefined || newValue === null) {
      newValue = props.to !== undefined ? props.to : props.after
    }
  }

  return {
    user,
    action,
    actionDetail,
    oldValue: asDisplayString(oldValue),
    newValue: asDisplayString(newValue),
    time,
    event,
  }
}
