import { useEffect, useLayoutEffect, useRef } from 'react'
import flatpickr from 'flatpickr'
import { Arabic } from 'flatpickr/dist/l10n/ar'
import 'flatpickr/dist/flatpickr.min.css'
import { UI_DATE_FORMAT } from '../utils/dateUtils'

function parseToDate(str) {
  if (str == null || String(str).trim() === '') return null
  const s = String(str).trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const [, y, mo, d] = m
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0)
    return Number.isNaN(dt.getTime()) ? null : dt
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatLocalDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const JS_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function DatePicker({
  id,
  value,
  onChange,
  disabled = false,
  locale = 'en',
  className = '',
  placeholder = UI_DATE_FORMAT,
  allowedWeekdays = null,
  minDate = null,
  maxDate = null,
}) {
  const inputRef = useRef(null)
  const fpRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const valueRef = useRef(value)
  valueRef.current = value
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled
  const allowedWeekdaysRef = useRef(allowedWeekdays)
  allowedWeekdaysRef.current = allowedWeekdays
  const minDateRef = useRef(minDate)
  minDateRef.current = minDate
  const maxDateRef = useRef(maxDate)
  maxDateRef.current = maxDate

  const isAr = locale === 'ar' || String(locale).startsWith('ar')

  const applyConstraints = (fp) => {
    if (!fp) return
    const weekdays = allowedWeekdaysRef.current
    if (Array.isArray(weekdays) && weekdays.length > 0) {
      fp.set('disable', [
        (date) => {
          const name = JS_DAY_NAMES[date.getDay()]
          return !weekdays.includes(name)
        },
      ])
    } else {
      fp.set('disable', [])
    }
    const min = parseToDate(minDateRef.current)
    const max = parseToDate(maxDateRef.current)
    fp.set('minDate', min || undefined)
    fp.set('maxDate', max || undefined)
  }

  const hidePrimaryForAlt = () => {
    const el = inputRef.current
    const fp = fpRef.current
    if (!el || !fp?.altInput) return
    el.setAttribute('type', 'hidden')
  }

  useEffect(() => {
    const el = inputRef.current
    if (!el) return

    const fp = flatpickr(el, {
      dateFormat: 'Y-m-d',
      altInput: true,
      altFormat: 'd/m/Y',
      allowInput: false,
      clickOpens: !disabledRef.current,
      appendTo: document.body,
      locale: isAr ? Arabic : undefined,
      onReady: hidePrimaryForAlt,
      onChange: (selectedDates) => {
        if (!selectedDates.length) {
          onChangeRef.current('')
          return
        }
        onChangeRef.current(formatLocalDate(selectedDates[0]))
      },
    })
    fpRef.current = fp
    applyConstraints(fp)
    hidePrimaryForAlt()

    const initial = parseToDate(valueRef.current)
    if (initial) fp.setDate(initial, false)
    hidePrimaryForAlt()

    return () => {
      fp.destroy()
      fpRef.current = null
    }
  }, [isAr])

  useLayoutEffect(() => {
    hidePrimaryForAlt()
  })

  useEffect(() => {
    const fp = fpRef.current
    if (!fp) return
    const d = parseToDate(value)
    if (d) fp.setDate(d, false)
    else fp.clear()
  }, [value])

  useEffect(() => {
    const fp = fpRef.current
    if (fp) fp.set('clickOpens', !disabled)
  }, [disabled])

  useEffect(() => {
    applyConstraints(fpRef.current)
  }, [allowedWeekdays, minDate, maxDate])

  return (
    <input
      ref={inputRef}
      id={id}
      className={className}
      placeholder={placeholder}
      readOnly
      disabled={disabled}
      autoComplete="off"
    />
  )
}
