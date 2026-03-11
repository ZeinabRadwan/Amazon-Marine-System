/**
 * LoaderDots – reusable 3-dot loading animation.
 * Uses the same colors as the sidebar toggle dots: orange, yellow, green.
 *
 * @param {number} [size=6] - Dot size in pixels
 * @param {string} [color] - Optional. Override all dots to this color. If omitted, uses sidebar colors (orange, yellow, green).
 * @param {string} [className] - Optional class for the container
 */
export default function LoaderDots({ size = 6, color, className = '' }) {
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
      role="status"
      aria-label="Loading"
    >
      <span className={color ? 'loader-dots__dot' : dotClass('orange')} style={sizeStyle} aria-hidden />
      <span className={color ? 'loader-dots__dot' : dotClass('yellow')} style={sizeStyle} aria-hidden />
      <span className={color ? 'loader-dots__dot' : dotClass('green')} style={sizeStyle} aria-hidden />
    </div>
  )
}
