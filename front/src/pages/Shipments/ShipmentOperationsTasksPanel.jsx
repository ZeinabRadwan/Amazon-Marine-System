import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Trash2, CornerUpRight, Plus } from 'lucide-react'
import LoaderDots from '../../components/LoaderDots'
import DatePicker from '../../components/DatePicker'
import { UI_DATE_FORMAT } from '../../utils/dateUtils'
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
import { isoToDdMmYyyy } from './opsDateDisplay'
import {
  getTaskDisplayStatus,
  isTaskCompleted,
  priorityBadgeClass,
  taskStatusBadgeClass,
  countCompletedTasks,
  countOverdueTasks,
} from './shipmentOperationTaskUi'

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
  const [deleteTaskId, setDeleteTaskId] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [showAddTaskForm, setShowAddTaskForm] = useState(false)

  const completedCount = useMemo(() => countCompletedTasks(tasks), [tasks])
  const overdueCount = useMemo(() => countOverdueTasks(tasks), [tasks])
  const totalTasks = tasks.length
  const progressPct = totalTasks > 0 ? Math.min(100, Math.round((completedCount / totalTasks) * 100)) : 0

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

  const assigneeLabel = useCallback(
    (task) => {
      const id = task?.assigned_to_id
      if (id == null || id === '') return '—'
      const fromList = operationAssignees.find((x) => String(x.id) === String(id))
      if (fromList?.name) return fromList.name
      const nested = task.assigned_user || task.assigned_to
      if (nested?.name && String(nested.id) === String(id)) return nested.name
      return `#${id}`
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
      return isoToDdMmYyyy(task.reminder_at)
    }
    return '—'
  }

  const formatExecutionCell = (task) => {
    if (task.execution_at) return isoToDdMmYyyy(task.execution_at)
    if (task.due_date) return isoToDdMmYyyy(task.due_date)
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
    if (ok) {
      setTaskForm(defaultTaskForm())
      setShowAddTaskForm(false)
      await refreshTasks?.()
    }
  }

  const updateTaskField = async (taskId, updates) => {
    const next = tasks.map((tk) =>
      tk.id === taskId ? normalizeShipmentOperationTask({ ...tk, ...updates }) : tk
    )
    setTasks(next)
    return persistTasks(next)
  }

  const toggleComplete = (task) => {
    const completed = isTaskCompleted(task)
    void updateTaskField(task.id, {
      status: completed ? 'pending' : 'completed',
      completed_at: completed ? null : new Date().toISOString(),
    })
  }

  const confirmDeleteTask = async () => {
    if (deleteTaskId == null || !token || !shipmentId) return
    setDeleteSubmitting(true)
    try {
      await deleteShipmentTask(token, shipmentId, deleteTaskId)
      const next = tasks.filter((tk) => tk.id !== deleteTaskId)
      setTasks(next)
      setDeleteTaskId(null)
    } catch (err) {
      setTaskFormError(err.message || t('shipments.ops.taskDeleteError'))
    } finally {
      setDeleteSubmitting(false)
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
      const ok = await updateTaskField(delegateTaskId, {
        assigned_to_id: Number(delegateUserId),
        status: 'delegated',
      })
      if (ok) closeDelegate()
    } finally {
      setDelegateSaving(false)
    }
  }

  return (
    <div className="shipment-op-tasks-inline-body">
      {taskFormError ? (
        <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
          {taskFormError}
        </p>
      ) : null}

      <header className="shipment-op-task-mgmt-header">
        <h3 className="shipment-op-task-mgmt-header__title">{t('shipments.ops.taskManagement')}</h3>
        <div className="shipment-op-task-mgmt-header__center">
          {totalTasks > 0 ? (
            <>
              <span className="shipment-op-task-mgmt-header__line text-sm text-gray-800 dark:text-gray-100">
                {t('shipments.ops.taskMgmtHeaderProgress', { done: completedCount, total: totalTasks })}
              </span>
              <div
                className="shipment-op-task-mgmt-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
                aria-label={t('shipments.ops.taskMgmtProgressAria', { pct: progressPct })}
              >
                <div className="shipment-op-task-mgmt-progress__track">
                  <div className="shipment-op-task-mgmt-progress__fill" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <span
                className={`shipment-op-task-mgmt-header__line text-sm ${overdueCount > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}
              >
                {t('shipments.ops.taskMgmtHeaderOverdue', { count: overdueCount })}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('shipments.ops.taskMgmtHeaderEmpty')}</span>
          )}
        </div>
        {canEditOps ? (
          <div className="shipment-op-task-mgmt-header__right">
            <button
              type="button"
              className="client-detail-modal__btn client-detail-modal__btn--secondary text-sm inline-flex items-center gap-1.5"
              onClick={() => setShowAddTaskForm((v) => !v)}
              aria-expanded={showAddTaskForm}
              aria-controls="shipment-op-task-form"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden />
              {t('shipments.ops.addTaskToggle')}
            </button>
          </div>
        ) : (
          <div className="shipment-op-task-mgmt-header__right" aria-hidden />
        )}
      </header>

      <div className="shipment-op-tasks-body px-4 pb-4 pt-3 space-y-4">
        {canEditOps && showAddTaskForm ? (
          <>
            <div className="mb-2">
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
              id="shipment-op-task-form"
              onSubmit={handleAddFromForm}
              className="shipment-op-task-form rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/30 p-3 space-y-3"
            >
            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('shipments.ops.newTaskFormTitle')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                <label className="client-detail-modal__label text-xs" htmlFor="shipment-op-task-execution-date">
                  {t('shipments.ops.executionDate')}
                </label>
                <DatePicker
                  id="shipment-op-task-execution-date"
                  locale={i18n.language}
                  className="clients-input w-full"
                  value={taskForm.executionDate}
                  onChange={(v) => setTaskForm((f) => ({ ...f, executionDate: v || '' }))}
                  placeholder={UI_DATE_FORMAT}
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
                onChange={(e) => {
                  const mode = e.target.value
                  setTaskForm((f) => ({
                    ...f,
                    reminderMode: mode,
                    ...(mode === 'absolute'
                      ? { reminderBeforeValue: '', reminderBeforeUnit: f.reminderBeforeUnit || 'hours' }
                      : {}),
                    ...(mode === 'relative' ? { reminderAtDate: '', reminderAtTime: '' } : {}),
                    ...(mode === 'none'
                      ? {
                          reminderAtDate: '',
                          reminderAtTime: '',
                          reminderBeforeValue: '',
                          reminderBeforeUnit: f.reminderBeforeUnit || 'hours',
                        }
                      : {}),
                  }))
                }}
              >
                <option value="none">{t('shipments.ops.reminderMode.none')}</option>
                <option value="absolute">{t('shipments.ops.reminderMode.absolute')}</option>
                <option value="relative">{t('shipments.ops.reminderMode.relative')}</option>
              </select>
              {taskForm.reminderMode === 'absolute' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <DatePicker
                    id="shipment-op-task-reminder-date"
                    locale={i18n.language}
                    className="clients-input w-full"
                    value={taskForm.reminderAtDate}
                    onChange={(v) => setTaskForm((f) => ({ ...f, reminderAtDate: v || '' }))}
                    placeholder={UI_DATE_FORMAT}
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
              <th className="shipment-op-task-th shipment-op-task-th--narrow" aria-label={t('shipments.ops.completeToggle')} />
              <th className="shipment-op-task-th">{t('shipments.ops.taskName')}</th>
              <th className="shipment-op-task-th">{t('shipments.ops.taskPriorityLabel')}</th>
              <th className="shipment-op-task-th">{t('shipments.ops.executionDateCol')}</th>
              <th className="shipment-op-task-th">{t('shipments.ops.assignedUser')}</th>
              <th className="shipment-op-task-th">{t('shipments.ops.reminder')}</th>
              <th className="shipment-op-task-th">{t('shipments.ops.taskStatusCol')}</th>
              <th className="shipment-op-task-th shipment-op-task-th--actions" aria-label={t('shipments.ops.actions')} />
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const displayStatus = getTaskDisplayStatus(task)
              const pri = task.priority || 'medium'
              return (
              <tr key={task.id} className="shipment-op-task-tr">
                <td className="shipment-op-task-td shipment-op-task-td--checkbox">
                  <input
                    type="checkbox"
                    className="shipment-op-task-checkbox"
                    checked={isTaskCompleted(task)}
                    disabled={!canEditOps}
                    onChange={() => toggleComplete(task)}
                    aria-label={t('shipments.ops.markComplete')}
                  />
                </td>
                <td className="shipment-op-task-td font-medium">{task.name}</td>
                <td className="shipment-op-task-td">
                  <span className={priorityBadgeClass(pri)}>
                    {t(`shipments.ops.taskPriority.${pri}`, { defaultValue: pri })}
                  </span>
                </td>
                <td className="shipment-op-task-td whitespace-nowrap">{formatExecutionCell(task)}</td>
                <td className="shipment-op-task-td">{assigneeLabel(task)}</td>
                <td className="shipment-op-task-td text-xs">{formatReminderCell(task)}</td>
                <td className="shipment-op-task-td">
                  <span className={taskStatusBadgeClass(displayStatus)}>
                    {t(`shipments.ops.taskDisplayStatus.${displayStatus}`, { defaultValue: displayStatus })}
                  </span>
                </td>
                <td className="shipment-op-task-td shipment-op-task-td--actions">
                  {canEditOps ? (
                    <div className="shipment-op-task-actions">
                      <button
                        type="button"
                        className="shipment-op-task-icon-btn"
                        onClick={() => toggleComplete(task)}
                        disabled={isTaskCompleted(task)}
                        aria-label={t('shipments.ops.markComplete')}
                        title={t('shipments.ops.markComplete')}
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="shipment-op-task-icon-btn"
                        onClick={() => openDelegate(task)}
                        disabled={isTaskCompleted(task)}
                        aria-label={t('shipments.ops.delegate')}
                        title={t('shipments.ops.delegate')}
                      >
                        <CornerUpRight className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="shipment-op-task-icon-btn shipment-op-task-icon-btn--danger"
                        onClick={() => setDeleteTaskId(task.id)}
                        aria-label={t('shipments.ops.delete')}
                        title={t('shipments.ops.delete')}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
        {tasks.length === 0 ? (
          <p className="p-3 text-sm text-gray-500 dark:text-gray-400">{t('shipments.ops.tasksEmpty')}</p>
        ) : null}
      </div>
      </div>

      {delegateTaskId != null ? (
        <div className="clients-modal shipment-op-nested-modal" role="presentation">
          <div className="clients-modal-backdrop" onClick={closeDelegate} aria-hidden />
          <div className="clients-modal-content clients-modal-content--wide" role="dialog" aria-modal="true" aria-labelledby="shipment-delegate-title">
            <h2 id="shipment-delegate-title">{t('shipments.ops.delegateTitle')}</h2>
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
            <div className="clients-modal-actions">
              <button type="button" className="clients-btn" onClick={closeDelegate}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="clients-btn clients-btn--primary"
                disabled={delegateSaving || !delegateUserId}
                onClick={submitDelegate}
              >
                {delegateSaving ? <LoaderDots size={8} /> : t('shipments.ops.delegateSave')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTaskId != null ? (
        <div className="clients-modal shipment-op-nested-modal" role="presentation">
          <div className="clients-modal-backdrop" onClick={() => !deleteSubmitting && setDeleteTaskId(null)} aria-hidden />
          <div className="clients-modal-content" role="dialog" aria-modal="true" aria-labelledby="shipment-task-delete-title">
            <h2 id="shipment-task-delete-title">{t('shipments.ops.taskDeleteModalTitle')}</h2>
            <p>{t('shipments.ops.taskDeleteModalMessage')}</p>
            <div className="clients-modal-actions">
              <button type="button" className="clients-btn" onClick={() => setDeleteTaskId(null)} disabled={deleteSubmitting}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="clients-btn clients-btn--danger"
                onClick={confirmDeleteTask}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? t('shipments.ops.deleting') : t('shipments.ops.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
