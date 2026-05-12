import { normalizeStoredTaskStatus } from './shipmentOperationTaskUi'

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
  return {
    ...task,
    assigned_to_id,
    priority: task.priority || 'medium',
    sort_order: Number.isFinite(sort) && sort >= 1 ? sort : 1,
    status: normalizeStoredTaskStatus(task.status),
  }
}

export function serializeShipmentOperationTaskForApi(task) {
  /** Persist only DB column `assigned_to_id` — never infer from relation objects. */
  const sort = Number(task.sort_order)
  const payload = {
    name: task.name,
    sort_order: Number.isFinite(sort) && sort >= 1 ? sort : 1,
    due_date: task.due_date || null,
    execution_at: task.execution_at || null,
    priority: task.priority || 'medium',
    status: normalizeStoredTaskStatus(task.status || 'pending'),
    completed_at: task.completed_at || null,
    reminder_at: task.reminder_at || null,
    reminder_before_value: task.reminder_before_value ?? null,
    reminder_before_unit: task.reminder_before_unit || null,
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
