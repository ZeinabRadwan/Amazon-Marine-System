import { useTranslation } from 'react-i18next'
import './FollowUpWorkloadWidgets.css'

function formatWhen(value, locale) {
  if (value == null || value === '') return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(String(locale).startsWith('ar') ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}

/**
 * Three columns: overdue, due today, upcoming (from GET /follow-ups/my-summary).
 */
export default function FollowUpWorkloadWidgets({
  summary,
  loading = false,
  error = null,
  onClientClick,
  className = '',
}) {
  const { t, i18n } = useTranslation()

  const cols = [
    { key: 'overdue', titleKey: 'clients.followUpWidgetOverdue', tone: 'followup-widget--overdue' },
    { key: 'due_today', titleKey: 'clients.followUpWidgetToday', tone: 'followup-widget--today' },
    { key: 'upcoming', titleKey: 'clients.followUpWidgetUpcoming', tone: 'followup-widget--upcoming' },
  ]

  const data = summary?.data ?? summary ?? {}

  return (
    <div className={`followup-workload-widgets ${className}`.trim()}>
      {error ? (
        <p className="followup-workload-widgets__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="followup-workload-widgets__grid">
        {cols.map(({ key, titleKey, tone }) => {
          const rows = Array.isArray(data[key]) ? data[key] : []
          return (
            <div key={key} className={`followup-workload-widget ${tone}`}>
              <h4 className="followup-workload-widget__title">{t(titleKey)}</h4>
              {loading ? (
                <p className="followup-workload-widget__empty">{t('clients.loading', 'Loading…')}</p>
              ) : rows.length === 0 ? (
                <p className="followup-workload-widget__empty">{t('clients.followUpWidgetEmpty', 'None')}</p>
              ) : (
                <ul className="followup-workload-widget__list">
                  {rows.map((row) => {
                    const priority = row.priority && row.priority !== 'normal' ? row.priority : null
                    const dueAt = row.next_follow_up_at || row.reminder_at
                    const inner = (
                      <>
                        <span className="followup-workload-widget__row-head">
                          <span className="followup-workload-widget__client">{row.client_name ?? '—'}</span>
                          {priority ? (
                            <span className={`followup-workload-widget__priority followup-workload-widget__priority--${priority}`}>
                              {t(`clients.followUpPriority.${priority}`, priority)}
                            </span>
                          ) : null}
                        </span>
                        {row.summary ? (
                          <span className="followup-workload-widget__summary">{row.summary}</span>
                        ) : null}
                        <span className="followup-workload-widget__meta">
                          {row.followup_type
                            ? t(`clients.followUpKind.${row.followup_type}`, row.followup_type)
                            : ''}
                          {dueAt ? ` · ${formatWhen(dueAt, i18n.language)}` : ''}
                        </span>
                      </>
                    )
                    return (
                      <li key={`${key}-${row.id}`} className="followup-workload-widget__item">
                        {typeof onClientClick === 'function' && row.client_id != null ? (
                          <button
                            type="button"
                            className="followup-workload-widget__btn"
                            onClick={() => onClientClick(row.client_id)}
                          >
                            {inner}
                          </button>
                        ) : (
                          <div className="followup-workload-widget__static">{inner}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
