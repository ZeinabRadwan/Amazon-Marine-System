import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { getDateLocale } from '../../utils/dateUtils'
import { DropdownMenu } from '../../components/DropdownMenu'

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

function combinedContainerLabel(row, t) {
  const cnt = pickInt(row, ['container_count'])
  const sz = row.container_size
  const tp = row.container_type
  if (cnt == null || !String(sz || '').trim() || !String(tp || '').trim()) return '—'
  const sizeLabel = displayContainerSize(sz, t)
  const typeLabel = displayContainerType(tp, t)
  return t('shipments.opsCard.containerCombined', {
    count: cnt,
    size: sizeLabel,
    type: typeLabel,
    defaultValue: `${cnt} × ${sizeLabel} ${typeLabel}`,
  })
}

function formatCutoffDayMonth(value, language) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const loc = getDateLocale(language)
  return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short' }).format(d)
}

function routeText(row) {
  const a = row.origin_port?.name
  const b = row.destination_port?.name
  if (a || b) return [a, b].filter(Boolean).join(' → ')
  return row.route_text || '—'
}

function clientText(row) {
  return row.client?.company_name ?? row.client?.name ?? '—'
}

function bookingRef(row) {
  const b = String(row.booking_number || '').trim()
  if (b) return b
  const bl = String(row.bl_number || '').trim()
  return bl || '—'
}

/**
 * Operations / admin mobile list card: dense layout, existing row fields only.
 */
export default function ShipmentOpsShipCard({
  row,
  onOpen,
  selectionSlot,
  actionsMenuItems,
  menuAlignEnd,
}) {
  const { t, i18n } = useTranslation()

  const cutRaw = row.operation?.cut_off_date ?? row.cut_off_date
  const cutLabel = formatCutoffDayMonth(cutRaw, i18n.language)

  const total = pickInt(row, [
    'operations_tasks_total',
    'ops_tasks_total',
    'tasks_total',
    'shipment_tasks_total',
  ])
  const done = pickInt(row, [
    'operations_tasks_completed',
    'operations_tasks_done',
    'ops_tasks_done',
    'tasks_done',
    'tasks_completed',
    'shipment_tasks_completed',
  ])
  const overdue = pickInt(row, ['operations_tasks_overdue', 'ops_tasks_overdue', 'tasks_overdue', 'shipment_tasks_overdue'])

  const hasTaskTotals = total != null && total > 0
  const doneSafe = done != null ? Math.min(Math.max(0, done), total ?? done) : undefined
  const pctFromTasks =
    hasTaskTotals && doneSafe != null ? Math.min(100, Math.round((doneSafe / total) * 100)) : undefined

  const opComplete = row.operational_status_code === 'shipment_complete'
  const completionPct = pctFromTasks != null ? pctFromTasks : opComplete ? 100 : null

  const overdueForLine =
    hasTaskTotals && doneSafe != null ? (overdue != null ? Math.max(0, overdue) : 0) : null

  const showOverdueBadge = overdueForLine != null && overdueForLine > 0
  const showCompletionBadge = completionPct != null
  const showCutoffBadge = Boolean(cutLabel)

  const barPct = completionPct != null ? completionPct : 0
  const barIsComplete = completionPct === 100
  const barHasOverdue = (overdueForLine ?? 0) > 0
  let barTone = 'ship-card__bar-fill--progress'
  if (barHasOverdue) barTone = 'ship-card__bar-fill--overdue'
  else if (barIsComplete) barTone = 'ship-card__bar-fill--complete'

  const operationalLabel = row.operational_status_code
    ? t(`shipments.ops.phase.${row.operational_status_code}`, { defaultValue: row.operational_status_code })
    : '—'

  const dash = t('common.dash')
  const tasksLine =
    hasTaskTotals && doneSafe != null && overdueForLine != null
      ? t('shipments.opsCard.tasksMetrics', {
          done: doneSafe,
          total,
          overdue: overdueForLine,
        })
      : t('shipments.opsCard.tasksMetricsUnknown', { dash })

  const onKeyActivate = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen?.()
    }
  }

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
              <span className="ship-card__badge ship-card__badge--pct">{t('shipments.opsCard.pctComplete', { pct: completionPct })}</span>
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
          <div className="ship-card__meta-value">{combinedContainerLabel(row, t)}</div>
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
