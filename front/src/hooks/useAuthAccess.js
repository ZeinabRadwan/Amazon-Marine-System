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
 * @returns {{ hasPermission: (resource: string, action: string) => boolean }}
 */
export function useAuthAccess() {
  const { permissions = [] } = useOutletContext() || {}
  const permSet = useMemo(
    () => new Set(Array.isArray(permissions) ? permissions.filter(Boolean) : []),
    [permissions]
  )

  const hasPermission = useCallback(
    (resource, action) => {
      if (!resource || !action) return false
      return permissionNamesFor(String(resource), String(action)).some((n) => permSet.has(n))
    },
    [permSet]
  )

  return { hasPermission }
}
