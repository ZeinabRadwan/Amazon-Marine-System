import { useCallback, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

import { ROLE_ID } from '../constants/roles'

/**
 * Page-level and specific action gates aligned with backend `permissions` from AuthenticatedLayout.
 *
 * @returns {{ hasPageAccess: (pageKey: string) => boolean, hasPermission: (page: string, key: string) => boolean, hasAbility: (name: string) => boolean, permissions: any[], abilityNames: string[], allowedPages: string[], user: object|undefined, isAdminRole: boolean, isAccountant: boolean, isOperations: boolean, roleId: number|undefined }}
 */
export function useAuthAccess() {
  const {
    user,
    allowedPages = [],
    permissions = [],
    abilityNames: abilityNamesFromContext = [],
    hasPageAccess: hasPageAccessFromContext,
  } = useOutletContext() || {}
  const abilityNames = Array.isArray(abilityNamesFromContext) ? abilityNamesFromContext : []
  const pages = useMemo(() => (Array.isArray(allowedPages) ? allowedPages.filter(Boolean) : []), [allowedPages])
  const pagesSet = useMemo(() => new Set(pages), [pages])

  const roleId = useMemo(() => user?.role_id ?? user?.roles?.[0]?.id ?? user?.role?.id, [user])

  const isAdminRole = useMemo(() => {
    if (roleId === ROLE_ID.ADMIN) return true
    const primary = (user?.primary_role ?? user?.roles?.[0]?.name ?? user?.role?.name ?? '').toString().toLowerCase()
    return primary === 'admin'
  }, [user, roleId])

  const isAccountant = useMemo(() => roleId === ROLE_ID.ACCOUNTANT, [roleId])
  const isOperations = useMemo(() => roleId === ROLE_ID.OPERATIONS, [roleId])

  const hasPageAccess = useCallback(
    (pageKey) => {
      if (typeof hasPageAccessFromContext === 'function') return hasPageAccessFromContext(pageKey)
      if (!pageKey) return false
      if (isAdminRole) return true
      return pagesSet.has(String(pageKey))
    },
    [hasPageAccessFromContext, isAdminRole, pagesSet]
  )

  /**
   * Check for a specific key in permission objects for a given page.
   * Example: hasPermission('sd_forms', 'can_send')
   */
  const hasPermission = useCallback(
    (page, key) => {
      if (isAdminRole) return true
      const perm = permissions.find((p) => p.page === page)
      if (!perm) return false
      return !!perm[key]
    },
    [isAdminRole, permissions]
  )

  const hasAbility = useCallback(
    (name) => {
      if (!name) return false
      if (isAdminRole) return true
      return abilityNames.includes(String(name))
    },
    [isAdminRole, abilityNames]
  )

  return {
    hasPageAccess,
    hasPermission,
    hasAbility,
    permissions,
    abilityNames,
    allowedPages: pages,
    user,
    isAdminRole,
    isAccountant,
    isOperations,
    roleId,
  }
}
