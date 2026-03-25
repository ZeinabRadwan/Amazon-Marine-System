import { getLanguage } from '../i18n'

/**
 * Sends the SPA language so Laravel can set locale (see SetApiLocale middleware).
 */
export function acceptLanguageHeader() {
  return getLanguage() === 'ar' ? 'ar,en;q=0.9' : 'en,ar;q=0.9'
}

export function appLocaleHeader() {
  return getLanguage() === 'ar' ? 'ar' : 'en'
}

/**
 * @param {HeadersInit | undefined} headers
 * @returns {Headers}
 */
export function withLocaleHeaders(headers) {
  const h = new Headers(headers ?? undefined)
  if (!h.has('Accept-Language')) {
    h.set('Accept-Language', acceptLanguageHeader())
  }
  if (!h.has('X-App-Locale')) {
    h.set('X-App-Locale', appLocaleHeader())
  }
  return h
}

/**
 * Same as fetch() but merges Accept-Language and X-App-Locale when missing.
 * @param {RequestInfo | URL} input
 * @param {RequestInit} [init]
 */
export async function apiFetch(input, init = {}) {
  const next = { ...init, headers: withLocaleHeaders(init.headers) }
  return fetch(input, next)
}
