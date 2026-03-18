/**
 * Boxicons wrapper for Customer Services (matches UI).
 */
export function Bx({ name, className = '' }) {
  return <i className={`bx ${name} ${className}`.trim()} aria-hidden />
}
