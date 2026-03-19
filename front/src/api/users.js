/**
 * Users API – matches back/postman_collection.json Users module.
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
 * GET {{base_url}}/users – List Users
 * Params: per_page, page, search, status, role (backend may return all if not paginated)
 */
export async function listUsers(token, params = {}) {
  const searchParams = new URLSearchParams()
  if (params.per_page != null) searchParams.set('per_page', String(params.per_page))
  if (params.page != null) searchParams.set('page', String(params.page))
  if (params.search != null && params.search !== '') searchParams.set('search', params.search)
  if (params.status != null && params.status !== '') searchParams.set('status', params.status)
  if (params.role != null && params.role !== '') searchParams.set('role', params.role)
  const query = searchParams.toString()
  const url = `${getBaseUrl()}/users${query ? `?${query}` : ''}`
  const res = await fetch(url, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list users (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/users – Create User (admin)
 * Body: { name, email, password, password_confirmation, role?, status? }
 */
export async function createUser(token, body) {
  const res = await fetch(`${getBaseUrl()}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create user (${res.status})`)
  return data
}

/**
 * PUT {{base_url}}/users/:id/password – Change User Password (admin)
 * Body: { password, password_confirmation }
 */
export async function changeUserPassword(token, userId, body) {
  const res = await fetch(`${getBaseUrl()}/users/${userId}/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to change password (${res.status})`)
  return data
}

/**
 * GET {{base_url}}/users/:id – Show User
 */
export async function showUser(token, userId) {
  const res = await fetch(`${getBaseUrl()}/users/${userId}`, {
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load user (${res.status})`)
  return data
}

/**
 * PUT {{base_url}}/users/:id – Update User
 * Body: { name?, email?, initials?, status?, role? }
 */
export async function updateUser(token, userId, body) {
  const res = await fetch(`${getBaseUrl()}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update user (${res.status})`)
  return data
}

/**
 * DELETE {{base_url}}/users/:id – Delete User
 */
export async function deleteUser(token, userId) {
  const res = await fetch(`${getBaseUrl()}/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete user (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/users/:id/activate – Activate User
 */
export async function activateUser(token, userId) {
  const res = await fetch(`${getBaseUrl()}/users/${userId}/activate`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to activate user (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/users/:id/deactivate – Deactivate User
 */
export async function deactivateUser(token, userId) {
  const res = await fetch(`${getBaseUrl()}/users/${userId}/deactivate`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to deactivate user (${res.status})`)
  return data
}

/**
 * POST {{base_url}}/users/:id/assign-role – Assign Role
 * Body: { role }
 */
export async function assignRole(token, userId, body) {
  const res = await fetch(`${getBaseUrl()}/users/${userId}/assign-role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to assign role (${res.status})`)
  return data
}
