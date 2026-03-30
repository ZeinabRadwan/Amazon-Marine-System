/**
 * Reports API – shipments/finance/team performance exports (reports.view permission).
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

export async function getReportsShipments(token) {
  const res = await apiFetch(`${getBaseUrl()}/reports/shipments`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load shipments report (${res.status})`)
  return data
}

export async function getReportsFinance(token) {
  const res = await apiFetch(`${getBaseUrl()}/reports/finance`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load finance report (${res.status})`)
  return data
}

export async function getSalesPerformance(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', String(params.from))
  if (params.to) searchParams.set('to', String(params.to))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/reports/sales-performance${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load sales performance (${res.status})`)
  return data
}

export async function getTeamPerformance(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', String(params.from))
  if (params.to) searchParams.set('to', String(params.to))
  if (params.search) searchParams.set('search', String(params.search))
  if (params.sort) searchParams.set('sort', String(params.sort))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/reports/team-performance${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load team performance (${res.status})`)
  return data
}

export async function exportTeamPerformanceCsv(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', String(params.from))
  if (params.to) searchParams.set('to', String(params.to))
  if (params.search) searchParams.set('search', String(params.search))
  if (params.sort) searchParams.set('sort', String(params.sort))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/reports/team-performance/export${q ? `?${q}` : ''}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export team performance (${res.status})`)
  }
  return res.blob()
}

export async function getClientsReport(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', String(params.from))
  if (params.to) searchParams.set('to', String(params.to))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/reports/clients${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load clients report (${res.status})`)
  return data
}

export async function exportClientsReportCsv(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', String(params.from))
  if (params.to) searchParams.set('to', String(params.to))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/reports/clients/export${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export clients report (${res.status})`)
  }
  return res.blob()
}

export async function getPartnerStatementsReport(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.currency) searchParams.set('currency', String(params.currency))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/reports/partners${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load partner statements (${res.status})`)
  return data
}

export async function exportPartnerStatementsCsv(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.currency) searchParams.set('currency', String(params.currency))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/reports/partners/export${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export partner statements (${res.status})`)
  }
  return res.blob()
}

export async function getAttendanceReport(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', String(params.from))
  if (params.to) searchParams.set('to', String(params.to))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/reports/attendance${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load attendance report (${res.status})`)
  return data
}

export async function exportAttendanceReportCsv(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.from) searchParams.set('from', String(params.from))
  if (params.to) searchParams.set('to', String(params.to))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/reports/attendance/export${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || data.error || `Failed to export attendance report (${res.status})`)
  }
  return res.blob()
}

