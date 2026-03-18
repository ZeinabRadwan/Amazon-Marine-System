/**
 * Shimmer – skeleton placeholder with gradient sweep animation.
 * Use for list or block loading states.
 *
 * @param {number} [rows=4] - Number of placeholder rows (for list shimmer)
 * @param {string} [className] - Optional class for the container
 */
export default function Shimmer({ rows = 4, className = '' }) {
  return (
    <div className={`shimmer-list ${className}`.trim()} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="shimmer-list__row">
          <span className="shimmer-list__line shimmer-list__line--short" />
          <span className="shimmer-list__line shimmer-list__line--long" />
        </div>
      ))}
    </div>
  )
}
