import { isoDatePart } from './opsDateDisplay'

/** Map legacy API statuses to the three stored statuses. */
export function normalizeStoredTaskStatus(status) {
  if (status === 'done') return 'completed'
  if (status === 'in_progress') return 'pending'
  if (status === 'completed' || status === 'delegated' || status === 'pending') return status
  return 'pending'
}

export function isTaskCompleted(task) {
  return normalizeStoredTaskStatus(task?.status) === 'completed'
}

/** Start of local calendar day for "today" comparisons. */
function startOfLocalDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Overdue when execution date (or due_date) is strictly before today and not completed.
 * Uses date part of execution_at when present.
 */
export function isTaskOverdue(task) {
  if (isTaskCompleted(task)) return false
  const iso = task?.execution_at ? isoDatePart(task.execution_at) : task?.due_date ? isoDatePart(task.due_date) : ''
  if (!iso) return false
  const exec = startOfLocalDay(new Date(`${iso}T12:00:00`))
  const today = startOfLocalDay(new Date())
  return exec < today
}

export function countCompletedTasks(tasks) {
  if (!Array.isArray(tasks)) return 0
  return tasks.filter((t) => isTaskCompleted(t)).length
}

export function countOverdueTasks(tasks) {
  if (!Array.isArray(tasks)) return 0
  return tasks.filter((t) => isTaskOverdue(t)).length
}

/**
 * UI status: pending | completed | delegated | overdue (overdue wins when not completed).
 */
export function getTaskDisplayStatus(task) {
  if (isTaskCompleted(task)) return 'completed'
  if (isTaskOverdue(task)) return 'overdue'
  const s = normalizeStoredTaskStatus(task?.status)
  if (s === 'delegated') return 'delegated'
  return 'pending'
}

export function priorityRowClass(priority) {
  switch (priority) {
    case 'urgent':
      return 'shipment-op-task-tr--pri-urgent'
    case 'high':
      return 'shipment-op-task-tr--pri-high'
    case 'low':
      return 'shipment-op-task-tr--pri-low'
    default:
      return 'shipment-op-task-tr--pri-medium'
  }
}
