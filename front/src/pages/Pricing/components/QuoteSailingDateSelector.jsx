import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DatePicker from '../../../components/DatePicker'
import { formatDate } from '../../../utils/dateUtils'
import { isDateAllowedForSchedule, WEEK_DAYS } from '../utils/sailingSchedule'
import { QuoteSummaryBadge } from './quoteFormLayout'

const WEEKDAY_I18N = {
  Saturday: 'pricing.weekdaySaturday',
  Sunday: 'pricing.weekdaySunday',
  Monday: 'pricing.weekdayMonday',
  Tuesday: 'pricing.weekdayTuesday',
  Wednesday: 'pricing.weekdayWednesday',
  Thursday: 'pricing.weekdayThursday',
  Friday: 'pricing.weekdayFriday',
}

function formatWeeklyHint(weekdays, t) {
  return weekdays
    .map((day) => {
      const key = WEEKDAY_I18N[day]
      return key ? t(key, day) : day
    })
    .join(` ${t('pricing.weekdayJoiner', '+')} `)
}

export default function QuoteSailingDateSelector({
  schedule,
  value,
  onChange,
  disabled = false,
  inline = false,
}) {
  const { t, i18n } = useTranslation()
  const selected = String(value || '').trim().slice(0, 10)
  const [editing, setEditing] = useState(!selected)

  useEffect(() => {
    if (!selected) setEditing(true)
  }, [selected])

  const weeklyHint = useMemo(() => {
    if (schedule?.mode !== 'weekly') return ''
    return formatWeeklyHint(schedule.weeklyWeekdays || [], t)
  }, [schedule, t])

  if (!schedule) return null

  const valid = selected && isDateAllowedForSchedule(selected, schedule)
  const showPicker = !valid || editing
  const label = t('pricing.quoteBadgeSailing', 'موعد الإبحار')
  const labelLong = t('pricing.sailingDateFieldLabel', 'موعد الإبحار / Sailing Date')
  const pickHint = t('pricing.quoteSailingPickHint', 'يرجى اختيار موعد الإبحار')

  const handleSelectFixed = (iso) => {
    if (disabled) return
    const next = iso === selected ? '' : iso
    onChange(next)
    if (next) setEditing(false)
  }

  const handleWeeklyChange = (iso) => {
    if (disabled) return
    onChange(iso)
    if (iso) setEditing(false)
  }

  if (!showPicker && valid) {
    if (inline) {
      return (
        <QuoteSummaryBadge label={label} className="pricing-quote-summary-badge--sailing">
          {formatDate(selected, { locale: i18n.language })}
          <button
            type="button"
            className="pricing-quote-sailing-change-btn"
            onClick={() => setEditing(true)}
            disabled={disabled}
          >
            {t('common.change', 'Change')}
          </button>
        </QuoteSummaryBadge>
      )
    }
    return (
      <span className="pricing-quote-sailing-selected">
        <span className="pricing-quote-inline-item__label">{labelLong}</span>
        <span className="pricing-quote-inline-item__sep" aria-hidden>
          :
        </span>
        <span className="pricing-quote-sailing-badge">{formatDate(selected, { locale: i18n.language })}</span>
        <button
          type="button"
          className="pricing-quote-sailing-change-btn"
          onClick={() => setEditing(true)}
          disabled={disabled}
        >
          {t('common.change', 'Change')}
        </button>
      </span>
    )
  }

  const wrapperClass = [
    inline ? 'pricing-quote-sailing-inline' : 'pricing-quote-sailing-field md:col-span-2',
    showPicker ? 'is-editing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClass}>
      {!inline ? (
        <span className="pricing-quote-inline-item__label pricing-quote-sailing-inline-label">{label}</span>
      ) : null}
      {!selected ? (
        <p className="pricing-quote-sailing-pick-hint m-0" role="status">
          {pickHint}
        </p>
      ) : null}

      {schedule.mode === 'fixed' ? (
        <div className="pricing-quote-sailing-picker">
          <p className="pricing-quote-sailing-hint m-0 mb-2 sr-only">
            {t('pricing.quoteSailingFixedHint', 'Select one sailing date from the rate (fixed schedule).')}
          </p>
          <div className="pricing-quote-sailing-chips" role="listbox" aria-label={labelLong}>
            {schedule.fixedDates.map((iso) => {
              const active = selected === iso
              return (
                <button
                  key={iso}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={disabled}
                  className={`pricing-quote-sailing-chip${active ? ' pricing-quote-sailing-chip--active' : ''}`}
                  onClick={() => handleSelectFixed(iso)}
                >
                  {formatDate(iso, { locale: i18n.language })}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="pricing-quote-sailing-picker">
          <p className="pricing-quote-sailing-hint m-0 mb-2">
            {t('pricing.quoteSailingWeeklyHint', 'Weekly schedule')}:{' '}
            <strong>{weeklyHint}</strong>
          </p>
          <div className="pricing-quote-sailing-weekly-days" aria-hidden>
            {WEEK_DAYS.map((day) => {
              const allowed = schedule.weeklyWeekdays.includes(day)
              const key = WEEKDAY_I18N[day]
              const dayLabel = key ? t(key, day) : day
              return (
                <span
                  key={day}
                  className={`pricing-quote-sailing-weekday-pill${allowed ? ' is-allowed' : ' is-disabled'}`}
                >
                  {dayLabel.slice(0, 3)}
                </span>
              )
            })}
          </div>
          <DatePicker
            id="quote-sailing-weekly-date"
            className="pricing-quote-sailing-datepicker"
            value={selected}
            onChange={handleWeeklyChange}
            disabled={disabled}
            locale={i18n.language}
            allowedWeekdays={schedule.weeklyWeekdays}
            minDate={schedule.validFrom || undefined}
            maxDate={schedule.validTo || undefined}
          />
          {valid && editing ? (
            <button
              type="button"
              className="pricing-quote-sailing-change-btn pricing-quote-sailing-change-btn--cancel"
              onClick={() => setEditing(false)}
              disabled={disabled}
            >
              {t('common.cancel', 'Cancel')}
            </button>
          ) : null}
        </div>
      )}

      {selected && !isDateAllowedForSchedule(selected, schedule) ? (
        <p className="pricing-quote-sailing-error m-0 mt-2" role="alert">
          {t('pricing.quoteSailingInvalidSelection', 'Selected date is not valid for this rate.')}
        </p>
      ) : null}
    </div>
  )
}
