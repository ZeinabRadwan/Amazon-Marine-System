export function normalizeShipmentOperationTask(task) {
  if (!task || typeof task !== 'object') return task
  const assigned_to_id =
    task.assigned_to_id != null && task.assigned_to_id !== ''
      ? Number(task.assigned_to_id)
      : task.assigned_to?.id != null
        ? Number(task.assigned_to.id)
        : null
  const sort = Number(task.sort_order)
  return {
    ...task,
    assigned_to_id,
    priority: task.priority || 'medium',
    sort_order: Number.isFinite(sort) && sort >= 1 ? sort : 1,
    status: task.status || 'pending',
  }
}

export function serializeShipmentOperationTaskForApi(task) {
  const assignedRaw = task.assigned_to_id ?? task.assigned_to?.id
  const assigned_to_id =
    assignedRaw != null && assignedRaw !== '' ? Number(assignedRaw) : null

  const sort = Number(task.sort_order)
  const payload = {
    name: task.name,
    sort_order: Number.isFinite(sort) && sort >= 1 ? sort : 1,
    assigned_to_id,
    due_date: task.due_date || null,
    execution_at: task.execution_at || null,
    priority: task.priority || 'medium',
    status: task.status || 'pending',
    completed_at: task.completed_at || null,
    reminder_at: task.reminder_at || null,
    reminder_before_value: task.reminder_before_value ?? null,
    reminder_before_unit: task.reminder_before_unit || null,
  }
  if (task.id != null && task.id !== '') {
    payload.id = Number(task.id)
  }
  return payload
}
