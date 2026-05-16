import i18n from '../../../i18n'

/** @typedef {'success' | 'error'} PricingToastType */

/**
 * @typedef {Object} PricingToast
 * @property {string} id
 * @property {PricingToastType} type
 * @property {string} message
 */

/** @type {Set<(toasts: PricingToast[]) => void>} */
const listeners = new Set()

/** @type {PricingToast[]} */
let toasts = []

const TOAST_TTL_MS = { success: 4500, error: 6500 }
const MAX_VISIBLE = 4

export const PRICING_ACTIONS = {
  OFFER_CREATE: 'offer.create',
  OFFER_UPDATE: 'offer.update',
  OFFER_ACTIVATE: 'offer.activate',
  OFFER_ARCHIVE: 'offer.archive',
  OFFER_DELETE: 'offer.delete',
  OFFER_LIST: 'offer.list',
  QUOTE_CREATE: 'quote.create',
  QUOTE_UPDATE: 'quote.update',
  QUOTE_GET: 'quote.get',
  QUOTE_ACCEPT: 'quote.accept',
  QUOTE_REJECT: 'quote.reject',
  QUOTE_DELETE: 'quote.delete',
  QUOTE_PDF: 'quote.pdf',
  PORT_CREATE: 'port.create',
  SHIPPING_LINE_CREATE: 'shippingLine.create',
  FREIGHT_UNIT_CREATE: 'freightUnit.create',
}

function emit() {
  listeners.forEach((fn) => fn([...toasts]))
}

function nextId() {
  return `pricing-toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Resolve a localized message for an action, or fall back to module defaults.
 * @param {string} action
 * @param {PricingToastType} type
 */
export function pricingFeedbackMessage(action, type) {
  const parts = String(action || '').split('.')
  const actionKey =
    parts.length >= 2
      ? `pricing.feedback.actions.${parts[0]}.${parts[1]}.${type}`
      : ''
  const defaultKey =
    type === 'success' ? 'pricing.feedback.successDefault' : 'pricing.feedback.errorDefault'
  if (actionKey) {
    const actionMsg = i18n.t(actionKey, { defaultValue: '' })
    if (actionMsg) return actionMsg
  }
  return i18n.t(defaultKey)
}

/**
 * Push a toast notification (non-blocking snackbar).
 * @param {{ type: PricingToastType, message?: string, action?: string }} options
 */
export function showPricingToast({ type, message, action }) {
  const resolved =
    message ||
    (action ? pricingFeedbackMessage(action, type) : i18n.t(
      type === 'success' ? 'pricing.feedback.successDefault' : 'pricing.feedback.errorDefault',
    ))

  const toast = { id: nextId(), type, message: resolved }
  toasts = [toast, ...toasts].slice(0, MAX_VISIBLE)
  emit()

  const ttl = TOAST_TTL_MS[type] ?? TOAST_TTL_MS.error
  setTimeout(() => dismissPricingToast(toast.id), ttl)
}

/**
 * @param {string} id
 */
export function dismissPricingToast(id) {
  const next = toasts.filter((t) => t.id !== id)
  if (next.length === toasts.length) return
  toasts = next
  emit()
}

/**
 * @param {string} action
 * @param {string} [message]
 */
export function notifyPricingSuccess(action, message) {
  showPricingToast({ type: 'success', action, message })
}

/**
 * @param {string} action
 * @param {unknown} [err]
 * @param {string} [message]
 */
export function notifyPricingError(action, err, message) {
  const fromErr =
    err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
      ? err.message
      : ''
  showPricingToast({
    type: 'error',
    action,
    message: message || fromErr || undefined,
  })
}

/**
 * Wrap any pricing API call with success/error toasts. Re-throws on failure.
 * @template T
 * @param {string} action
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
/**
 * @param {string} action
 * @param {() => Promise<unknown>} fn
 * @param {{ notifySuccess?: boolean }} [options]
 */
export async function runPricingAction(action, fn, options = {}) {
  const { notifySuccess = true } = options
  try {
    const result = await fn()
    if (notifySuccess) notifyPricingSuccess(action)
    return result
  } catch (err) {
    notifyPricingError(action, err)
    throw err
  }
}

/**
 * Subscribe to toast stack updates (for PricingToastHost).
 * @param {(toasts: PricingToast[]) => void} listener
 * @returns {() => void}
 */
export function subscribePricingToasts(listener) {
  listeners.add(listener)
  listener([...toasts])
  return () => listeners.delete(listener)
}
