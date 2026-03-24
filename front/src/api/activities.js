/**
 * Activity log API – subject-scoped lists for shipment financial audit (financial.view / accounting.view).
 */

import { getApiBaseUrl } from './apiBaseUrl'

const getBaseUrl = getApiBaseUrl

function authHeaders(token) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * @param {string} token
 * @param {{ subjectType: string, subjectId: number|string }} params
 * subjectType: short key e.g. "shipment" or full model class
 */
export async function listActivitiesBySubject(token, { subjectType, subjectId }) {
  const searchParams = new URLSearchParams()
  searchParams.set('subject_type', String(subjectType))
  searchParams.set('subject_id', String(subjectId))
  const res = await fetch(`${getBaseUrl()}/activities?${searchParams.toString()}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load activity (${res.status})`)
  }
  return { data: json.data ?? [] }
}
