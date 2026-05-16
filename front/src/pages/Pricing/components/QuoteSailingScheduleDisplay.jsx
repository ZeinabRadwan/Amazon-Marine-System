import { useTranslation } from 'react-i18next'
import { QuoteSummaryBadge } from './quoteFormLayout'

/**
 * Read-only sailing schedule (مواعيد الإبحار) — text only, no pickers or selectors.
 */
export default function QuoteSailingScheduleDisplay({
  text,
  asBadge = true,
  className = '',
  label,
}) {
  const { t } = useTranslation()
  const dash = t('common.dash', '—')
  const display = String(text ?? '').trim() || dash
  const labelText = label ?? t('pricing.quoteBadgeSailing', 'موعد الإبحار')

  if (asBadge) {
    return (
      <QuoteSummaryBadge label={labelText} className={`pricing-quote-summary-badge--sailing ${className}`.trim()}>
        {display}
      </QuoteSummaryBadge>
    )
  }

  return (
    <div className={`pricing-quote-sailing-readonly ${className}`.trim()} role="status">
      <span className="pricing-quote-sailing-readonly__label text-sm font-bold text-gray-700 dark:text-gray-300">
        {labelText}
      </span>
      <p className="pricing-quote-sailing-readonly__value m-0 mt-1 text-sm text-gray-900 dark:text-gray-100">{display}</p>
    </div>
  )
}
