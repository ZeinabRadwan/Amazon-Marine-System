import { useEffect, useState } from 'react'
import Alert from '../../../components/Alert'
import { dismissPricingToast, subscribePricingToasts } from '../utils/pricingFeedback'
import './PricingToastHost.css'

/**
 * Global snackbar host for the Pricing module. Mount once under Pricing.jsx.
 */
export default function PricingToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => subscribePricingToasts(setToasts), [])

  if (!toasts.length) return null

  return (
    <div
      className="pricing-toast-host"
      role="region"
      aria-label="Pricing notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pricing-toast-host__item">
          <Alert
            variant={toast.type}
            message={toast.message}
            className="pricing-toast-host__alert"
            autoDismiss={false}
            onClose={() => dismissPricingToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}
