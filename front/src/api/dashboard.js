/**
 * Dashboard API – overview aggregates.
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

export async function getDashboardOverview(token) {
  const res = await apiFetch(`${getBaseUrl()}/dashboard/overview`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load dashboard overview (${res.status})`)
  return data
}

async function getRoleDashboard(token, path) {
  const res = await apiFetch(`${getBaseUrl()}/dashboard/${path}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = String(data.message || data.error || '')
    const routeMissing = res.status === 404 || /route .* could not be found/i.test(msg)
    if (routeMissing) {
      // Compatibility fallback for environments where role-specific routes are not deployed yet.
      return getDashboardOverview(token)
    }
    throw new Error(data.message || data.error || `Failed to load dashboard module (${res.status})`)
  }
  return data
}

export const getDashboardAdminOverview = (token) => getRoleDashboard(token, 'admin-overview')
export const getDashboardSalesManager = (token) => getRoleDashboard(token, 'sales-manager')
export async function getDashboardSalesEmployee(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.completed_period) searchParams.set('completed_period', String(params.completed_period))
  if (params.completed_from) searchParams.set('completed_from', String(params.completed_from))
  if (params.completed_to) searchParams.set('completed_to', String(params.completed_to))
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/dashboard/sales-employee${q ? `?${q}` : ''}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load sales dashboard (${res.status})`)
  return data
}
export const getDashboardAccountant = (token) => getRoleDashboard(token, 'accountant')
export const getDashboardPricingTeam = (token) => getRoleDashboard(token, 'pricing-team')
export const getDashboardOperationsEmployee = (token) => getRoleDashboard(token, 'operations-employee')
export const getDashboardSupportEmployee = (token) => getRoleDashboard(token, 'support-employee')

export async function getOperationsDashboard(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.upcoming_window != null && params.upcoming_window !== '') {
    searchParams.set('upcoming_window', String(params.upcoming_window))
  }
  const q = searchParams.toString()
  const res = await apiFetch(`${getBaseUrl()}/operations-dashboard${q ? `?${q}` : ''}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load operations dashboard (${res.status})`)
  return data
}

export async function getSidebarCounts(token) {
  const res = await apiFetch(`${getBaseUrl()}/dashboard/sidebar-counts`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load sidebar counts (${res.status})`)
  return data.data ?? data
}

/** Mark a module as viewed — clears pending follow-up badge slice for that module. */
export async function acknowledgeSidebarModule(token, module) {
  const res = await apiFetch(`${getBaseUrl()}/dashboard/sidebar-activity/acknowledge`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ module }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to acknowledge sidebar activity (${res.status})`)
  return data.data ?? data
}

