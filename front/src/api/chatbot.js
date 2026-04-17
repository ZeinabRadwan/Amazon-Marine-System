import { getApiBaseUrl } from './apiBaseUrl'
import { apiFetch } from './http'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * GET /chatbot/prompts
 */
export async function listChatbotPrompts(token) {
  const res = await apiFetch(`${getBaseUrl()}/chatbot/prompts`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list prompts (${res.status})`)
  return data
}

/**
 * POST /chatbot/ask
 * @param {string} token
 * @param {string} message
 * @param {string} locale
 */
export async function askChatbot(token, message, locale = 'ar') {
  const res = await apiFetch(`${getBaseUrl()}/chatbot/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ message, locale }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to ask chatbot (${res.status})`)
  return data
}
