/**
 * Inline row/card action buttons (View, Edit, Delete, etc.) — no overflow menus.
 */
export default function PricingInlineActions({ label, children, className = '', onClick }) {
  return (
    <div
      className={`pricing-inline-actions${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
