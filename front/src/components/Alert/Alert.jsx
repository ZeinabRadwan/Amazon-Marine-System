import { useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react'
import './Alert.css'

const VARIANTS = {
  success: { icon: CheckCircle, className: 'alert--success' },
  warning: { icon: AlertTriangle, className: 'alert--warning' },
  error: { icon: XCircle, className: 'alert--error' },
}

/**
 * Alert – fixed toast-style alert for success, warning, or error.
 * @param {string} variant - 'success' | 'warning' | 'error'
 * @param {string} message - Message to show
 * @param {function} onClose - Called when dismissed (button or auto)
 * @param {number|false} [autoDismiss] - Ms to auto-dismiss (default: success 5000, warning 6000, error false)
 * @param {boolean} [dismissible=true] - Show close button
 */
export default function Alert({
  variant = 'error',
  message,
  onClose,
  autoDismiss = undefined,
  dismissible = true,
  className = '',
}) {
  const config = VARIANTS[variant] ?? VARIANTS.error
  const Icon = config.icon

  const defaultAuto = variant === 'success' ? 5000 : variant === 'warning' ? 6000 : false
  const ms = autoDismiss !== undefined ? autoDismiss : defaultAuto

  useEffect(() => {
    if (typeof ms === 'number' && ms > 0 && onClose) {
      const t = setTimeout(onClose, ms)
      return () => clearTimeout(t)
    }
  }, [ms, onClose])

  if (!message) return null

  return (
    <div
      className={`alert ${config.className} ${className}`.trim()}
      role="alert"
      aria-live="assertive"
    >
      <Icon className="alert__icon" aria-hidden />
      <p className="alert__message">{message}</p>
      {dismissible && onClose && (
        <button
          type="button"
          className="alert__close"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="alert__close-icon" aria-hidden />
        </button>
      )}
    </div>
  )
}
