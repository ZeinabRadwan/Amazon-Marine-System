import { formatOwsQuoteFootnote } from '../utils/owsQuoteCharges'

/** Import OWS — informational only; excluded from quotation totals. */
export default function QuoteOwsDeferredFootnote({ ows, className = '' }) {
  const detail = formatOwsQuoteFootnote(ows)
  if (!detail) return null

  return (
    <div
      className={`pricing-quote-reefer-deferred-footnote pricing-quote-ows-deferred-footnote ${className}`.trim()}
      role="note"
    >
      <p className="pricing-quote-reefer-deferred-footnote__line">
        <span className="pricing-quote-reefer-deferred-footnote__plus" aria-hidden>
          +{' '}
        </span>
        <span className="pricing-quote-reefer-deferred-footnote__power" lang="en">
          OWS
        </span>
        <span className="pricing-quote-reefer-deferred-footnote__rate" lang="en">
          {' '}
          {detail}
        </span>
      </p>
    </div>
  )
}
