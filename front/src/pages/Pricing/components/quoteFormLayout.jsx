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

/** Shipping line badge for read-only quote details (no toggle). */
export function ShippingLineSummaryBadgeReadOnly({ line, visible, t }) {
  const stateLabel = visible
    ? t('pricing.shippingLineShowToClientBadge', 'إظهار للعميل')
    : t('pricing.shippingLineHideFromClientBadge', 'غير ظاهر للعميل')
  const displayLine = visible ? line || '—' : '—'
  return (
    <QuoteSummaryBadge
      label={t('pricing.quoteBadgeShippingLine', 'الخط الملاحي')}
      className="pricing-quote-summary-badge--carrier"
    >
      <span className={visible ? '' : 'pricing-quote-summary-badge__value--muted'}>{displayLine}</span>
      <span className="pricing-quote-summary-badge__pipe" aria-hidden />
      <span className={`pricing-quote-summary-badge__visibility ${visible ? 'is-on' : 'is-off'}`}>{stateLabel}</span>
    </QuoteSummaryBadge>
  )
}

/** Shipping line value + client visibility toggle in one badge */
export function ShippingLineSummaryBadge({ line, visible, onToggle, t }) {
  const stateLabel = visible
    ? t('pricing.shippingLineShowToClientBadge', 'إظهار للعميل')
    : t('pricing.shippingLineHideFromClientBadge', 'غير ظاهر للعميل')
  const displayLine = visible ? line || '—' : '—'
  return (
    <QuoteSummaryBadge
      label={t('pricing.quoteBadgeShippingLine', 'الخط الملاحي')}
      className="pricing-quote-summary-badge--carrier"
    >
      <span className={visible ? '' : 'pricing-quote-summary-badge__value--muted'}>{displayLine}</span>
      <span className="pricing-quote-summary-badge__pipe" aria-hidden />
      <span
        className={`pricing-quote-summary-badge__visibility ${visible ? 'is-on' : 'is-off'}`}
        aria-live="polite"
      >
        {stateLabel}
      </span>
      <QuotePillToggle enabled={visible} onToggle={onToggle} ariaLabel={stateLabel} />
    </QuoteSummaryBadge>
  )
}
