import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import { latinDateTimeFormat, formatShipmentsNumber } from '../../utils/westernNumerals'
import { DropdownMenu } from '../../components/DropdownMenu'
import { countCompletedTasks, countOverdueTasks } from './shipmentOperationTaskUi'

function pickInt(row, keys) {
  for (const k of keys) {
    const v = row[k]
    if (v === '' || v == null) continue
    const n = Number(v)
    if (!Number.isNaN(n) && Number.isFinite(n)) return n
  }
  return undefined
}

function displayContainerType(ct, t) {
  if (!ct) return '—'
  const keyMap = {
    Dry: 'dry',
    Reefer: 'reefer',
    'Open Top': 'openTop',
    'Flat Rack': 'flatRack',
    'High Cube': 'highCube',
  }
  const k = keyMap[ct]
  return k ? t(`shipments.containerTypes.${k}`) : ct
}

function displayContainerSize(sz, t) {
  if (sz == null || sz === '') return '—'
  return t(`shipments.containerSizes.${sz}`, { defaultValue: String(sz) })
}

function combinedContainerLabel(row, t, language) {
  const cnt = pickInt(row, ['container_count'])
  const sz = row.container_size
  const tp = row.container_type
  if (cnt == null || !String(sz || '').trim() || !String(tp || '').trim()) return '—'
  const sizeLabel = displayContainerSize(sz, t)
  const typeLabel = displayContainerType(tp, t)
  return t('shipments.opsCard.containerCombined', {
    count: formatShipmentsNumber(cnt, language),
    size: sizeLabel,
    type: typeLabel,
    defaultValue: `${formatShipmentsNumber(cnt, language)} × ${sizeLabel} ${typeLabel}`,
  })
}

/** e.g. 3 × 40' Dry — uses raw size digits + apostrophe for compact ops line */
function compactContainerLine(row, t, language) {
  const cnt = pickInt(row, ['container_count'])
  const szRaw = row.container_size != null ? String(row.container_size).trim() : ''
  const tp = row.container_type
  if (cnt == null || !szRaw || !String(tp || '').trim()) return '—'
  const typeLabel = displayContainerType(tp, t)
  const n = formatShipmentsNumber(cnt, language)
  return `${n} × ${szRaw}' ${typeLabel}`
}

function formatCutoffDayMonth(value, language) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return latinDateTimeFormat(language, { day: 'numeric', month: 'short' }).format(d)
}

function routeText(row) {
  const a = row.origin_port?.name
  const b = row.destination_port?.name
  if (a || b) return [a, b].filter(Boolean).join(' → ')
  return row.route_text || '—'
}

function clientText(row) {
  if (row.client_name != null && String(row.client_name).trim() !== '') return String(row.client_name).trim()
  return row.client?.company_name ?? row.client?.name ?? '—'
}

function bookingRef(row) {
  const b = String(row.booking_number || '').trim()
  if (b) return b
  const bl = String(row.bl_number || '').trim()
  return bl || '—'
}

/**
 * Operations list card: task counts (API may use several aliases). Missing → 0.
 * Bar: pct = completed/total*100 when total > 0, else 0.
 */
function normalizeOpsListTaskInts(row) {
  let totalRaw = pickInt(row, [
    'total_tasks',
    'operations_tasks_total',
    'ops_tasks_total',
    'tasks_total',
    'shipment_tasks_total',
  ])
  let completedRaw = pickInt(row, [
    'completed_tasks',
    'completed_tasks_count',
    'operations_tasks_completed',
    'operations_tasks_done',
    'ops_tasks_done',
    'tasks_done',
    'tasks_completed',
    'shipment_tasks_completed',
  ])
  let overdueRaw = pickInt(row, [
    'overdue_tasks_count',
    'overdue_tasks',
    'operations_tasks_overdue',
    'ops_tasks_overdue',
    'tasks_overdue',
    'shipment_tasks_overdue',
  ])

  if (
    (totalRaw == null || completedRaw == null || overdueRaw == null) &&
    Array.isArray(row.tasks) &&
    row.tasks.length > 0
  ) {
    if (totalRaw == null) totalRaw = row.tasks.length
    if (completedRaw == null) completedRaw = countCompletedTasks(row.tasks)
    if (overdueRaw == null) overdueRaw = countOverdueTasks(row.tasks)
  }

  const total = totalRaw != null && totalRaw >= 0 ? totalRaw : 0
  const completedUncapped = completedRaw != null ? Math.max(0, completedRaw) : 0
  const completed = total > 0 ? Math.min(completedUncapped, total) : 0
  const overdue = overdueRaw != null ? Math.max(0, overdueRaw) : 0
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0

  return { total, completed, overdue, pct }
}

function opsListBarTone(pct, overdue) {
  if (overdue > 0) return 'ship-card__bar-fill--overdue'
  if (pct === 100) return 'ship-card__bar-fill--complete'
  return 'ship-card__bar-fill--progress'
}

function toLocalDay(value) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfToday() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

/** Days from today: negative = past, 0 = today, positive = future */
function calendarOffsetDays(day) {
  if (!day) return null
  return Math.round((day.getTime() - startOfToday().getTime()) / 86400000)
}

/** 'red' | 'amber' | 'green' for known calendar day */
function toneForCalendarDay(day) {
  const off = calendarOffsetDays(day)
  if (off == null) return 'gray'
  if (off < 0) return 'red'
  if (off === 0) return 'red'
  if (off <= 3) return 'amber'
  return 'green'
}

function serviceChipLabel(row, t) {
  const mode = row.mode ? t(`shipments.modeOptions.${row.mode}`, { defaultValue: row.mode }) : ''
  const st = row.shipment_type
    ? t(`shipments.shipmentTypeOptions.${row.shipment_type}`, { defaultValue: row.shipment_type })
    : ''
  const parts = [mode, st].filter((x) => x && String(x).trim())
  if (parts.length === 0) return t('common.dash')
  return parts.join(' · ')
}

function operationalBadgeStyle(code) {
  const c = String(code || '')
  if (c.includes('custom') || c.includes('clearance')) {
    return { background: 'var(--ops-amber-light, #fef3c7)', color: 'var(--ops-amber, #d97706)' }
  }
  if (c.includes('transit') || c.includes('sailed') || c.includes('vessel')) {
    return { background: 'var(--ops-blue-light, #dbeafe)', color: 'var(--ops-blue, #1d4ed8)' }
  }
  if (c.includes('doc') || c.includes('review')) {
    return { background: 'var(--ops-green-light, #e8f7f2)', color: 'var(--ops-green, #0d7a55)' }
  }
  if (c.includes('complete')) {
    return { background: 'var(--ops-green-light, #e8f7f2)', color: 'var(--ops-green, #0d7a55)' }
  }
  return { background: 'var(--ops-gray-100, #f1f5f9)', color: 'var(--ops-gray-600, #475569)' }
}

function DashboardRowLayout({ row, t, i18n, actionsMenuItems, menuAlignEnd, onOpen, onKeyActivate }) {
  const cutRaw = row.operation?.cut_off_date ?? row.cut_off_date
  const loadRaw = row.loading_date
  const cutDay = toLocalDay(cutRaw)
  const loadDay = toLocalDay(loadRaw)
  const cutTone = cutDay ? toneForCalendarDay(cutDay) : 'gray'
  const loadTone = loadDay ? toneForCalendarDay(loadDay) : 'gray'

  const cutLabel = formatCutoffDayMonth(cutRaw, i18n.language)
  const loadLabel = formatCutoffDayMonth(loadRaw, i18n.language)

  const cutOff = calendarOffsetDays(cutDay)
  const loadOff = calendarOffsetDays(loadDay)
  const cutRel =
    cutOff === 0
      ? t('shipments.opsDash.dateRelToday')
      : cutOff === 1
        ? t('shipments.opsDash.dateRelTomorrow')
        : cutOff != null && cutOff > 1 && cutOff <= 3
          ? t('shipments.opsDash.dateRelDays', { count: formatShipmentsNumber(cutOff, i18n.language) })
          : ''
  const loadMissed = loadOff != null && loadOff < 0
  const loadRel =
    loadOff === 0
      ? t('shipments.opsDash.dateRelToday')
      : loadOff === 1
        ? t('shipments.opsDash.dateRelTomorrow')
        : loadOff != null && loadOff > 1 && loadOff <= 3
          ? t('shipments.opsDash.dateRelDays', { count: formatShipmentsNumber(loadOff, i18n.language) })
          : loadMissed
            ? t('shipments.opsDash.dateRelMissed')
            : ''

  const cutDisplay = cutLabel ? (cutRel ? `${cutRel} — ${cutLabel}` : cutLabel) : t('shipments.opsDash.dateNotSet')
  const loadDisplay = loadLabel
    ? loadRel
      ? `${loadLabel} (${loadRel})`
      : loadLabel
    : t('shipments.opsDash.dateNotSet')

  const cutClass =
    cutTone === 'red' ? 'ops-dash__date-val--red' : cutTone === 'amber' ? 'ops-dash__date-val--amber' : cutTone === 'green' ? 'ops-dash__date-val--green' : 'ops-dash__date-val--gray'
  const loadClass = !loadDay
    ? 'ops-dash__date-val--gray'
    : loadMissed || loadTone === 'red'
      ? 'ops-dash__date-val--red'
      : loadTone === 'amber'
        ? 'ops-dash__date-val--amber'
        : loadTone === 'green'
          ? 'ops-dash__date-val--green'
          : 'ops-dash__date-val--gray'

  const { total, completed, overdue, pct } = normalizeOpsListTaskInts(row)
  let barFill = 'ops-dash__prog-fill--green'
  if (overdue > 0) barFill = 'ops-dash__prog-fill--red'
  else if (pct > 0 && pct < 100) barFill = 'ops-dash__prog-fill--amber'

  const urgent = overdue > 0 || cutTone === 'red' || loadMissed
  const warning = !urgent && (cutTone === 'amber' || loadTone === 'amber')
  const rowClass = urgent ? 'ops-dash__ship-row--urgent' : warning ? 'ops-dash__ship-row--warning' : ''
  const accentClass = urgent ? 'ops-dash__row-accent--red' : warning ? 'ops-dash__row-accent--amber' : 'ops-dash__row-accent--green'

  const bl = String(row.bl_number ?? '').trim()
  const bk = String(row.booking_number ?? '').trim()
  const hasBl = Boolean(bl)

  const opLabel = row.operational_status_code
    ? t(`shipments.ops.phase.${row.operational_status_code}`, { defaultValue: row.operational_status_code })
    : '—'
  const badgeStyle = operationalBadgeStyle(row.operational_status_code)

  const svc = serviceChipLabel(row, t)
  const svcTone = svc === t('common.dash') ? 'ops-dash__svc-chip--gray' : 'ops-dash__svc-chip--blue'

  const vesselLine =
    row.shipping_line?.name != null && String(row.shipping_line.name).trim() !== ''
      ? String(row.shipping_line.name).trim()
      : '—'

  const overdueLine =
    overdue > 0
      ? t('shipments.opsDash.tasksOverdueLine', { count: formatShipmentsNumber(overdue, i18n.language) })
      : null
  const trackLine = overdue > 0 ? null : t('shipments.opsDash.onTrack')

  const OpenIcon = i18n.dir() === 'rtl' ? ChevronLeft : ChevronRight

  return (
    <div
      className={`ops-dash__ship-row ${rowClass}`.trim()}
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.()}
      onKeyDown={onKeyActivate}
      aria-label={t('shipments.opsCard.openShipmentAria')}
    >
      <div className={`ops-dash__row-accent ${accentClass}`} aria-hidden />
      <div className="ops-dash__row-inner">
        <div className="ops-dash__col">
          <div className="ops-dash__client-name">{clientText(row)}</div>
          {hasBl ? (
            <>
              <div className="ops-dash__bl-ref">{t('shipments.opsDash.blPrefix', { ref: bl })}</div>
              {bk ? <div className="ops-dash__bl-ref">{t('shipments.opsDash.bkPrefix', { ref: bk })}</div> : null}
            </>
          ) : (
            <>
              {bk ? <div className="ops-dash__bl-ref">{t('shipments.opsDash.bkPrefix', { ref: bk })}</div> : null}
              <div className="ops-dash__bl-ref ops-dash__bl-pending">{t('shipments.opsDash.blPending')}</div>
            </>
          )}
        </div>
        <div className="ops-dash__col ops-dash__col--route">
          <div className="ops-dash__route">{routeText(row)}</div>
        </div>
        <div className="ops-dash__col">
          <div className="ops-dash__cnt-val">{compactContainerLine(row, t, i18n.language)}</div>
          <span className={`ops-dash__svc-chip ${svcTone}`}>{svc}</span>
        </div>
        <div className="ops-dash__col ops-dash__col--vessel">
          <div className="ops-dash__vessel">{vesselLine}</div>
        </div>
        <div className="ops-dash__col ops-dash__col--dates">
          <div className="ops-dash__dates-inner">
            <div className="ops-dash__date-item">
              <span className="ops-dash__date-label">{t('shipments.opsDash.cutoffLabel')}</span>
              <span className={`ops-dash__date-val ${cutClass}`}>{cutDisplay}</span>
            </div>
            <div className="ops-dash__date-item">
              <span className="ops-dash__date-label">{t('shipments.opsDash.loadingLabel')}</span>
              <span className={`ops-dash__date-val ${loadClass}`}>{loadDisplay}</span>
            </div>
          </div>
        </div>
        <div className="ops-dash__col">
          <span className="ops-dash__status-badge" style={badgeStyle}>
            {opLabel}
          </span>
          {overdueLine ? (
            <span className="ops-dash__status-line ops-dash__status-line--danger">{overdueLine}</span>
          ) : trackLine ? (
            <span className="ops-dash__status-line ops-dash__status-line--ok">{trackLine}</span>
          ) : (
            <span className="ops-dash__status-line ops-dash__status-line--muted">—</span>
          )}
        </div>
        <div className="ops-dash__col ops-dash__col--planning">
          <div className="ops-dash__tasks-label">{t('shipments.opsDash.tasksTitle')}</div>
          <div className="ops-dash__prog-info">
            {t('shipments.opsDash.progressCount', {
              done: formatShipmentsNumber(completed, i18n.language),
              total: formatShipmentsNumber(total, i18n.language),
            })}
          </div>
          <div className="ops-dash__prog-bar">
            <div className={`ops-dash__prog-fill ${barFill}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="ops-dash__col ops-dash__col--actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {Array.isArray(actionsMenuItems) && actionsMenuItems.length > 0 ? (
            <DropdownMenu
              portaled
              align={menuAlignEnd ? 'end' : 'start'}
              className="shipments-row-actions-menu"
              trigger={
                <button type="button" className="ops-dash__menu-btn" title={t('shipments.actions')} aria-label={t('shipments.actions')}>
                  <Menu className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              }
              items={actionsMenuItems}
            />
          ) : (
            <span className="ops-dash__bl-ref"> </span>
          )}
        </div>
        <div className="ops-dash__col ops-dash__col--open" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="ops-dash__open-btn"
            title={t('shipments.opsCard.openShipmentAria')}
            aria-label={t('shipments.opsCard.openShipmentAria')}
            onClick={() => onOpen?.()}
          >
            <OpenIcon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

function routeTextForOpsMeta(row) {
  const a = row.origin_port?.name
  const b = row.destination_port?.name
  if (a || b) return [a, b].filter(Boolean).join(' → ')
  const r = row.route_text
  if (r != null && String(r).trim() !== '') return String(r).trim()
  return null
}

function compactContainerLineOrNull(row, t, language) {
  const cnt = pickInt(row, ['container_count'])
  const szRaw = row.container_size != null ? String(row.container_size).trim() : ''
  const tp = row.container_type
  if (cnt == null || !szRaw || !String(tp || '').trim()) return null
  const typeLabel = displayContainerType(tp, t)
  const dash = t('common.dash')
  if (!typeLabel || typeLabel === dash || typeLabel === '—') return null
  const n = formatShipmentsNumber(cnt, language)
  return `${n} × ${szRaw}' ${typeLabel}`
}

function primaryBookingIdOps(row, naLabel) {
  const b = String(row.booking_number ?? '').trim()
  if (b) return b
  const bl = String(row.bl_number ?? '').trim()
  return bl || naLabel
}

function clientTextOps(row, naLabel) {
  if (row.client_name != null && String(row.client_name).trim() !== '') return String(row.client_name).trim()
  const c = row.client?.company_name ?? row.client?.name
  if (c != null && String(c).trim() !== '') return String(c).trim()
  return naLabel
}

function computeTaskMetrics(row) {
  const total = pickInt(row, [
    'total_tasks',
    'operations_tasks_total',
    'ops_tasks_total',
    'tasks_total',
    'shipment_tasks_total',
  ])
  const done = pickInt(row, [
    'completed_tasks',
    'completed_tasks_count',
    'operations_tasks_completed',
    'operations_tasks_done',
    'ops_tasks_done',
    'tasks_done',
    'tasks_completed',
    'shipment_tasks_completed',
  ])
  const overdue = pickInt(row, [
    'overdue_tasks_count',
    'overdue_tasks',
    'operations_tasks_overdue',
    'ops_tasks_overdue',
    'tasks_overdue',
    'shipment_tasks_overdue',
  ])

  const hasTaskTotals = total != null && total > 0
  const doneSafe = done != null ? Math.min(Math.max(0, done), total ?? done) : undefined
  const pctFromTasks =
    hasTaskTotals && doneSafe != null ? Math.min(100, Math.round((doneSafe / total) * 100)) : undefined

  const opComplete = row.operational_status_code === 'shipment_complete'
  const completionPct = pctFromTasks != null ? pctFromTasks : opComplete ? 100 : null

  const overdueForLine =
    hasTaskTotals && doneSafe != null ? (overdue != null ? Math.max(0, overdue) : 0) : null

  const barPct = completionPct != null ? completionPct : 0
  const barIsComplete = completionPct === 100
  const barHasOverdue = (overdueForLine ?? 0) > 0
  let barTone = 'ship-card__bar-fill--progress'
  if (barHasOverdue) barTone = 'ship-card__bar-fill--overdue'
  else if (barIsComplete) barTone = 'ship-card__bar-fill--complete'

  return {
    total,
    doneSafe,
    overdueForLine,
    hasTaskTotals,
    completionPct,
    barPct,
    barTone,
  }
}

function LegacyCardLayout({
  row,
  t,
  i18n,
  cutLabel,
  overdueForLine,
  completionPct,
  showOverdueBadge,
  showCompletionBadge,
  showCutoffBadge,
  barPct,
  barTone,
  operationalLabel,
  tasksLine,
  selectionSlot,
  actionsMenuItems,
  menuAlignEnd,
  onOpen,
  onKeyActivate,
}) {
  return (
    <div
      className="ship-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.()}
      onKeyDown={onKeyActivate}
      aria-label={t('shipments.opsCard.openShipmentAria')}
    >
      <div className="ship-card__header">
        <div className="ship-card__header-left">
          {selectionSlot ? <div className="ship-card__select-slot">{selectionSlot}</div> : null}
          <div className="ship-card__titles">
            <div className="ship-card__ref-block">
              <div className="ship-card__k">{t('shipments.fields.booking_number')}</div>
              <div className="ship-card__ref">{bookingRef(row)}</div>
            </div>
            <div className="ship-card__client-block">
              <div className="ship-card__k">{t('shipments.fields.client')}</div>
              <div className="ship-card__client">{clientText(row)}</div>
            </div>
          </div>
        </div>
        <div className="ship-card__header-right">
          {Array.isArray(actionsMenuItems) && actionsMenuItems.length > 0 ? (
            <div className="ship-card__actions">
              <DropdownMenu
                portaled
                align={menuAlignEnd ? 'end' : 'start'}
                className="shipments-row-actions-menu"
                trigger={
                  <button
                    type="button"
                    className="ship-card__actions-trigger"
                    title={t('shipments.actions')}
                    aria-label={t('shipments.actions')}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Menu className="ship-card__actions-icon" aria-hidden />
                  </button>
                }
                items={actionsMenuItems}
              />
            </div>
          ) : null}
          <div className="ship-card__badges">
            {showOverdueBadge ? (
              <span className="ship-card__badge ship-card__badge--overdue">
                {t('shipments.opsCard.overdue', { count: overdueForLine })}
              </span>
            ) : null}
            {showCompletionBadge ? (
              <span className="ship-card__badge ship-card__badge--pct">
                {t('shipments.opsCard.pctComplete', { pct: completionPct })}
              </span>
            ) : null}
            {showCutoffBadge ? (
              <span className="ship-card__badge ship-card__badge--cutoff">{t('shipments.opsCard.cutoff', { date: cutLabel })}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="ship-card__meta-grid">
        <div className="ship-card__meta-block">
          <div className="ship-card__meta-label">{t('shipments.opsCard.metaRoute')}</div>
          <div className="ship-card__meta-value">{routeText(row)}</div>
        </div>
        <div className="ship-card__meta-block">
          <div className="ship-card__meta-label">{t('shipments.fields.shipping_line')}</div>
          <div className="ship-card__meta-value">{row.shipping_line?.name ?? '—'}</div>
        </div>
        <div className="ship-card__meta-block">
          <div className="ship-card__meta-label">{t('shipments.opsCard.metaContainers')}</div>
          <div className="ship-card__meta-value">{combinedContainerLabel(row, t, i18n.language)}</div>
        </div>
        <div className="ship-card__meta-block">
          <div className="ship-card__meta-label">{t('shipments.opsCard.metaOpsStatus')}</div>
          <div className="ship-card__meta-value">{operationalLabel}</div>
        </div>
      </div>

      <div className="ship-card__progress">
        <div className="ship-card__bar" aria-hidden>
          <div className={`ship-card__bar-fill ${barTone}`} style={{ width: `${barPct}%` }} />
        </div>
        <div className="ship-card__progress-line">{tasksLine}</div>
      </div>
    </div>
  )
}

function OperationsCardLayout({ row, t, i18n, actionsMenuItems, menuAlignEnd, onOpen, onKeyActivate }) {
  const na = t('common.notApplicable')
  const cutRaw = row.operation?.cut_off_date ?? row.cut_off_date
  const cutLabel = formatCutoffDayMonth(cutRaw, i18n.language)

  const { total, completed, overdue, pct } = normalizeOpsListTaskInts(row)
  const barTone = opsListBarTone(pct, overdue)

  const progressLine = t('shipments.opsCard.opsListProgressCount', {
    done: formatShipmentsNumber(completed, i18n.language),
    total: formatShipmentsNumber(total, i18n.language),
  })

  const overdueHint =
    overdue > 0 ? t('shipments.opsCard.opsListOverdueHint', { count: formatShipmentsNumber(overdue, i18n.language) }) : null

  const showOverdueBadge = overdue > 0
  const showCompletionBadge = true
  const showCutoffBadge = Boolean(cutLabel)
  const hasBadges = showOverdueBadge || showCompletionBadge || showCutoffBadge

  const metaSegments = []
  const routeStr = routeTextForOpsMeta(row)
  if (routeStr) metaSegments.push({ key: 'route', text: routeStr })
  const lineName = row.shipping_line?.name != null ? String(row.shipping_line.name).trim() : ''
  if (lineName) metaSegments.push({ key: 'line', text: lineName })
  const containerStr = compactContainerLineOrNull(row, t, i18n.language)
  if (containerStr) metaSegments.push({ key: 'container', text: containerStr })
  if (row.operational_status_code) {
    const st = t(`shipments.ops.phase.${row.operational_status_code}`, {
      defaultValue: String(row.operational_status_code),
    })
    if (st && String(st).trim()) metaSegments.push({ key: 'status', text: String(st).trim() })
  }

  return (
    <div
      className="ship-card ship-card--ops-list"
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.()}
      onKeyDown={onKeyActivate}
      aria-label={t('shipments.opsCard.openShipmentAria')}
    >
      <div className="ship-card-ops__header">
        <div className="ship-card-ops__header-main">
          <div className="ship-card-ops__titles ship-card-ops__titles--primary">
            <div className="ship-card-ops__booking">{primaryBookingIdOps(row, na)}</div>
            <div className="ship-card-ops__client">{clientTextOps(row, na)}</div>
          </div>
        </div>
        <div className="ship-card-ops__header-aside">
          {hasBadges ? (
            <div className="ship-card-ops__badges">
              {showOverdueBadge ? (
                <span className="ship-card-ops__badge ship-card-ops__badge--overdue">
                  {t('shipments.opsCard.overdueBadge', { count: formatShipmentsNumber(overdue, i18n.language) })}
                </span>
              ) : null}
              {showCompletionBadge ? (
                <span className="ship-card-ops__badge ship-card-ops__badge--pct">
                  {t('shipments.opsCard.pctComplete', { pct })}
                </span>
              ) : null}
              {showCutoffBadge ? (
                <span className="ship-card-ops__badge ship-card-ops__badge--cutoff">{t('shipments.opsCard.cutoff', { date: cutLabel })}</span>
              ) : null}
            </div>
          ) : null}
          {Array.isArray(actionsMenuItems) && actionsMenuItems.length > 0 ? (
            <div className="ship-card-ops__actions" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu
                portaled
                align={menuAlignEnd ? 'end' : 'start'}
                className="shipments-row-actions-menu"
                trigger={
                  <button
                    type="button"
                    className="ship-card-ops__actions-trigger"
                    title={t('shipments.actions')}
                    aria-label={t('shipments.actions')}
                  >
                    <Menu className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                }
                items={actionsMenuItems}
              />
            </div>
          ) : null}
        </div>
      </div>

      {metaSegments.length > 0 ? (
        <div className="ship-card-ops__chips">
          {metaSegments.map((seg) => (
            <span key={seg.key} className={`ship-card-ops__chip ship-card-ops__chip--${seg.key}`}>
              {seg.text}
            </span>
          ))}
        </div>
      ) : null}

      <div className="ship-card-ops__progress">
        <div className="ship-card-ops__progress-top">
          <span className="ship-card-ops__progress-count">{progressLine}</span>
        </div>
        <div className="ship-card-ops__bar" aria-hidden>
          <div className={`ship-card__bar-fill ${barTone}`} style={{ width: `${pct}%` }} />
        </div>
        {overdueHint ? <div className="ship-card-ops__overdue-line">{overdueHint}</div> : null}
      </div>
    </div>
  )
}

/**
 * Operations shipment row card. `layout="legacy"` = previous grid meta + combined progress line (admin mobile).
 * `layout="operations"` = compact ops monitoring card (operations-only list, legacy card).
 * `layout="dashboard"` = horizontal ops dashboard row (operations-only Shipments page redesign).
 */
export default function ShipmentOpsShipCard({
  row,
  onOpen,
  selectionSlot,
  actionsMenuItems,
  menuAlignEnd,
  layout = 'legacy',
}) {
  const { t, i18n } = useTranslation()

  const cutRaw = row.operation?.cut_off_date ?? row.cut_off_date
  const cutLabel = formatCutoffDayMonth(cutRaw, i18n.language)

  const { total, doneSafe, overdueForLine, hasTaskTotals, completionPct, barPct, barTone } = computeTaskMetrics(row)

  const showOverdueBadge = overdueForLine != null && overdueForLine > 0
  const showCompletionBadge = completionPct != null
  const showCutoffBadge = Boolean(cutLabel)

  const operationalLabel = row.operational_status_code
    ? t(`shipments.ops.phase.${row.operational_status_code}`, { defaultValue: row.operational_status_code })
    : '—'

  const dash = t('common.dash')
  const tasksLine =
    hasTaskTotals && doneSafe != null && overdueForLine != null
      ? t('shipments.opsCard.tasksMetrics', {
          done: formatShipmentsNumber(doneSafe, i18n.language),
          total: formatShipmentsNumber(total, i18n.language),
          overdue: formatShipmentsNumber(overdueForLine, i18n.language),
        })
      : t('shipments.opsCard.tasksMetricsUnknown', { dash })

  const onKeyActivate = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen?.()
    }
  }

  const shared = {
    row,
    t,
    i18n,
    cutLabel,
    overdueForLine,
    completionPct,
    showOverdueBadge,
    showCompletionBadge,
    showCutoffBadge,
    barPct,
    barTone,
    operationalLabel,
    tasksLine,
    selectionSlot,
    actionsMenuItems,
    menuAlignEnd,
    onOpen,
    onKeyActivate,
  }

  if (layout === 'operations') {
    return (
      <OperationsCardLayout
        row={row}
        t={t}
        i18n={i18n}
        actionsMenuItems={actionsMenuItems}
        menuAlignEnd={menuAlignEnd}
        onOpen={onOpen}
        onKeyActivate={onKeyActivate}
      />
    )
  }
  if (layout === 'dashboard') {
    return (
      <DashboardRowLayout
        row={row}
        t={t}
        i18n={i18n}
        actionsMenuItems={actionsMenuItems}
        menuAlignEnd={menuAlignEnd}
        onOpen={onOpen}
        onKeyActivate={onKeyActivate}
      />
    )
  }
  return <LegacyCardLayout {...shared} />
}
