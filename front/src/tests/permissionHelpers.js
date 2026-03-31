/**
 * Permission Logic Test Helpers
 *
 * Pure functions that mirror the logic in useAuthAccess.js and component-level
 * role gates —— without needing React or a DOM renderer.
 * Tests run fast and deterministically.
 */
import { ROLE_ID } from '../constants/roles'

// ─── Mirror of useAuthAccess logic ──────────────────────────────────────────

/** Returns the role ID from a user object (same resolution order as the hook). */
export function getRoleId(user) {
  return user?.role_id ?? user?.roles?.[0]?.id ?? user?.role?.id
}

/** Returns true if the user is an admin (role 1 or primary_role === 'admin'). */
export function computeIsAdminRole(user) {
  if (getRoleId(user) === ROLE_ID.ADMIN) return true
  const primary = (user?.primary_role ?? user?.roles?.[0]?.name ?? user?.role?.name ?? '')
    .toString()
    .toLowerCase()
  return primary === 'admin'
}

/** Returns true if the user is an Accountant (role 4). */
export function computeIsAccountant(user) {
  return getRoleId(user) === ROLE_ID.ACCOUNTANT
}

/** Returns true if the user is an Operations user (role 6). */
export function computeIsOperations(user) {
  return getRoleId(user) === ROLE_ID.OPERATIONS
}

/** Returns true if a given page key is in the allowed pages list (or user is admin). */
export function computeHasPageAccess(user, allowedPages, pageKey) {
  if (!pageKey) return false
  if (computeIsAdminRole(user)) return true
  return allowedPages.includes(String(pageKey))
}

/** Returns true if the user has a specific permission key for a given page (or user is admin). */
export function computeHasPermission(user, permissions, page, key) {
  if (computeIsAdminRole(user)) return true
  const perm = permissions.find((p) => p.page === page)
  if (!perm) return false
  return !!perm[key]
}

// ─── Sidebar section visibility ──────────────────────────────────────────────

/** Returns the section keys visible to the user, applying Accountant rule. */
export function getVisibleSidebarSections(user, allSectionKeys, allowedPages) {
  const isAccountant = computeIsAccountant(user)
  return allSectionKeys.filter((sectionKey) => {
    if (isAccountant && sectionKey !== 'financial') return false
    return true
  })
}

// ─── Accountings tab order ────────────────────────────────────────────────────

const ALL_ACCOUNTING_TABS = ['clients', 'partners', 'bank']

/** Returns the tabs visible and in correct order for the user's role. */
export function getAccountingTabs(user) {
  const isAccountant = computeIsAccountant(user)
  const visible = ALL_ACCOUNTING_TABS.filter((id) => {
    if (isAccountant && id !== 'partners') return false
    return true
  })
  if (isAccountant) return visible // already only 'partners'
  return visible
}

/** Returns the default Accounting active tab for the user. */
export function getDefaultAccountingTab(user) {
  return computeIsAccountant(user) ? 'partners' : 'clients'
}

// ─── Attendance tab visibility ────────────────────────────────────────────────

/** Returns the visible attendance section tab IDs for the user. */
export function getAttendanceTabs(user) {
  if (computeIsAdminRole(user)) return ['admin']
  return ['my', 'excuses']
}

/** Returns the default Attendance active section for the user. */
export function getDefaultAttendanceSection(user) {
  return computeIsAdminRole(user) ? 'admin' : 'my'
}

// ─── SD Forms action visibility ───────────────────────────────────────────────

/** Returns whether the "Send to Operations" button should be shown. */
export function canShowSendToOpsButton(user, sdFormStatus) {
  if (computeIsOperations(user)) return false
  return sdFormStatus === 'submitted'
}

/** Returns whether the "Email to Operations" button should be shown. */
export function canShowEmailToOpsButton(user) {
  return !computeIsOperations(user)
}
