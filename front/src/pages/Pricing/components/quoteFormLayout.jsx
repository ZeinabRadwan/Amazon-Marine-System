/** Shared inline layout primitives for Create Standard Quotation */

export function QuoteInlineStrip({ children, className = '' }) {
  return <div className={`pricing-quote-inline-strip${className ? ` ${className}` : ''}`}>{children}</div>
}

export function QuoteInlineItem({ label, children, className = '' }) {
  return (
    <span className={`pricing-quote-inline-item${className ? ` ${className}` : ''}`}>
      <span className="pricing-quote-inline-item__label">{label}</span>
      <span className="pricing-quote-inline-item__sep" aria-hidden>
        :
      </span>
      <span className="pricing-quote-inline-item__value">{children}</span>
    </span>
  )
}

export function QuoteInlineDivider() {
  return (
    <span className="pricing-quote-inline-divider" aria-hidden>
      |
    </span>
  )
}

export function QuoteMetaChip({ label, children }) {
  return <QuoteSummaryBadge label={label}>{children}</QuoteSummaryBadge>
}

/** Compact summary badge for shipment route row */
export function QuoteSummaryBadge({ label, children, className = '' }) {
  return (
    <span className={`pricing-quote-summary-badge${className ? ` ${className}` : ''}`}>
      <span className="pricing-quote-summary-badge__label">{label}</span>
      <span className="pricing-quote-summary-badge__value">{children}</span>
    </span>
  )
}

export function QuotePillToggle({ enabled, onToggle, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`pricing-quote-pill-toggle${enabled ? ' is-on' : ''}`}
    >
      <span className="pricing-quote-pill-toggle__knob" aria-hidden />
    </button>
  )
}
