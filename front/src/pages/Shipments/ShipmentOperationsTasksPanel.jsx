import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Circle, Trash2, UserRound } from 'lucide-react'
import { formatDate } from '../../utils/dateUtils'
import LoaderDots from '../../components/LoaderDots'
import {
  bulkUpdateShipmentTasks,
  deleteShipmentTask,
  getShipmentTaskAssignees,
} from '../../api/shipments'
import { SHIPMENT_TASK_QUICK_TEMPLATE_KEYS } from './shipmentTaskQuickTemplates'
import {
  normalizeShipmentOperationTask,
  serializeShipmentOperationTaskForApi,
} from './shipmentOperationTaskPayload'

const defaultTaskForm = () => ({
  name: '',
  executionDate: '',
  executionTime: '',
  priority: 'medium',
  assigned_to_id: '',
  reminderMode: 'none',
  reminderAtDate: '',
  reminderAtTime: '',
  reminderBeforeValue: '',
  reminderBeforeUnit: 'hours',
})

function combineLocalDateTime(dateStr, timeStr) {
  if (!dateStr?.trim()) return null
  const t = (timeStr && timeStr.trim()) || '00:00'
  const timePart = t.length === 5 ? `${t}:00` : t
  return `${dateStr.trim()}T${timePart}`
}

export default function ShipmentOperationsTasksPanel({
  token,
  shipmentId,
  tasks,
  setTasks,
  canEditOps,
  currentUserId,
  refreshTasks,
}) {
  const { t, i18n } = useTranslation()
  const [operationAssignees, setOperationAssignees] = useState([])
  const [assigneesLoading, setAssigneesLoading] = useState(false)
  const [taskForm, setTaskForm] = useState(defaultTaskForm)
  const [taskFormError, setTaskFormError] = useState(null)
  const [persisting, setPersisting] = useState(false)
  const [delegateTaskId, setDelegateTaskId] = useState(null)
  const [delegateUserId, setDelegateUserId] = useState('')
  const [delegateSaving, setDelegateSaving] = useState(false)

  const loadAssignees = useCallback(() => {
    if (!token || !shipmentId || !canEditOps) return
    setAssigneesLoading(true)
    getShipmentTaskAssignees(token, shipmentId)
      .then((res) => setOperationAssignees(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOperationAssignees([]))
      .finally(() => setAssigneesLoading(false))
  }, [token, shipmentId, canEditOps])

  useEffect(() => {
    loadAssignees()
  }, [loadAssignees])

  const persistTasks = useCallback(
    async (nextTasks) => {
      if (!token || !shipmentId) return false
      setPersisting(true)
      setTaskFormError(null)
      try {
        const res = await bulkUpdateShipmentTasks(
          token,
          shipmentId,
          nextTasks.map(serializeShipmentOperationTaskForApi)
        )
        const data = Array.isArray(res.data) ? res.data : nextTasks
        setTasks(data.map(normalizeShipmentOperationTask))
        return true
      } catch (e) {
        setTaskFormError(e.message || t('shipments.ops.taskPersistError'))
        await refreshTasks?.()
        return false
      } finally {
        setPersisting(false)
      }
    },
    [token, shipmentId, setTasks, refreshTasks, t]
  )

  const assigneeName = useCallback(
    (id) => {
      if (id == null || id === '') return '—'
      const u = operationAssignees.find((x) => String(x.id) === String(id))
      return u?.name || `#${id}`
    },
    [operationAssignees]
  )

  const formatReminderCell = (task) => {
    if (task.reminder_before_value && task.reminder_before_unit) {
      const unitKey = `shipments.ops.reminderUnit.${task.reminder_before_unit}`
      return t('shipments.ops.reminderRelativeShort', {
        value: task.reminder_before_value,
        unit: t(unitKey, { defaultValue: task.reminder_before_unit }),
      })
    }
    if (task.reminder_at) {
      return formatDate(task.reminder_at, i18n.language)
    }
    return '—'
  }

  const formatExecutionCell = (task) => {
    if (task.execution_at) return formatDate(task.execution_at, i18n.language)
    if (task.due_date) return formatDate(task.due_date, i18n.language)
    return '—'
  }

  const applyTemplate = (key) => {
    setTaskForm((f) => ({
      ...f,
      name: t(`shipments.ops.taskTemplates.${key}`, { defaultValue: key }),
    }))
  }

  const handleAddFromForm = async (e) => {
    e.preventDefault()
    if (!canEditOps || !taskForm.name.trim()) return
    setTaskFormError(null)

    const execIso = combineLocalDateTime(taskForm.executionDate, taskForm.executionTime)
    let reminder_at = null
    let reminder_before_value = null
    let reminder_before_unit = null

    if (taskForm.reminderMode === 'absolute') {
      reminder_at = combineLocalDateTime(taskForm.reminderAtDate, taskForm.reminderAtTime)
      if (!reminder_at) {
        setTaskFormError(t('shipments.ops.reminderAbsoluteInvalid'))
        return
      }
    } else if (taskForm.reminderMode === 'relative') {
      if (!execIso) {
        setTaskFormError(t('shipments.ops.executionRequiredForReminder'))
        return
      }
      const v = parseInt(taskForm.reminderBeforeValue, 10)
      if (!Number.isFinite(v) || v < 1) {
        setTaskFormError(t('shipments.ops.reminderBeforeInvalid'))
        return
      }
      reminder_before_value = v
      reminder_before_unit =
        taskForm.reminderBeforeUnit === 'minutes'
          ? 'minutes'
          : taskForm.reminderBeforeUnit === 'days'
            ? 'days'
            : 'hours'
    }

    const maxOrder = tasks.reduce((m, tk) => Math.max(m, Number(tk.sort_order) || 0), 0)
    const newTask = normalizeShipmentOperationTask({
      name: taskForm.name.trim(),
      sort_order: maxOrder + 1,
      status: 'pending',
      assigned_to_id: taskForm.assigned_to_id ? Number(taskForm.assigned_to_id) : null,
      due_date: taskForm.executionDate || null,
      execution_at: execIso,
      priority: taskForm.priority,
      reminder_at,
      reminder_before_value,
      reminder_before_unit,
      completed_at: null,
    })
    const next = [...tasks, newTask]
    const ok = await persistTasks(next)
    if (ok) setTaskForm(defaultTaskForm())
  }

  const updateTaskField = async (taskId, updates) => {
    const next = tasks.map((tk) =>
      tk.id === taskId ? normalizeShipmentOperationTask({ ...tk, ...updates }) : tk
    )
    setTasks(next)
    return persistTasks(next)
  }

  const toggleComplete = (task) => {
    const done = task.status === 'done'
    void updateTaskField(task.id, {
      status: done ? 'pending' : 'done',
      completed_at: done ? null : new Date().toISOString(),
    })
  }

  const handleDelete = async (taskId) => {
    if (!canEditOps || !window.confirm(t('shipments.ops.taskDeleteConfirm'))) return
    try {
      await deleteShipmentTask(token, shipmentId, taskId)
      const next = tasks.filter((tk) => tk.id !== taskId)
      setTasks(next)
    } catch (err) {
      setTaskFormError(err.message || t('shipments.ops.taskDeleteError'))
    }
  }

  const openDelegate = (task) => {
    setDelegateTaskId(task.id)
    setDelegateUserId(task.assigned_to_id ? String(task.assigned_to_id) : '')
  }

  const closeDelegate = () => {
    setDelegateTaskId(null)
    setDelegateUserId('')
  }

  const submitDelegate = async () => {
    if (delegateTaskId == null || !delegateUserId) return
    setDelegateSaving(true)
    try {
      const ok = await updateTaskField(delegateTaskId, { assigned_to_id: Number(delegateUserId) })
      if (ok) closeDelegate()
    } finally {
      setDelegateSaving(false)
    }
  }

  const priorityLabel = (p) => t(`shipments.ops.taskPriority.${p}`, { defaultValue: p })

  const doneCount = useMemo(() => tasks.filter((tk) => tk.status === 'done').length, [tasks])

  return (
    <div className="shipment-detail-card shipment-op-tasks-card">
      <div className="shipment-detail-card__title flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
          {t('shipments.ops.taskManagement')}
        </div>
        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
          {t('shipments.ops.taskProgress', { done: doneCount, total: tasks.length })}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {taskFormError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {taskFormError}
          </p>
        ) : null}

        {canEditOps ? (
          <>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                {t('shipments.ops.quickTaskTemplates')}
              </h4>
              <div className="shipment-op-task-templates flex flex-wrap gap-2">
                {SHIPMENT_TASK_QUICK_TEMPLATE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="shipment-fin-btn shipment-fin-btn--secondary text-xs py-1.5 px-2"
                    onClick={() => applyTemplate(key)}
                  >
                    {t(`shipments.ops.taskTemplates.${key}`)}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleAddFromForm}
              className="shipment-op-task-form rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 p-4 space-y-3"
            >
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t('shipments.ops.newTaskFormTitle')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="client-detail-modal__label text-xs">{t('shipments.ops.taskName')}</label>
                  <input
                    className="clients-input w-full"
                    value={taskForm.name}
                    onChange={(e) => setTaskForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="client-detail-modal__label text-xs">{t('shipments.ops.executionDate')}</label>
                  <input
                    type="date"
                    lang={i18n.language === 'ar' ? 'ar-EG' : 'en-GB'}
                    className="clients-input w-full"
                    value={taskForm.executionDate}
                    onChange={(e) => setTaskForm((f) => ({ ...f, executionDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="client-detail-modal__label text-xs">{t('shipments.ops.executionTime')}</label>
                  <input
                    type="time"
                    className="clients-input w-full"
                    value={taskForm.executionTime}
                    onChange={(e) => setTaskForm((f) => ({ ...f, executionTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="client-detail-modal__label text-xs">{t('shipments.ops.taskPriorityLabel')}</label>
                  <select
                    className="clients-input w-full"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm((f) => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="low">{t('shipments.ops.taskPriority.low')}</option>
                    <option value="medium">{t('shipments.ops.taskPriority.medium')}</option>
                    <option value="high">{t('shipments.ops.taskPriority.high')}</option>
                    <option value="urgent">{t('shipments.ops.taskPriority.urgent')}</option>
                  </select>
                </div>
                <div>
                  <label className="client-detail-modal__label text-xs">{t('shipments.ops.assignTo')}</label>
                  <select
                    className="clients-input w-full"
                    value={taskForm.assigned_to_id}
                    onChange={(e) => setTaskForm((f) => ({ ...f, assigned_to_id: e.target.value }))}
                    disabled={assigneesLoading}
                  >
                    <option value="">{t('shipments.optional')}</option>
                    {currentUserId != null && (
                      <option value={String(currentUserId)}>{t('shipments.ops.assignToSelf')}</option>
                    )}
                    {operationAssignees
                      .filter((u) => String(u.id) !== String(currentUserId))
                      .map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="client-detail-modal__label text-xs">{t('shipments.ops.reminder')}</label>
                <select
                  className="clients-input w-full max-w-md mb-2"
                  value={taskForm.reminderMode}
                  onChange={(e) => setTaskForm((f) => ({ ...f, reminderMode: e.target.value }))}
                >
                  <option value="none">{t('shipments.ops.reminderMode.none')}</option>
                  <option value="absolute">{t('shipments.ops.reminderMode.absolute')}</option>
                  <option value="relative">{t('shipments.ops.reminderMode.relative')}</option>
                </select>
                {taskForm.reminderMode === 'absolute' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="date"
                      lang={i18n.language === 'ar' ? 'ar-EG' : 'en-GB'}
                      className="clients-input w-full"
                      value={taskForm.reminderAtDate}
                      onChange={(e) => setTaskForm((f) => ({ ...f, reminderAtDate: e.target.value }))}
                    />
                    <input
                      type="time"
                      className="clients-input w-full"
                      value={taskForm.reminderAtTime}
                      onChange={(e) => setTaskForm((f) => ({ ...f, reminderAtTime: e.target.value }))}
                    />
                  </div>
                ) : null}
                {taskForm.reminderMode === 'relative' ? (
                  <div className="flex flex-wrap gap-2 items-end">
                    <input
                      type="number"
                      min={1}
                      className="clients-input w-24"
                      value={taskForm.reminderBeforeValue}
                      onChange={(e) => setTaskForm((f) => ({ ...f, reminderBeforeValue: e.target.value }))}
                    />
                    <select
                      className="clients-input min-w-[140px]"
                      value={taskForm.reminderBeforeUnit}
                      onChange={(e) => setTaskForm((f) => ({ ...f, reminderBeforeUnit: e.target.value }))}
                    >
                      <option value="minutes">{t('shipments.ops.durationUnit.minutes')}</option>
                      <option value="hours">{t('shipments.ops.durationUnit.hours')}</option>
                      <option value="days">{t('shipments.ops.durationUnit.days')}</option>
                    </select>
                    <span className="text-xs text-gray-600 dark:text-gray-400 pb-2">
                      {t('shipments.ops.reminderBeforeExecutionHint')}
                    </span>
                  </div>
                ) : null}
              </div>

              <button
                type="submit"
                className="client-detail-modal__btn client-detail-modal__btn--primary text-sm"
                disabled={persisting || !taskForm.name.trim()}
              >
                {persisting ? <LoaderDots size={8} /> : t('shipments.ops.addTaskFromForm')}
              </button>
            </form>
          </>
        ) : null}

        <div className="shipment-op-task-table-wrap overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="shipment-op-task-table min-w-full text-sm">
            <thead>
              <tr>
                <th className="shipment-op-task-th">{t('shipments.ops.taskName')}</th>
                <th className="shipment-op-task-th">{t('shipments.ops.executionDateCol')}</th>
                <th className="shipment-op-task-th">{t('shipments.ops.taskPriorityLabel')}</th>
                <th className="shipment-op-task-th">{t('shipments.ops.assignedUser')}</th>
                <th className="shipment-op-task-th">{t('shipments.ops.reminder')}</th>
                <th className="shipment-op-task-th">{t('shipments.ops.taskStatusCol')}</th>
                <th className="shipment-op-task-th shipment-op-task-th--actions">{t('shipments.ops.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="shipment-op-task-tr">
                  <td className="shipment-op-task-td font-medium">{task.name}</td>
                  <td className="shipment-op-task-td">{formatExecutionCell(task)}</td>
                  <td className="shipment-op-task-td">{priorityLabel(task.priority)}</td>
                  <td className="shipment-op-task-td">{assigneeName(task.assigned_to_id)}</td>
                  <td className="shipment-op-task-td text-xs">{formatReminderCell(task)}</td>
                  <td className="shipment-op-task-td">
                    <button
                      type="button"
                      disabled={!canEditOps}
                      onClick={() => toggleComplete(task)}
                      className={`inline-flex items-center justify-center rounded border border-gray-200 dark:border-gray-600 p-1.5 ${
                        task.status === 'done' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-gray-400'
                      }`}
                      aria-pressed={task.status === 'done'}
                      title={task.status === 'done' ? t('shipments.ops.markPending') : t('shipments.ops.markComplete')}
                    >
                      {task.status === 'done' ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </button>
                  </td>
                  <td className="shipment-op-task-td">
                    {canEditOps ? (
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="shipment-fin-btn shipment-fin-btn--secondary text-xs py-1 px-2"
                          onClick={() => openDelegate(task)}
                        >
                          <UserRound className="h-3.5 w-3.5 inline" aria-hidden /> {t('shipments.ops.delegate')}
                        </button>
                        <button
                          type="button"
                          className="shipment-fin-btn shipment-fin-btn--danger text-xs py-1 px-2"
                          onClick={() => handleDelete(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 inline" aria-hidden /> {t('shipments.ops.delete')}
                        </button>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tasks.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">{t('shipments.ops.tasksEmpty')}</p>
          ) : null}
        </div>
      </div>

      {delegateTaskId != null ? (
        <div className="shipment-op-delegate-overlay" role="presentation">
          <div className="shipment-op-delegate-backdrop" onClick={closeDelegate} aria-hidden />
          <div
            className="shipment-op-delegate-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shipment-delegate-title"
          >
            <header className="shipment-op-delegate-header">
              <h2 id="shipment-delegate-title" className="text-base font-semibold text-white">
                {t('shipments.ops.delegateTitle')}
              </h2>
              <button
                type="button"
                className="text-white/80 hover:text-white text-xl leading-none"
                onClick={closeDelegate}
                aria-label={t('shipments.close')}
              >
                ×
              </button>
            </header>
            <div className="p-4">
              <label className="client-detail-modal__label text-xs block mb-1">{t('shipments.ops.assignTo')}</label>
              <select
                className="clients-input w-full mb-4"
                value={delegateUserId}
                onChange={(e) => setDelegateUserId(e.target.value)}
              >
                <option value="">{t('common.select')}</option>
                {operationAssignees.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--secondary"
                  onClick={closeDelegate}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  className="client-detail-modal__btn client-detail-modal__btn--primary"
                  disabled={delegateSaving || !delegateUserId}
                  onClick={submitDelegate}
                >
                  {delegateSaving ? <LoaderDots size={8} /> : t('shipments.ops.delegateSave')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
