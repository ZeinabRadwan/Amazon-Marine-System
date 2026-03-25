/**
 * Normalized { id, label } options for filter dropdowns (same pattern as Visits client/vendor selects).
 */

/** @returns {{ id: number|string, label: string } | null} */
export function normalizeClientOption(c) {
  if (!c || c.id == null) return null
  const name = c.name ?? c.client_name ?? ''
  const company = c.company_name ?? ''
  const label = company ? `${company}${name ? ` — ${name}` : ''}` : name || `#${c.id}`
  return { id: c.id, label }
}

/** @returns {{ id: number|string, label: string } | null} */
export function normalizeEmployeeOption(u) {
  if (!u || u.id == null) return null
  const label = (u.name && String(u.name).trim()) || (u.email && String(u.email).trim()) || `#${u.id}`
  return { id: u.id, label }
}
