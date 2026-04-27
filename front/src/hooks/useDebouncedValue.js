import { useEffect, useState } from 'react'

/**
 * Returns `value` after it has stayed unchanged for `delayMs`.
 * Used so text search can debounce while POL/POD/container filters stay immediate.
 */
export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])

  return debounced
}
