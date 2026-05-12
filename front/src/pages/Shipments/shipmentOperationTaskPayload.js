import { normalizeStoredTaskStatus } from './shipmentOperationTaskUi'

/** Backend allows either fixed reminder_at OR relative before_* — never both. */
export function coerceTaskReminderFields(task) {
  if (!task || typeof task !== 'object') {
    return { reminder_at: null, reminder_before_value: null, reminder_before_unit: null }
  }
  const rawAt = task.reminder_at
  const hasAt = rawAt != null && String(rawAt).trim() !== ''

  const rawVal = task.reminder_before_value
  const numVal = rawVal === '' || rawVal == null ? NaN : Number(rawVal)
  const unitRaw = task.reminder_before_unit
  const hasRelative =
    Number.isFinite(numVal) &&
    numVal >= 1 &&
    unitRaw != null &&
    String(unitRaw).trim() !== ''

  if (hasAt) {
    return { reminder_at: rawAt, reminder_before_value: null, reminder_before_unit: null }
  }
  if (hasRelative) {
    return {
      reminder_at: null,
      reminder_before_value: numVal,
      reminder_before_unit: String(unitRaw).trim(),
    }
  }
  return { reminder_at: null, reminder_before_value: null, reminder_before_unit: null }
}

export function normalizeShipmentOperationTask(task) {
  if (!task || typeof task !== 'object') return task
  let assigned_to_id = null
  if (task.assigned_to_id != null && task.assigned_to_id !== '') {
    const n = Number(task.assigned_to_id)
    if (Number.isFinite(n)) assigned_to_id = n
  } else if (task.assigned_user?.id != null && task.assigned_user.id !== '') {
    const n = Number(task.assigned_user.id)
    if (Number.isFinite(n)) assigned_to_id = n
  } else if (task.assigned_to?.id != null && task.assigned_to.id !== '') {
    const n = Number(task.assigned_to.id)
    if (Number.isFinite(n)) assigned_to_id = n
  }
  const sort = Number(task.sort_order)
  const reminders = coerceTaskReminderFields(task)
  return {
    ...task,
    assigned_to_id,
    priority: task.priority || 'medium',
    sort_order: Number.isFinite(sort) && sort >= 1 ? sort : 1,
    status: normalizeStoredTaskStatus(task.status),
    ...reminders,
  }
}

export function serializeShipmentOperationTaskForApi(task) {
  /** Persist only DB column `assigned_to_id` — never infer from relation objects. */
  const sort = Number(task.sort_order)
  const reminders = coerceTaskReminderFields(task)
  const payload = {
    name: task.name,
    sort_order: Number.isFinite(sort) && sort >= 1 ? sort : 1,
    due_date: task.due_date || null,
    execution_at: task.execution_at || null,
    priority: task.priority || 'medium',
    status: normalizeStoredTaskStatus(task.status || 'pending'),
    completed_at: task.completed_at || null,
    reminder_at: reminders.reminder_at,
    reminder_before_value: reminders.reminder_before_value,
    reminder_before_unit: reminders.reminder_before_unit,
  }
  if (Object.prototype.hasOwnProperty.call(task, 'assigned_to_id')) {
    const rawId = task.assigned_to_id
    payload.assigned_to_id =
      rawId != null && rawId !== '' && Number.isFinite(Number(rawId)) ? Number(rawId) : null
  }
  if (task.id != null && task.id !== '') {
    payload.id = Number(task.id)
  }
  return payload
}
