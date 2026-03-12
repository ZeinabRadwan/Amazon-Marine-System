/**
 * LoaderDots – reusable 3-dot loading animation.
 * Uses the same colors as the sidebar toggle dots: orange, yellow, green.
 *
 * @param {number} [size=8] - Dot size in pixels
 * @param {string} [color] - Optional. Override all dots to this color. If omitted, uses sidebar colors (orange, yellow, green).
 * @param {string} [className] - Optional class for the container
 * @param {string} [label] - Optional visible label (e.g. "Loading…") shown next to dots
 */
export default function LoaderDots({ size = 8, color, className = '', label }) {
  const gap = Math.round(size * 0.75)
  const sizeStyle = {
    width: `${size}px`,
    height: `${size}px`,
    ...(color && { backgroundColor: color }),
  }

  const dotClass = (modifier) =>
    `loader-dots__dot loader-dots__dot--${modifier}`.trim()

  return (
    <div
      className={`loader-dots ${className}`.trim()}
      style={{ '--loader-dots-size': `${size}px`, '--loader-dots-gap': `${gap}px` }}
      role="status"
      aria-label={label || 'Loading'}
      aria-live="polite"
    >
      <span className={color ? 'loader-dots__dot' : dotClass('orange')} style={sizeStyle} aria-hidden />
      <span className={color ? 'loader-dots__dot' : dotClass('yellow')} style={sizeStyle} aria-hidden />
      <span className={color ? 'loader-dots__dot' : dotClass('green')} style={sizeStyle} aria-hidden />
      {label && <span className="loader-dots__label">{label}</span>}
    </div>
  )
}
