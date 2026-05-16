import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DatePicker from '../../../components/DatePicker'
import { formatDate } from '../../../utils/dateUtils'
import { isDateAllowedForSchedule, WEEK_DAYS } from '../utils/sailingSchedule'

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

export default function QuoteSailingDateSelector({ schedule, value, onChange, disabled = false }) {
  const { t, i18n } = useTranslation()
  const selected = String(value || '').trim().slice(0, 10)

  const weeklyHint = useMemo(() => {
    if (schedule?.mode !== 'weekly') return ''
    return formatWeeklyHint(schedule.weeklyWeekdays || [], t)
  }, [schedule, t])

  if (!schedule) return null

  const handleSelectFixed = (iso) => {
    if (disabled) return
    onChange(iso === selected ? '' : iso)
  }

  return (
    <div className="pricing-quote-sailing-field md:col-span-2">
      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-2">
        {t('pricing.sailingDateFieldLabel', 'موعد الإبحار / Sailing Date')}
      </label>

      {schedule.mode === 'fixed' ? (
        <>
          <p className="pricing-quote-sailing-hint m-0 mb-2">
            {t('pricing.quoteSailingFixedHint', 'Select one sailing date from the rate (fixed schedule).')}
          </p>
          <div className="pricing-quote-sailing-chips" role="listbox" aria-label={t('pricing.sailingDateFieldLabel')}>
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
        </>
      ) : (
        <>
          <p className="pricing-quote-sailing-hint m-0 mb-2">
            {t('pricing.quoteSailingWeeklyHint', 'Weekly schedule')}:{' '}
            <strong>{weeklyHint}</strong>
            {' — '}
            {t('pricing.quoteSailingWeeklyPickHint', 'Pick one departure on an allowed weekday only.')}
          </p>
          <div className="pricing-quote-sailing-weekly-days" aria-hidden>
            {WEEK_DAYS.map((day) => {
              const allowed = schedule.weeklyWeekdays.includes(day)
              const key = WEEKDAY_I18N[day]
              const label = key ? t(key, day) : day
              return (
                <span
                  key={day}
                  className={`pricing-quote-sailing-weekday-pill${allowed ? ' is-allowed' : ' is-disabled'}`}
                >
                  {label.slice(0, 3)}
                </span>
              )
            })}
          </div>
          <DatePicker
            id="quote-sailing-weekly-date"
            className="w-full max-w-xs px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            value={selected}
            onChange={onChange}
            disabled={disabled}
            locale={i18n.language}
            allowedWeekdays={schedule.weeklyWeekdays}
            minDate={schedule.validFrom || undefined}
            maxDate={schedule.validTo || undefined}
          />
        </>
      )}

      {!selected ? (
        <p className="pricing-quote-sailing-required-hint m-0 mt-2" role="status">
          {t('pricing.quoteSailingSelectOne', 'Please select one sailing date.')}
        </p>
      ) : !isDateAllowedForSchedule(selected, schedule) ? (
        <p className="pricing-quote-sailing-error m-0 mt-2" role="alert">
          {t('pricing.quoteSailingInvalidSelection', 'Selected date is not valid for this rate.')}
        </p>
      ) : null}
    </div>
  )
}
