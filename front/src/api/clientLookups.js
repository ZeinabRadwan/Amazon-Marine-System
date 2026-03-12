/**
 * Client Lookups API – matches back/postman_collection.json Client Lookups module.
 * Company Types (5) + Preferred Comm Methods (5) = 10 APIs.
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

// —— Company Types ——

/** GET {{base_url}}/company-types – List Company Types */
export async function listCompanyTypes(token) {
  const res = await fetch(`${getBaseUrl()}/company-types`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list company types (${res.status})`)
  return data
}

/** POST {{base_url}}/company-types – Create Company Type. Body: { name, sort_order? } */
export async function createCompanyType(token, body) {
  const res = await fetch(`${getBaseUrl()}/company-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create company type (${res.status})`)
  return data
}

/** GET {{base_url}}/company-types/:id – Show Company Type */
export async function showCompanyType(token, id) {
  const res = await fetch(`${getBaseUrl()}/company-types/${id}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load company type (${res.status})`)
  return data
}

/** PUT {{base_url}}/company-types/:id – Update Company Type. Body: { name?, sort_order? } */
export async function updateCompanyType(token, id, body) {
  const res = await fetch(`${getBaseUrl()}/company-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update company type (${res.status})`)
  return data
}

/** DELETE {{base_url}}/company-types/:id – Delete Company Type */
export async function deleteCompanyType(token, id) {
  const res = await fetch(`${getBaseUrl()}/company-types/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete company type (${res.status})`)
  return data
}

// —— Preferred Comm Methods ——

/** GET {{base_url}}/preferred-comm-methods – List Preferred Comm Methods */
export async function listPreferredCommMethods(token) {
  const res = await fetch(`${getBaseUrl()}/preferred-comm-methods`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list preferred comm methods (${res.status})`)
  return data
}

/** POST {{base_url}}/preferred-comm-methods – Create. Body: { name, sort_order? } */
export async function createPreferredCommMethod(token, body) {
  const res = await fetch(`${getBaseUrl()}/preferred-comm-methods`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to create preferred comm method (${res.status})`)
  return data
}

/** GET {{base_url}}/preferred-comm-methods/:id – Show Preferred Comm Method */
export async function showPreferredCommMethod(token, id) {
  const res = await fetch(`${getBaseUrl()}/preferred-comm-methods/${id}`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to load preferred comm method (${res.status})`)
  return data
}

/** PUT {{base_url}}/preferred-comm-methods/:id – Update. Body: { name?, sort_order? } */
export async function updatePreferredCommMethod(token, id, body) {
  const res = await fetch(`${getBaseUrl()}/preferred-comm-methods/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to update preferred comm method (${res.status})`)
  return data
}

/** DELETE {{base_url}}/preferred-comm-methods/:id – Delete Preferred Comm Method */
export async function deletePreferredCommMethod(token, id) {
  const res = await fetch(`${getBaseUrl()}/preferred-comm-methods/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to delete preferred comm method (${res.status})`)
  return data
}

// —— Lead Sources (for Clients filter) ——

/** GET {{base_url}}/lead-sources – List Lead Sources */
export async function listLeadSources(token) {
  const res = await fetch(`${getBaseUrl()}/lead-sources`, { headers: authHeaders(token) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.error || `Failed to list lead sources (${res.status})`)
  return data
}
