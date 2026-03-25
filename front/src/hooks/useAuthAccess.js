import { useCallback, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

/** Spatie-style names checked by ClientPolicy / API */
function clientPermissionNames(action) {
  switch (action) {
    case 'update':
    case 'create':
      return ['clients.manage', 'pricing.manage_client_pricing']
    case 'delete':
      return ['clients.delete']
    case 'view':
      return ['clients.view', 'pricing.view_client_pricing']
    default:
      return [`clients.${action}`]
  }
}

function permissionNamesFor(resource, action) {
  if (resource === 'clients') {
    return clientPermissionNames(action)
  }
  return [`${resource}.${action}`]
}

/**
 * Fine-grained UI gates aligned with backend `permissions` from AuthenticatedLayout.
 * Admins match policy-style bypass (e.g. pricing policies).
 *
 * @returns {{ hasPermission: (resource: string, action: string) => boolean, permissions: string[], user: object|undefined, isAdminRole: boolean }}
 */
export function useAuthAccess() {
  const { user, permissions = [] } = useOutletContext() || {}
  const permSet = useMemo(
    () => new Set(Array.isArray(permissions) ? permissions.filter(Boolean) : []),
    [permissions]
  )
  const perms = useMemo(
    () => (Array.isArray(permissions) ? permissions.filter(Boolean) : []),
    [permissions]
  )

  const isAdminRole = useMemo(() => {
    const primary = (user?.primary_role ?? user?.roles?.[0] ?? '').toString().toLowerCase()
    return primary === 'admin'
  }, [user])

  const hasPermission = useCallback(
    (resource, action) => {
      if (!resource || !action) return false
      const r = String(resource)
      const names = permissionNamesFor(r, String(action))
      if (isAdminRole && r === 'clients') return true
      return names.some((n) => permSet.has(n))
    },
    [permSet, isAdminRole]
  )

  return { hasPermission, permissions: perms, user, isAdminRole }
}
