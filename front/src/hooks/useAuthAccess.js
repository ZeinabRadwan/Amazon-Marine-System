import { useMemo, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'

/** Maps (resource, action) to Spatie-style permission names from the API */
const RESOURCE_ACTION_TO_PERMISSION = {
  clients: {
    view: 'clients.view',
    create: 'clients.manage',
    update: 'clients.manage',
    delete: 'clients.delete',
  },
}

/**
 * Permissions and user from AuthenticatedLayout outlet context.
 * Use hasPermission('clients', 'update') etc. aligned with Laravel policies.
 */
export function useAuthAccess() {
  const { user, permissions = [] } = useOutletContext() || {}
  const perms = Array.isArray(permissions) ? permissions : []

  const isAdminRole = useMemo(() => {
    const primary = (user?.primary_role ?? user?.roles?.[0] ?? '').toString().toLowerCase()
    return primary === 'admin'
  }, [user])

  const hasPermission = useCallback(
    (resource, action) => {
      const perm = RESOURCE_ACTION_TO_PERMISSION[resource]?.[action]
      if (!perm) return false
      return isAdminRole || perms.includes(perm)
    },
    [isAdminRole, perms],
  )

  return { hasPermission, permissions: perms, user, isAdminRole }
}
