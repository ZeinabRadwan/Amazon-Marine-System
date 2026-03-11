import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown } from 'lucide-react'

const ICON_VARIANTS = {
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  green: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

/**
 * StatsCard – display a single dashboard statistic with optional trend.
 *
 * Props:
 *   - title: string – label (e.g. "Total Shipments")
 *   - value: string | number – primary metric (numbers formatted with locale)
 *   - icon: ReactNode – icon (use h-6 w-6 for 24px; container is styled by variant)
 *   - change: string | number – optional percentage (e.g. 12 or "+12%")
 *   - trend: 'up' | 'down' – optional trend direction
 *   - variant: 'blue' | 'green' | 'amber' | 'default' – icon container color (blue/green/amber for context)
 *   - className: string – optional root classes
 *
 * Layout: Two-row flex. Row 1: colored icon (top-left), trend pill (top-right). Row 2: number + title stacked.
 */
export default function StatsCard({
  title,
  value,
  icon,
  change,
  trend,
  variant = 'default',
  className = '',
}) {
  const id = useId()
  const titleId = `stats-card-title-${id.replace(/:/g, '')}`
  const { t, i18n } = useTranslation()
  const hasTrend = trend === 'up' || trend === 'down'
  const isPositive = trend === 'up'
  const iconStyles = ICON_VARIANTS[variant] ?? ICON_VARIANTS.default

  const changeDisplay =
    change != null && change !== ''
      ? typeof change === 'number'
        ? `${change > 0 ? '+' : ''}${change}%`
        : String(change)
      : null

  return (
    <article
      className={`
        flex flex-shrink-0 flex-col rounded-lg border border-gray-200/80 bg-white py-6 px-5
        shadow-sm transition-all duration-200 hover:shadow-md
        dark:border-gray-700/80 dark:bg-gray-800/80 dark:shadow-none dark:hover:border-gray-600
        ${className}
      `.trim()}
      aria-labelledby={titleId}
    >
      {/* Row 1: Icon (top-left) + Trend pill (top-right) */}
      <div className="flex w-full items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-2.5 ${iconStyles}`}
          aria-hidden
        >
          {icon}
        </div>
        {changeDisplay != null && (
          <span
            className={`
              inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium tabular-nums
              ${hasTrend
                ? isPositive
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}
            `}
            aria-label={t('statsCard.changeLabel', { change: changeDisplay, trend: trend ?? 'neutral' })}
          >
            {hasTrend && (
              <>
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span>{changeDisplay}</span>
              </>
            )}
            {!hasTrend && changeDisplay}
          </span>
        )}
      </div>

      {/* Row 2: Number + Title stacked */}
      <div className="mt-4 min-w-0">
        <p className="text-[2.1rem] font-bold leading-tight tabular-nums text-gray-900 dark:text-gray-100">
          {typeof value === 'number' ? formatValue(value, i18n.language) : value}
        </p>
        <p
          id={titleId}
          className="mt-1 text-base font-medium text-slate-700 dark:text-slate-300"
        >
          {title}
        </p>
      </div>
    </article>
  )
}

function formatValue(num, locale) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(num)
}
