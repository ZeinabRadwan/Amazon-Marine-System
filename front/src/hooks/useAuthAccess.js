import { useCallback, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'

/**
 * Page-level UI gates aligned with backend `page_access` from AuthenticatedLayout.
 *
 * @returns {{ hasPageAccess: (pageKey: string) => boolean, allowedPages: string[], user: object|undefined, isAdminRole: boolean }}
 */
export function useAuthAccess() {
  const { user, allowedPages = [], hasPageAccess: hasPageAccessFromContext } = useOutletContext() || {}
  const pages = useMemo(() => (Array.isArray(allowedPages) ? allowedPages.filter(Boolean) : []), [allowedPages])
  const pagesSet = useMemo(() => new Set(pages), [pages])

  const isAdminRole = useMemo(() => {
    const primary = (user?.primary_role ?? user?.roles?.[0] ?? '').toString().toLowerCase()
    return primary === 'admin'
  }, [user])

  const hasPageAccess = useCallback(
    (pageKey) => {
      if (typeof hasPageAccessFromContext === 'function') return hasPageAccessFromContext(pageKey)
      if (!pageKey) return false
      if (isAdminRole) return true
      return pagesSet.has(String(pageKey))
    },
    [hasPageAccessFromContext, isAdminRole, pagesSet]
  )

  return { hasPageAccess, allowedPages: pages, user, isAdminRole }
}
