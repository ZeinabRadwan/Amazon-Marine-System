/**
 * Roles & Permissions API – matches back/postman_collection.json Roles & Permissions module.
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
 * GET {{base_url}}/roles – List Roles
 */
export async function listRoles(token) {
  const res = await apiFetch(`${getBaseUrl()}/roles`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list roles (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/permissions – List Page Permissions
 */
export async function listPermissions(token) {
  const res = await apiFetch(`${getBaseUrl()}/permissions`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list permissions (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/permissions/by-role/{{role_id}} – Get Page Permissions By Role
 */
export async function getPermissionsByRole(token, roleId) {
  const res = await apiFetch(`${getBaseUrl()}/permissions/by-role/${roleId}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get permissions (${res.status})`)
  return data
}

/** @deprecated Use getPermissionsByRole. Kept for backward compatibility. */
export async function getPermissionsForRole(token, roleId) {
  return getPermissionsByRole(token, roleId)
}

/**
 * POST {{base_url}}/permissions – Upsert Page Permission
 * Body: { role_id, page, can_view, can_edit, can_delete, can_approve }
 */
export async function upsertPermission(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/permissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to upsert permission (${res.status})`)
  return data
}

/**
 * DELETE {{base_url}}/permissions/{{page_permission_id}} – Delete Page Permission
 */
export async function deletePagePermission(token, pagePermissionId) {
  const res = await apiFetch(`${getBaseUrl()}/permissions/${pagePermissionId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete permission (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/abilities – List Abilities (Spatie)
 */
export async function listAbilities(token) {
  const res = await apiFetch(`${getBaseUrl()}/abilities`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list abilities (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/roles – Create Role
 * Body: { name, permissions?: string[] }
 */
export async function createRole(token, body) {
  const res = await apiFetch(`${getBaseUrl()}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create role (${res.status})`)
  return data
}

/**
 * PUT {{base_url}}/roles/{{role_id}} – Update Role
 * Body: { name?, permissions?: string[] }
 */
export async function updateRole(token, roleId, body) {
  const res = await apiFetch(`${getBaseUrl()}/roles/${roleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update role (${res.status})`)
  return data
}

/**
 * DELETE {{base_url}}/roles/{{role_id}} – Delete Role
 */
export async function deleteRole(token, roleId) {
  const res = await apiFetch(`${getBaseUrl()}/roles/${roleId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete role (${res.status})`)
  return data
}
