/**
 * Users & Permissions API – user-level permission overrides.
 * GET /users-with-permissions, GET/PUT /users/{id}/permissions, POST /users/{id}/permissions/reset
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
 * GET /users-with-permissions – list users with role and effective permissions
 */
export async function listUsersWithPermissions(token) {
  const res = await fetch(`${getBaseUrl()}/users-with-permissions`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list users (${res.status})`)
  return data
}

/**
 * GET /users/{id}/permissions – get user's permissions (role + overrides + effective)
 */
export async function getUserPermissions(token, userId) {
  const res = await fetch(`${getBaseUrl()}/users/${userId}/permissions`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to get permissions (${res.status})`)
  return data
}

/**
 * PUT /users/{id}/permissions – set user permission overrides
 * Body: { permissions: [ { name: "clients.view", allowed: true }, ... ] }
 */
export async function updateUserPermissions(token, userId, body) {
  const res = await fetch(`${getBaseUrl()}/users/${userId}/permissions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update permissions (${res.status})`)
  return data
}

/**
 * POST /users/{id}/permissions/reset – reset user to role default (clear overrides)
 */
export async function resetUserPermissions(token, userId) {
  const res = await fetch(`${getBaseUrl()}/users/${userId}/permissions/reset`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to reset permissions (${res.status})`)
  return data
}
