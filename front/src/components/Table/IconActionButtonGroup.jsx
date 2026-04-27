import { Children, cloneElement, isValidElement } from 'react'
import IconActionButton from './IconActionButton'

/**
 * Merges adjacent IconActionButton controls: shared outer radius, no gaps, clearer hover stack.
 */
export default function IconActionButtonGroup({ children, className = '', 'aria-label': ariaLabel }) {
  const items = Children.toArray(children).filter((c) => c != null && c !== false)
  const n = items.length

  return (
    <div
      className={`icon-action-btn-group inline-flex items-stretch ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      {items.map((child, i) => {
        if (!isValidElement(child)) return child
        const isIab = child.type === IconActionButton || child.type?.displayName === 'IconActionButton'
        if (!isIab) return child
        const segment = n <= 1 ? 'single' : i === 0 ? 'first' : i === n - 1 ? 'last' : 'middle'
        return cloneElement(child, { key: child.key ?? `iab-${i}`, segment })
      })}
    </div>
  )
}
