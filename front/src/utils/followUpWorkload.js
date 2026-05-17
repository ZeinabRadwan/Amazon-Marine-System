const TERMINAL_OUTCOMES = new Set(['deal_done', 'not_interested'])

function dateOnlyLocal(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Actionable due date: next follow-up if set, otherwise reminder. */
export function followUpEffectiveDueAt(f) {
  if (!f) return null
  const next = f.next_follow_up_at
  const reminder = f.reminder_at
  if (next != null && String(next).trim() !== '') return next
  if (reminder != null && String(reminder).trim() !== '') return reminder
  return null
}

function priorityForFollowUp(f, effectiveDue) {
  const due = effectiveDue ? new Date(effectiveDue) : null
  const now = new Date()
  if (due && !Number.isNaN(due.getTime()) && due < now) return 'high'
  if (f.reminder_at) {
    const rem = new Date(f.reminder_at)
    if (!Number.isNaN(rem.getTime()) && dateOnlyLocal(rem) === dateOnlyLocal(now)) return 'medium'
  }
  return 'normal'
}

function mapRow(f, clientId, clientName, effectiveDue) {
  return {
    id: f.id,
    client_id: clientId ?? f.client_id ?? null,
    client_name: clientName ?? f.client_name ?? null,
    channel: f.channel,
    followup_type: f.followup_type,
    priority: priorityForFollowUp(f, effectiveDue),
    outcome: f.outcome,
    summary: f.summary,
    occurred_at: f.occurred_at,
    next_follow_up_at: f.next_follow_up_at ?? effectiveDue,
    reminder_at: f.reminder_at,
  }
}

function sortByEffectiveDue(a, b) {
  const ta = new Date(followUpEffectiveDueAt(a)).getTime()
  const tb = new Date(followUpEffectiveDueAt(b)).getTime()
  return ta - tb
}

/**
 * Build overdue / due today / upcoming buckets for a client's follow-ups.
 * Uses next_follow_up_at when set, otherwise reminder_at (matches timeline display).
 * @param {object[]} followUps
 * @param {{ clientId?: number|string, clientName?: string }} [scope]
 */
export function buildFollowUpWorkloadSummary(followUps, scope = {}) {
  const { clientId = null, clientName = null } = scope
  const now = new Date()
  const todayStr = dateOnlyLocal(now)

  const active = (Array.isArray(followUps) ? followUps : []).filter((f) => {
    const due = followUpEffectiveDueAt(f)
    if (!due) return false
    const outcome = f.outcome != null ? String(f.outcome) : ''
    if (outcome && TERMINAL_OUTCOMES.has(outcome)) return false
    return true
  })

  const upcoming = active
    .filter((f) => {
      const due = new Date(followUpEffectiveDueAt(f))
      return !Number.isNaN(due.getTime()) && due > now
    })
    .sort(sortByEffectiveDue)
    .map((f) => mapRow(f, clientId, clientName, followUpEffectiveDueAt(f)))

  const dueToday = active
    .filter((f) => dateOnlyLocal(followUpEffectiveDueAt(f)) === todayStr)
    .sort(sortByEffectiveDue)
    .map((f) => mapRow(f, clientId, clientName, followUpEffectiveDueAt(f)))

  const overdue = active
    .filter((f) => {
      const due = new Date(followUpEffectiveDueAt(f))
      return !Number.isNaN(due.getTime()) && due < now
    })
    .sort(sortByEffectiveDue)
    .map((f) => mapRow(f, clientId, clientName, followUpEffectiveDueAt(f)))

  return { overdue, due_today: dueToday, upcoming }
}
