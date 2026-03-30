/**
 * Permission System — Unit Tests
 *
 * Tests all role-based access control (RBAC) logic across:
 *  - Role detection (isAdminRole, isAccountant, isOperations)
 *  - Page access control (hasPageAccess)
 *  - Granular action permissions (hasPermission)
 *  - Sidebar section visibility
 *  - Accounting tab visibility & ordering
 *  - Attendance tab visibility & default section
 *  - SD Forms action button visibility
 */
import { describe, it, expect } from 'vitest'
import { ROLE_ID } from '../constants/roles'
import {
  getRoleId,
  computeIsAdminRole,
  computeIsAccountant,
  computeIsOperations,
  computeHasPageAccess,
  computeHasPermission,
  getVisibleSidebarSections,
  getAccountingTabs,
  getDefaultAccountingTab,
  getAttendanceTabs,
  getDefaultAttendanceSection,
  canShowSendToOpsButton,
  canShowEmailToOpsButton,
} from './permissionHelpers'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ALL_SECTIONS = ['main', 'clients', 'operations', 'financial', 'management', 'hr', 'system']

const makeUser = (role_id, extra = {}) => ({ role_id, ...extra })

const adminUser = makeUser(ROLE_ID.ADMIN)          // role_id: 1
const salesManagerUser = makeUser(ROLE_ID.SALES_MANAGER) // role_id: 2
const salesUser = makeUser(ROLE_ID.SALES)          // role_id: 3
const accountantUser = makeUser(ROLE_ID.ACCOUNTANT) // role_id: 4
const pricingUser = makeUser(ROLE_ID.PRICING)      // role_id: 5
const opsUser = makeUser(ROLE_ID.OPERATIONS)        // role_id: 6
const supportUser = makeUser(ROLE_ID.SUPPORT)       // role_id: 7

// Admin using alternate name-based detection (no role_id)
const adminByNameUser = { primary_role: 'admin', role_id: undefined }

// API-style permissions array
const samplePermissions = [
  { page: 'dashboard', can_view: true, can_edit: false, can_send: false },
  { page: 'clients', can_view: true, can_edit: true, can_send: false },
  { page: 'sd_forms', can_view: true, can_edit: false, can_send: true },
  { page: 'accountings', can_view: false, can_edit: false, can_send: false },
]

// ─── 1. Role ID resolution ────────────────────────────────────────────────────

describe('getRoleId()', () => {
  it('reads role_id directly from user object', () => {
    expect(getRoleId(adminUser)).toBe(1)
    expect(getRoleId(accountantUser)).toBe(4)
    expect(getRoleId(opsUser)).toBe(6)
  })

  it('falls back to roles[0].id when role_id is absent', () => {
    const u = { roles: [{ id: 3, name: 'sales' }] }
    expect(getRoleId(u)).toBe(3)
  })

  it('falls back to role.id as last resort', () => {
    const u = { role: { id: 5 } }
    expect(getRoleId(u)).toBe(5)
  })

  it('returns undefined for a user with no role information', () => {
    expect(getRoleId({})).toBeUndefined()
    expect(getRoleId(null)).toBeUndefined()
  })
})

// ─── 2. isAdminRole ───────────────────────────────────────────────────────────

describe('computeIsAdminRole()', () => {
  it('returns true for role_id = 1 (System Manager)', () => {
    expect(computeIsAdminRole(adminUser)).toBe(true)
  })

  it('returns true when primary_role is "admin" (name-based detection)', () => {
    expect(computeIsAdminRole(adminByNameUser)).toBe(true)
  })

  it('returns false for sales (role 3)', () => {
    expect(computeIsAdminRole(salesUser)).toBe(false)
  })

  it('returns false for accountant (role 4)', () => {
    expect(computeIsAdminRole(accountantUser)).toBe(false)
  })

  it('returns false for operations (role 6)', () => {
    expect(computeIsAdminRole(opsUser)).toBe(false)
  })

  it('returns false for null/undefined user', () => {
    expect(computeIsAdminRole(null)).toBe(false)
    expect(computeIsAdminRole(undefined)).toBe(false)
  })
})

// ─── 3. isAccountant ─────────────────────────────────────────────────────────

describe('computeIsAccountant()', () => {
  it('returns true for role_id = 4', () => {
    expect(computeIsAccountant(accountantUser)).toBe(true)
  })

  it('returns false for admin (role 1)', () => {
    expect(computeIsAccountant(adminUser)).toBe(false)
  })

  it('returns false for operations (role 6)', () => {
    expect(computeIsAccountant(opsUser)).toBe(false)
  })

  it('returns false for null user', () => {
    expect(computeIsAccountant(null)).toBe(false)
  })
})

// ─── 4. isOperations ─────────────────────────────────────────────────────────

describe('computeIsOperations()', () => {
  it('returns true for role_id = 6', () => {
    expect(computeIsOperations(opsUser)).toBe(true)
  })

  it('returns false for sales (role 3)', () => {
    expect(computeIsOperations(salesUser)).toBe(false)
  })

  it('returns false for accountant (role 4)', () => {
    expect(computeIsOperations(accountantUser)).toBe(false)
  })

  it('returns false for admin (role 1)', () => {
    expect(computeIsOperations(adminUser)).toBe(false)
  })
})

// ─── 5. Page Access (hasPageAccess) ──────────────────────────────────────────

describe('computeHasPageAccess()', () => {
  const allowedPages = ['dashboard', 'clients', 'sd_forms']

  it('admin always gets access regardless of allowedPages', () => {
    expect(computeHasPageAccess(adminUser, [], 'anything')).toBe(true)
    expect(computeHasPageAccess(adminUser, [], 'invoices')).toBe(true)
  })

  it('returns true when page is in allowedPages', () => {
    expect(computeHasPageAccess(salesUser, allowedPages, 'clients')).toBe(true)
    expect(computeHasPageAccess(salesUser, allowedPages, 'sd_forms')).toBe(true)
  })

  it('returns false when page is NOT in allowedPages', () => {
    expect(computeHasPageAccess(salesUser, allowedPages, 'invoices')).toBe(false)
    expect(computeHasPageAccess(accountantUser, allowedPages, 'attendance')).toBe(false)
  })

  it('returns false for empty pageKey', () => {
    expect(computeHasPageAccess(salesUser, allowedPages, '')).toBe(false)
    expect(computeHasPageAccess(salesUser, allowedPages, null)).toBe(false)
  })

  it('returns false when allowedPages is empty and user is not admin', () => {
    expect(computeHasPageAccess(opsUser, [], 'dashboard')).toBe(false)
  })
})

// ─── 6. Granular Permissions (hasPermission) ──────────────────────────────────

describe('computeHasPermission()', () => {
  it('admin always has permission regardless of permissions array', () => {
    expect(computeHasPermission(adminUser, [], 'any_page', 'can_send')).toBe(true)
    expect(computeHasPermission(adminUser, [], 'sd_forms', 'can_delete')).toBe(true)
  })

  it('returns true when page permission key is true', () => {
    expect(computeHasPermission(salesUser, samplePermissions, 'sd_forms', 'can_send')).toBe(true)
    expect(computeHasPermission(salesUser, samplePermissions, 'clients', 'can_edit')).toBe(true)
  })

  it('returns false when page permission key is false', () => {
    expect(computeHasPermission(salesUser, samplePermissions, 'dashboard', 'can_edit')).toBe(false)
    expect(computeHasPermission(salesUser, samplePermissions, 'sd_forms', 'can_edit')).toBe(false)
  })

  it('returns false when page is not found in permissions', () => {
    expect(computeHasPermission(salesUser, samplePermissions, 'treasury', 'can_view')).toBe(false)
  })

  it('returns false when page has can_view: false', () => {
    expect(computeHasPermission(opsUser, samplePermissions, 'accountings', 'can_view')).toBe(false)
  })
})

// ─── 7. Sidebar Section Visibility ───────────────────────────────────────────

describe('getVisibleSidebarSections() — Accountant Rule', () => {
  it('Accountant sees ONLY the financial section', () => {
    const visible = getVisibleSidebarSections(accountantUser, ALL_SECTIONS, [])
    expect(visible).toEqual(['financial'])
    expect(visible).not.toContain('clients')
    expect(visible).not.toContain('hr')
    expect(visible).not.toContain('management')
  })

  it('Admin sees ALL sections', () => {
    const visible = getVisibleSidebarSections(adminUser, ALL_SECTIONS, [])
    expect(visible).toEqual(ALL_SECTIONS)
  })

  it('Sales sees all sections (filtered by allowedPages at item level, not section level)', () => {
    const visible = getVisibleSidebarSections(salesUser, ALL_SECTIONS, ['dashboard', 'clients'])
    expect(visible).toEqual(ALL_SECTIONS)
  })

  it('Operations sees all sections (no section-level restriction)', () => {
    const visible = getVisibleSidebarSections(opsUser, ALL_SECTIONS, [])
    expect(visible).toEqual(ALL_SECTIONS)
  })
})

// ─── 8. Accounting Tabs ───────────────────────────────────────────────────────

describe('Accounting tabs — Accountant Rule', () => {
  describe('getAccountingTabs()', () => {
    it('Accountant sees only "partners" tab', () => {
      const tabs = getAccountingTabs(accountantUser)
      expect(tabs).toEqual(['partners'])
      expect(tabs).not.toContain('clients')
      expect(tabs).not.toContain('bank')
    })

    it('Admin sees all three tabs', () => {
      const tabs = getAccountingTabs(adminUser)
      expect(tabs).toContain('clients')
      expect(tabs).toContain('partners')
      expect(tabs).toContain('bank')
    })

    it('Sales sees all three tabs', () => {
      const tabs = getAccountingTabs(salesUser)
      expect(tabs).toContain('clients')
      expect(tabs).toContain('partners')
      expect(tabs).toContain('bank')
    })
  })

  describe('getDefaultAccountingTab()', () => {
    it('Accountant defaults to "partners"', () => {
      expect(getDefaultAccountingTab(accountantUser)).toBe('partners')
    })

    it('Admin defaults to "clients"', () => {
      expect(getDefaultAccountingTab(adminUser)).toBe('clients')
    })

    it('Sales defaults to "clients"', () => {
      expect(getDefaultAccountingTab(salesUser)).toBe('clients')
    })

    it('Operations defaults to "clients"', () => {
      expect(getDefaultAccountingTab(opsUser)).toBe('clients')
    })
  })
})

// ─── 9. Attendance Tabs ───────────────────────────────────────────────────────

describe('Attendance tabs — Admin Rule', () => {
  describe('getAttendanceTabs()', () => {
    it('Admin sees only the "admin" tab (no personal recording)', () => {
      const tabs = getAttendanceTabs(adminUser)
      expect(tabs).toEqual(['admin'])
      expect(tabs).not.toContain('my')
      expect(tabs).not.toContain('excuses')
    })

    it('Admin by name also sees only the "admin" tab', () => {
      const tabs = getAttendanceTabs(adminByNameUser)
      expect(tabs).toEqual(['admin'])
    })

    it('Sales (regular user) sees personal tabs only', () => {
      const tabs = getAttendanceTabs(salesUser)
      expect(tabs).toContain('my')
      expect(tabs).toContain('excuses')
      expect(tabs).not.toContain('admin')
    })

    it('Operations sees personal tabs only', () => {
      const tabs = getAttendanceTabs(opsUser)
      expect(tabs).toContain('my')
      expect(tabs).toContain('excuses')
      expect(tabs).not.toContain('admin')
    })

    it('Accountant sees personal tabs only', () => {
      const tabs = getAttendanceTabs(accountantUser)
      expect(tabs).toContain('my')
      expect(tabs).toContain('excuses')
    })
  })

  describe('getDefaultAttendanceSection()', () => {
    it('Admin defaults to "admin" section', () => {
      expect(getDefaultAttendanceSection(adminUser)).toBe('admin')
    })

    it('Regular user defaults to "my" section', () => {
      expect(getDefaultAttendanceSection(salesUser)).toBe('my')
      expect(getDefaultAttendanceSection(opsUser)).toBe('my')
      expect(getDefaultAttendanceSection(accountantUser)).toBe('my')
      expect(getDefaultAttendanceSection(pricingUser)).toBe('my')
    })
  })
})

// ─── 10. SD Forms — Send/Email to Operations Buttons ─────────────────────────

describe('SD Forms — Send & Email to Operations visibility', () => {
  describe('canShowSendToOpsButton()', () => {
    it('is visible to Sales when status is "submitted"', () => {
      expect(canShowSendToOpsButton(salesUser, 'submitted')).toBe(true)
    })

    it('is visible to Admin when status is "submitted"', () => {
      expect(canShowSendToOpsButton(adminUser, 'submitted')).toBe(true)
    })

    it('is hidden to Operations regardless of status', () => {
      expect(canShowSendToOpsButton(opsUser, 'submitted')).toBe(false)
      expect(canShowSendToOpsButton(opsUser, 'draft')).toBe(false)
    })

    it('is hidden for non-submitted statuses even for Sales', () => {
      expect(canShowSendToOpsButton(salesUser, 'draft')).toBe(false)
      expect(canShowSendToOpsButton(salesUser, 'completed')).toBe(false)
      expect(canShowSendToOpsButton(salesUser, 'cancelled')).toBe(false)
    })

    it('is hidden when status is sent_to_operations (already sent)', () => {
      expect(canShowSendToOpsButton(salesUser, 'sent_to_operations')).toBe(false)
    })
  })

  describe('canShowEmailToOpsButton()', () => {
    it('is visible to Sales', () => {
      expect(canShowEmailToOpsButton(salesUser)).toBe(true)
    })

    it('is visible to Sales Manager', () => {
      expect(canShowEmailToOpsButton(salesManagerUser)).toBe(true)
    })

    it('is visible to Admin', () => {
      expect(canShowEmailToOpsButton(adminUser)).toBe(true)
    })

    it('is HIDDEN from Operations', () => {
      expect(canShowEmailToOpsButton(opsUser)).toBe(false)
    })

    it('is visible to Accountant (no restriction on email ops)', () => {
      expect(canShowEmailToOpsButton(accountantUser)).toBe(true)
    })

    it('is visible to Support', () => {
      expect(canShowEmailToOpsButton(supportUser)).toBe(true)
    })
  })
})

// ─── 11. Edge Cases & Cross-Role Checks ──────────────────────────────────────

describe('Edge cases', () => {
  it('null/undefined user never causes a crash', () => {
    expect(() => computeIsAdminRole(null)).not.toThrow()
    expect(() => computeIsAccountant(undefined)).not.toThrow()
    expect(() => computeIsOperations(null)).not.toThrow()
    expect(() => computeHasPageAccess(null, [], 'dashboard')).not.toThrow()
    expect(() => computeHasPermission(null, [], 'page', 'key')).not.toThrow()
    expect(() => getAttendanceTabs(null)).not.toThrow()
    expect(() => getAccountingTabs(null)).not.toThrow()
  })

  it('a user object with roles array (no role_id) is resolved correctly', () => {
    const u = { roles: [{ id: ROLE_ID.ACCOUNTANT, name: 'accounting' }] }
    expect(computeIsAccountant(u)).toBe(true)
    expect(computeIsAdminRole(u)).toBe(false)
    expect(getDefaultAccountingTab(u)).toBe('partners')
  })

  it('ROLE_ID constants are correct', () => {
    expect(ROLE_ID.ADMIN).toBe(1)
    expect(ROLE_ID.SALES_MANAGER).toBe(2)
    expect(ROLE_ID.SALES).toBe(3)
    expect(ROLE_ID.ACCOUNTANT).toBe(4)
    expect(ROLE_ID.PRICING).toBe(5)
    expect(ROLE_ID.OPERATIONS).toBe(6)
    expect(ROLE_ID.SUPPORT).toBe(7)
  })
})
