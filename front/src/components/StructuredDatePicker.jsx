import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const pad2 = (n) => String(n).padStart(2, '0')

export function daysInMonth(year, month) {
  const y = Number(year)
  const m = Number(month)
  if (!y || !m || m < 1 || m > 12) return 31
  return new Date(y, m, 0).getDate()
}

function parseParts(iso) {
  if (!iso || typeof iso !== 'string') return { y: '', m: '', d: '' }
  const s = iso.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { y: '', m: '', d: '' }
  const [y, mo, d] = s.split('-')
  return { y, m: String(Number(mo)), d: String(Number(d)) }
}

function buildIso(y, m, d) {
  if (!y || !m || !d) return ''
  const di = daysInMonth(y, Number(m))
  let dd = Number(d)
  if (dd < 1) dd = 1
  if (dd > di) dd = di
  return `${y}-${pad2(Number(m))}-${pad2(dd)}`
}

/**
 * Day → Month → Year via &lt;select&gt; only (no free-text date input).
 * Value / onChange use ISO date string YYYY-MM-DD or ''.
 */
export default function StructuredDatePicker({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  minYear,
  maxYear,
  'aria-describedby': ariaDescribedBy,
}) {
  const { t, i18n } = useTranslation()
  const [parts, setParts] = useState(() => parseParts(value))

  useEffect(() => {
    const v = value != null ? String(value).trim() : ''
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      setParts(parseParts(v))
    } else if (!v) {
      setParts({ y: '', m: '', d: '' })
    }
  }, [value])

  const yearNow = new Date().getFullYear()
  const yMin = minYear ?? yearNow - 80
  const yMax = maxYear ?? yearNow + 15

  const years = useMemo(() => {
    const arr = []
    for (let y = yMax; y >= yMin; y--) arr.push(y)
    return arr
  }, [yMin, yMax])

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = new Date(2000, i, 1)
        return {
          value: String(i + 1),
          label: new Intl.DateTimeFormat(i18n.language || 'en', { month: 'long' }).format(d),
        }
      }),
    [i18n.language]
  )

  const dim = useMemo(() => {
    if (!parts.y || !parts.m) return 31
    return daysInMonth(parts.y, Number(parts.m))
  }, [parts.y, parts.m])

  const dayOptions = useMemo(() => Array.from({ length: dim }, (_, i) => i + 1), [dim])

  const emit = (next) => {
    setParts(next)
    const iso = buildIso(next.y, next.m, next.d)
    if (!next.y || !next.m || !next.d) {
      onChange('')
    } else {
      onChange(iso)
    }
  }

  const onDay = (e) => {
    const d = e.target.value
    emit({ ...parts, d })
  }

  const onMonth = (e) => {
    const m = e.target.value
    let next = { ...parts, m }
    if (next.y && m && next.d) {
      const di = daysInMonth(next.y, Number(m))
      if (Number(next.d) > di) next = { ...next, d: String(di) }
    }
    emit(next)
  }

  const onYear = (e) => {
    const y = e.target.value
    let next = { ...parts, y }
    if (y && next.m && next.d) {
      const di = daysInMonth(y, Number(next.m))
      if (Number(next.d) > di) next = { ...next, d: String(di) }
    }
    emit(next)
  }

  const sel =
    'min-w-0 flex-1 px-2 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white disabled:opacity-50'

  return (
    <div
      id={id}
      className={`flex flex-wrap gap-2 items-stretch ${className}`}
      dir="ltr"
      role="group"
      aria-describedby={ariaDescribedBy || undefined}
    >
      <div className="flex min-w-[4.5rem] flex-1 flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('common.day', 'Day')}
        </span>
        <select
          className={sel}
          value={parts.d}
          onChange={onDay}
          disabled={disabled}
          required={required}
          aria-label={t('common.day', 'Day')}
          autoComplete="off"
        >
          <option value="">{t('common.select', 'Select')}</option>
          {dayOptions.map((day) => (
            <option key={day} value={String(day)}>
              {day}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-[7rem] flex-[1.2] flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('common.month', 'Month')}
        </span>
        <select
          className={sel}
          value={parts.m}
          onChange={onMonth}
          disabled={disabled}
          required={required}
          aria-label={t('common.month', 'Month')}
          autoComplete="off"
        >
          <option value="">{t('common.select', 'Select')}</option>
          {months.map((mo) => (
            <option key={mo.value} value={mo.value}>
              {mo.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-[5rem] flex-1 flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t('common.year', 'Year')}
        </span>
        <select
          className={sel}
          value={parts.y}
          onChange={onYear}
          disabled={disabled}
          required={required}
          aria-label={t('common.year', 'Year')}
          autoComplete="off"
        >
          <option value="">{t('common.select', 'Select')}</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
