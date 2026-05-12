/**
 * Activity log API – subject-scoped lists (e.g. shipment audit for operations, financial audit).
 */

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
 * @param {string} token
 * @param {{ subjectType: string, subjectId: number|string }} params
 * subjectType: short key e.g. "shipment" or full model class
 */
export async function listActivitiesBySubject(token, { subjectType, subjectId, perPage = 25 } = {}) {
  const searchParams = new URLSearchParams()
  searchParams.set('subject_type', String(subjectType))
  searchParams.set('subject_id', String(subjectId))
  if (perPage != null) searchParams.set('per_page', String(perPage))
  const res = await apiFetch(`${getBaseUrl()}/activities?${searchParams.toString()}`, {
    headers: authHeaders(token),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.message || json.error || `Failed to load activity (${res.status})`)
  }
  return { data: json.data ?? [], meta: json.meta ?? {} }
}
