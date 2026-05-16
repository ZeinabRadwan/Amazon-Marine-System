/** Collapsible section card shared by Create Quote and Quote Details. */
export default function QuoteFinCard({
  icon: Icon,
  title,
  subtitle: _subtitleIgnored,
  headMeta = null,
  children,
  fixed = false,
  defaultOpen = false,
}) {
  if (fixed) {
    return <div className="pricing-quote-fin-section--fixed">{children}</div>
  }
  return (
    <details className="shipment-fin-card pricing-fin-section pricing-quote-collapsible" open={defaultOpen || undefined}>
      <summary className="shipment-fin-card__head pricing-fin-section__summary pricing-quote-collapsible__summary">
        <div className="shipment-fin-card__head-main">
          {Icon ? <Icon className="shipment-fin-card__icon" aria-hidden /> : null}
          <div className="shipment-fin-card__title">{title}</div>
        </div>
        {headMeta != null && headMeta !== false ? (
          <div className="shipment-fin-card__head-meta">{headMeta}</div>
        ) : null}
        <span className="pricing-fin-section__chev pricing-quote-collapsible__chev" aria-hidden />
      </summary>
      <div className="shipment-fin-card__body pricing-fin-section__body">{children}</div>
    </details>
  )
}
