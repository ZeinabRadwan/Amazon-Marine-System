export function getApiBaseUrl() {
  const base = import.meta.env.VITE_API_BASE_URL
  if (base) return base

  const host = import.meta.env.VITE_API_URL
  if (host) return `${host.replace(/\/$/, '')}/api/v1`

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'

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

