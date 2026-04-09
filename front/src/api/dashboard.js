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
export const getDashboardSalesEmployee = (token) => getRoleDashboard(token, 'sales-employee')
export const getDashboardAccountant = (token) => getRoleDashboard(token, 'accountant')
export const getDashboardPricingTeam = (token) => getRoleDashboard(token, 'pricing-team')
export const getDashboardOperationsEmployee = (token) => getRoleDashboard(token, 'operations-employee')
export const getDashboardSupportEmployee = (token) => getRoleDashboard(token, 'support-employee')

export async function getSidebarCounts(token) {
  const res = await apiFetch(`${getBaseUrl()}/dashboard/sidebar-counts`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load sidebar counts (${res.status})`)
  return data.data ?? data
}

