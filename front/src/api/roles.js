/**
 * Roles & Permissions API – matches back/postman_collection.json Roles & Permissions module.
 */

const getBaseUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL
  if (base) return base
  const host = import.meta.env.VITE_API_URL
  return host ? `${host.replace(/\/$/, '')}/api/v1` : 'http://localhost:8000/api/v1'
}

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
  const res = await fetch(`${getBaseUrl()}/roles`, {
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
  const res = await fetch(`${getBaseUrl()}/permissions`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list permissions (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/permissions/{{role_id}} – Get Permissions For Role
 */
export async function getPermissionsForRole(token, roleId) {
  const res = await fetch(`${getBaseUrl()}/permissions/${roleId}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get permissions (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/permissions – Upsert Page Permission
 * Body: { role_id, page, can_view, can_edit, can_delete, can_approve }
 */
export async function upsertPermission(token, body) {
  const res = await fetch(`${getBaseUrl()}/permissions`, {
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
