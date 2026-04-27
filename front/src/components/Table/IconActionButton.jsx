/**
 * Icon-only action button with tooltip (title) and aria-label for accessibility.
 * Use in table action columns for View, Edit, Delete, etc.
 *
 * Wrap multiple buttons in IconActionButtonGroup for a merged control (segmented radius).
 *
 * Props: icon (ReactNode), label (string – tooltip + aria-label), onClick, disabled?, className?, variant?,
 *        segment? 'single' | 'first' | 'middle' | 'last' (usually set by IconActionButtonGroup)
 */
export default function IconActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  className = '',
  variant = '', // 'danger' | 'success' | ''
  segment = 'single',
}) {
  const segmentRound =
    segment === 'single'
      ? 'rounded-lg'
      : segment === 'first'
        ? 'rounded-s-lg rounded-e-none'
        : segment === 'last'
          ? 'rounded-e-lg rounded-s-none'
          : 'rounded-none'

  const segmentOverlap = segment === 'middle' || segment === 'last' ? '-ms-px' : ''

  const base = `relative inline-flex h-8 w-8 shrink-0 items-center justify-center border transition-colors focus:outline-none focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800 hover:z-10 active:z-10 active:scale-[0.96] ${segmentRound} ${segmentOverlap}`

  const defaultVariant =
    'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 active:bg-gray-200/90 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:active:bg-gray-600/90'
  const dangerVariant =
    'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 active:bg-red-100/90 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30'
  const successVariant =
    'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-100/90 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30'

  const variantClass =
    variant === 'danger' ? dangerVariant : variant === 'success' ? successVariant : defaultVariant
  const disabledClass = disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`${base} ${variantClass} ${disabledClass} ${className}`.trim()}
    >
      <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
        {icon}
      </span>
    </button>
  )
}

IconActionButton.displayName = 'IconActionButton'
