import { useState } from 'react'
import { getStoredToken } from '../pages/Login'
import { downloadPaymentProof, paymentHasProof } from '../api/accountings'

/**
 * Opens a payment proof (image/PDF) via the authenticated API — not a public /storage URL.
 */
export default function PaymentProofLink({
  payment,
  className = 'accountings-pay-doc-link',
  children,
  disabled: disabledProp = false,
}) {
  const [busy, setBusy] = useState(false)
  const paymentId = payment?.id
  const hasProof = paymentHasProof(payment)

  if (!hasProof || paymentId == null) {
    return null
  }

  const handleOpen = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const token = getStoredToken()
    if (!token || busy) return
    setBusy(true)
    try {
      const { blob } = await downloadPaymentProof(token, paymentId)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000)
    } catch (err) {
      window.alert(err?.message || 'Failed to open attachment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleOpen}
      disabled={disabledProp || busy}
    >
      {children}
    </button>
  )
}
