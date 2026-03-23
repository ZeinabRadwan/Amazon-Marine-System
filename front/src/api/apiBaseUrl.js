export function getApiBaseUrl() {
  const base = import.meta.env.VITE_API_BASE_URL
  if (base) return base

  const host = import.meta.env.VITE_API_URL
  if (host) return `${host.replace(/\/$/, '')}/api/v1`

  // If env vars are missing in a production build, default to same-origin.
  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location
    const isLocal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'

    if (!isLocal) return `${origin}/api/v1`
  }

  // Local dev fallback: Vite dev server (5173) -> Laravel (8000)
  return 'http://localhost:8000/api/v1'
}

