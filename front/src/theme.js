const THEME_KEY = 'theme'

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY)
}

export function setStoredTheme(theme) {
  if (theme) localStorage.setItem(THEME_KEY, theme)
  else localStorage.removeItem(THEME_KEY)
}

export function getSystemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getResolvedTheme() {
  const stored = getStoredTheme()
  if (stored === 'dark' || stored === 'light') return stored
  return getSystemDark() ? 'dark' : 'light'
}

export function applyTheme(theme) {
  const resolved = theme === 'dark' || theme === 'light' ? theme : getResolvedTheme()
  document.documentElement.setAttribute('data-theme', resolved)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('themechange', { detail: resolved }))
  }
}

export function initTheme() {
  applyTheme(getResolvedTheme())
}

export function toggleTheme() {
  const next = getResolvedTheme() === 'dark' ? 'light' : 'dark'
  setStoredTheme(next)
  applyTheme(next)
  return next
}
