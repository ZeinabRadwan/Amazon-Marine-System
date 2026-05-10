import { getApiBaseUrl } from '../api/apiBaseUrl'

/**
 * Strip `/api/v1` so `/images/...` resolves on the Laravel public root.
 */
export function getBackendPublicOrigin() {
  const api = getApiBaseUrl()
  const stripped = api.replace(/\/api\/v1\/?$/i, '').replace(/\/$/, '')
  if (stripped) {
    return stripped
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
}

/**
 * Blade PDF template uses file:// paths for mPDF; browsers block those in iframe preview.
 */
export function rewriteInvoicePreviewFileUrls(html, publicOrigin) {
  const base = String(publicOrigin || '').replace(/\/$/, '')
  if (!base || !html) {
    return html
  }
  let out = html
  out = out.replace(/src="file:\/\/[^"]*?\/images\/([^"]+)"/gi, (_, file) => `src="${base}/images/${file}"`)
  if (out.includes('<head>')) {
    out = out.replace('<head>', `<head>\n<base href="${base}/">`)
  }
  return out
}
