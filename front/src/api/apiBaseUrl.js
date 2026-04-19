function isBrowserLocalHostname(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  )
}

function apiBaseReferencesLoopback(base) {
  if (!base || typeof base !== 'string') {
    return false
  }
  try {
    const u = new URL(base)
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1'
  } catch {
    return /^(https?:)?\/\/(localhost|127\.0\.0\.1)\b/i.test(base)
  }
}

/**
 * Production CRM on the public web must not call a loopback API URL (often baked when CI sets
 * VITE_API_URL or the build ran with the wrong cwd so .env.production was ignored).
 */
const PRODUCTION_PUBLIC_API_BASE = 'https://back.crm-amazonltd.live/api/v1'

function shouldReplaceLoopbackWithPublicApi() {
  return (
    import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    !isBrowserLocalHostname(window.location.hostname)
  )
}

export function getApiBaseUrl() {
  const base = import.meta.env.VITE_API_BASE_URL
  if (base) {
    if (shouldReplaceLoopbackWithPublicApi() && apiBaseReferencesLoopback(base)) {
      return PRODUCTION_PUBLIC_API_BASE
    }
    return base
  }

  const host = import.meta.env.VITE_API_URL
  if (host) {
    const fromHost = `${host.replace(/\/$/, '')}/api/v1`
    if (shouldReplaceLoopbackWithPublicApi() && apiBaseReferencesLoopback(fromHost)) {
      return PRODUCTION_PUBLIC_API_BASE
    }
    return fromHost
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location
    const isLocal = isBrowserLocalHostname(hostname)

    // Vite dev: empty VITE_API_URL + proxy — same-origin /api/v1 (see vite.config.js server.proxy)
    if (import.meta.env.DEV && isLocal) {
      return `${origin}/api/v1`
    }

    // Production build without VITE_API_URL: same-origin API
    if (!isLocal) return `${origin}/api/v1`
  }

  // Local Laravel (php artisan serve) when you set VITE_API_URL=http://localhost:8000 in .env.local
  return 'http://localhost:8000/api/v1'
}

