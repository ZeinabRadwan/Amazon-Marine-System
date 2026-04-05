import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getStoredToken, clearToken } from '../../pages/Login'
import { getProfile, logout as logoutApi } from '../../api/auth'
import { getApiBaseUrl } from '../../api/apiBaseUrl'
import { getUnreadCount } from '../../api/notifications'
import { getPermissionsByRole } from '../../api/roles'
import AppLayout from '../AppLayout'
import LoaderDots from '../LoaderDots'
import '../LoaderDots/LoaderDots.css'
import { ROLE_ID } from '../../constants/roles'

const PAGE_ACCESS_CACHE_KEY = 'am.pageAccess.v1'

function readPageAccessCache() {
  try {
    const raw = localStorage.getItem(PAGE_ACCESS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (!Array.isArray(parsed.allowedPages)) return null
    return parsed
  } catch {
    return null
  }
}

function writePageAccessCache(payload) {
  try {
    localStorage.setItem(PAGE_ACCESS_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore storage failures (private mode / quota)
  }
}

function getPageHeaderForPath(pathname, t) {
  const home = { label: t('pageHeader.home'), href: '/' }
  switch (pathname) {
    case '/':
      return { title: t('pageHeader.dashboard'), breadcrumbs: [home] }
    case '/profile':
      return { title: t('profile.title'), breadcrumbs: [home, { label: t('profile.title') }] }
    case '/users':
      return { title: t('users.title'), breadcrumbs: [home, { label: t('users.title') }] }
    case '/roles-permissions':
      return { title: t('rolesPermissions.title'), breadcrumbs: [home, { label: t('rolesPermissions.title') }] }
    case '/user-permissions':
      return { title: t('userPermissions.title'), breadcrumbs: [home, { label: t('userPermissions.title') }] }
    case '/clients':
      return { title: t('clients.title'), breadcrumbs: [home, { label: t('clients.title') }] }
    case '/visits':
      return { title: t('visits.title'), breadcrumbs: [home, { label: t('visits.title') }] }
    case '/vendors':
      return { title: t('vendors.title'), breadcrumbs: [home, { label: t('vendors.title') }] }
    case '/client-lookups':
      return { title: t('clientLookups.title'), breadcrumbs: [home, { label: t('clientLookups.title') }] }
    case '/attendance':
      return { title: t('attendance.title'), breadcrumbs: [home, { label: t('attendance.title') }] }
    case '/sd-forms':
      return { title: t('sdForms.title'), breadcrumbs: [home, { label: t('sdForms.title') }] }
    case '/sd-forms/declaration':
      return {
        title: t('sdForms.declaration.pageTitle'),
        breadcrumbs: [
          home,
          { label: t('sdForms.title'), href: '/sd-forms' },
          { label: t('sdForms.declaration.pageTitle') },
        ],
      }
    case '/shipments':
      return { title: t('shipments.title'), breadcrumbs: [home, { label: t('shipments.title') }] }
    case '/pricing':
      return { title: t('pricing.title', 'Pricing'), breadcrumbs: [home, { label: t('pricing.title', 'Pricing') }] }
    case '/invoices':
      return { title: t('invoices.title', 'Invoices'), breadcrumbs: [home, { label: t('invoices.title', 'Invoices') }] }
    case '/notifications':
      return { title: t('notifications.title'), breadcrumbs: [home, { label: t('notifications.title') }] }
    case '/customer-services':
      return { title: t('customerServices.title'), breadcrumbs: [home, { label: t('customerServices.title') }] }
    case '/settings':
      return { title: t('settings.title'), breadcrumbs: [home, { label: t('settings.title') }] }
    case '/reports':
      return { title: t('reports.title', 'Reports'), breadcrumbs: [home, { label: t('reports.title', 'Reports') }] }
    case '/official-documents':
      return { title: t('sidebar.menu.officialDocuments'), breadcrumbs: [home, { label: t('sidebar.menu.officialDocuments') }] }
    default:
      return { title: t('pageHeader.dashboard'), breadcrumbs: [home] }
    case '/accountings':
      return { title: t('accountings.title'), breadcrumbs: [home, { label: t('accountings.title') }] }
    case '/treasury':
      return { title: t('treasury.title'), breadcrumbs: [home, { label: t('treasury.title') }] }
    case '/expenses':
      return { title: t('expensesPage.title'), breadcrumbs: [home, { label: t('expensesPage.title') }] }
  }
}

export default function AuthenticatedLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const token = getStoredToken()
  const [user, setUser] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [allowedPages, setAllowedPages] = useState(() => readPageAccessCache()?.allowedPages ?? [])
  const [pageAccessVersion, setPageAccessVersion] = useState(() => readPageAccessCache()?.pageAccessVersion ?? '')
  const [loading, setLoading] = useState(true)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  const refreshUser = useCallback(() => {
    if (!token) return Promise.resolve()
    return getProfile(token).then(async (data) => {
      const u = data.user ?? data.data ?? data
      setUser(u)
      
      const roleId = u?.role_id
      let finalPermissions = Array.isArray(data.permissions) ? data.permissions : []
      let finalPages = Array.isArray(data.page_access) ? data.page_access.filter(Boolean) : []

      if (roleId) {
        try {
          const permRes = await getPermissionsByRole(token, roleId)
          if (permRes?.data) {
            finalPermissions = permRes.data
            // If can_view is true, the user can see the page
            finalPages = permRes.data
              .filter(p => p.can_view === true || p.can_view === 1)
              .map(p => p.page)
          }
        } catch (err) {
          console.error('Failed to fetch permissions by role:', err)
        }
      }

      setPermissions(finalPermissions)
      setAllowedPages(finalPages)
      const v = typeof data.page_access_version === 'string' ? data.page_access_version : ''
      setPageAccessVersion(v)
      
      writePageAccessCache({
        allowedPages: finalPages,
        pageAccessVersion: v,
        userId: u?.id ?? null,
        roleId: u?.role_id ?? null,
      })
      return u
    })
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)

    const init = async () => {
      try {
        const data = await getProfile(token)
        if (cancelled) return

        const u = data.user ?? data.data ?? data
        setUser(u)
        
        const roleId = u?.role_id
        let finalPermissions = Array.isArray(data.permissions) ? data.permissions : []
        let finalPages = Array.isArray(data.page_access) ? data.page_access.filter(Boolean) : []

        if (roleId) {
          try {
            const permRes = await getPermissionsByRole(token, roleId)
            if (permRes?.data) {
              finalPermissions = permRes.data
              finalPages = permRes.data
                .filter(p => p.can_view === true || p.can_view === 1)
                .map(p => p.page)
            }
          } catch (err) {
            console.error('Failed to fetch permissions by role:', err)
          }
        }

        if (!cancelled) {
          setPermissions(finalPermissions)
          setAllowedPages(finalPages)
          const v = typeof data.page_access_version === 'string' ? data.page_access_version : ''
          setPageAccessVersion(v)
          writePageAccessCache({
            allowedPages: finalPages,
            pageAccessVersion: v,
            userId: u?.id ?? null,
            roleId: u?.role_id ?? null,
          })
        }
      } catch {
        if (!cancelled) {
          clearToken()
          navigate('/login', { replace: true })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [token, navigate])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const loadUnread = async () => {
      try {
        const res = await getUnreadCount(token)
        if (cancelled) return
        const count = res.unread_count ?? res.count ?? res.data?.unread_count ?? res.data?.count ?? 0
        setUnreadNotifications(Number(count))
      } catch {
        if (!cancelled) setUnreadNotifications(0)
      }
    }

    loadUnread()

    const interval = window.setInterval(loadUnread, 60000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [token])

  // ── Global 401 handler (backend idle-logout or expired token) ─────────────
  useEffect(() => {
    const onSessionExpired = () => {
      clearToken()
      navigate('/login', { replace: true })
    }
    window.addEventListener('am:session:expired', onSessionExpired)
    return () => window.removeEventListener('am:session:expired', onSessionExpired)
  }, [navigate])

  // ── Frontend idle timer ───────────────────────────────────────────────────
  // Proactively logs the user out when they haven't interacted for
  // idle_logout_minutes without requiring an API call to be in-flight.
  const idleTimerRef = useRef(null)
  useEffect(() => {
    if (!token) return

    let idleMs = 30 * 60 * 1000 // default 30 min

    // Fetch the setting from the backend once
    const apiBase = getApiBaseUrl()
    fetch(`${apiBase}/settings`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })
      .then((r) => r.json())
      .then((data) => {
        const minutes = data?.data?.sessions?.idle_logout_minutes ?? data?.sessions?.idle_logout_minutes
        if (minutes && Number(minutes) > 0) {
          idleMs = Number(minutes) * 60 * 1000
        }
      })
      .catch(() => {})

    const logout = () => {
      clearToken()
      navigate('/login', { replace: true })
    }

    const resetTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(logout, idleMs)
    }

    // Start the timer immediately
    resetTimer()

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  }, [token, navigate])

  const handleLogout = async () => {
    try {
      await logoutApi(token)
    } catch {
      // ignore
    } finally {
      clearToken()
      navigate('/login', { replace: true })
    }
  }

  const handleMenuChange = (id) => {
    if (id === 'profile') {
      navigate('/profile')
      return
    }
    if (id === 'dashboard') {
      navigate('/')
      return
    }
    if (id === 'users') {
      navigate('/users')
      return
    }
    if (id === 'rolesPermissions') {
      navigate('/roles-permissions')
      return
    }
    if (id === 'usersPermissions') {
      navigate('/user-permissions')
      return
    }
    if (id === 'clientsCrm') {
      navigate('/clients')
      return
    }
    if (id === 'visitLog') {
      navigate('/visits')
      return
    }
    if (id === 'partners') {
      navigate('/vendors')
      return
    }
    if (id === 'clientLookups') {
      navigate('/client-lookups')
      return
    }
    if (id === 'attendance') {
      navigate('/attendance')
      return
    }
    if (id === 'sdForms') {
      navigate('/sd-forms')
      return
    }
    if (id === 'shipments') {
      navigate('/shipments')
      return
    }
    if (id === 'pricing') {
      navigate('/pricing')
      return
    }
    if (id === 'invoices') {
      navigate('/invoices')
      return
    }
    if (id === 'notifications') {
      navigate('/notifications')
      return
    }
    if (id === 'customerService') {
      navigate('/customer-services')
      return
    }
    if (id === 'settings') {
      navigate('/settings')
      return
    }
    if (id === 'accounts') {
      navigate('/accountings')
      return
    }
    if (id === 'treasury') {
      navigate('/treasury')
      return
    }
    if (id === 'expenses') {
      navigate('/expenses')
      return
    }
    if (id === 'reports') {
      navigate('/reports')
      return
    }
    if (id === 'officialDocuments') {
      navigate('/official-documents')
      return
    }
    if (id === 'adminNotifications') {
      navigate('/admin/notifications')
      return
    }
  }

  const pathToMenu = {
    '/': 'dashboard',
    '/profile': 'profile',
    '/users': 'users',
    '/roles-permissions': 'rolesPermissions',
    '/user-permissions': 'usersPermissions',
    '/clients': 'clientsCrm',
    '/visits': 'visitLog',
    '/vendors': 'partners',
    '/client-lookups': 'clientLookups',
    '/customer-services': 'customerService',
    '/attendance': 'attendance',
    '/sd-forms': 'sdForms',
    '/sd-forms/declaration': 'sdForms',
    '/shipments': 'shipments',
    '/pricing': 'pricing',
    '/invoices': 'invoices',
    '/notifications': 'notifications',
    '/settings': 'settings',
    '/admin/notifications': 'adminNotifications',
    '/accountings': 'accounts',
    '/treasury': 'treasury',
    '/expenses': 'expenses',
    '/reports': 'reports',
    '/official-documents': 'officialDocuments',
  }
  const activeMenu = pathToMenu[location.pathname] ?? 'dashboard'

  const sidebarUser = user
    ? (() => {
        const rawAvatar = user.avatar_url ?? user.avatarUrl ?? null
        let avatarUrl = null
        if (rawAvatar) {
          if (/^https?:\/\//i.test(rawAvatar)) {
            avatarUrl = rawAvatar
          } else if (rawAvatar.startsWith('/')) {
            const apiBase = getApiBaseUrl()
            const origin = apiBase.replace(/\/api\/v1\/?$/, '')
            avatarUrl = `${origin}${rawAvatar}`
          } else {
            avatarUrl = rawAvatar
          }
        }
        return {
          name: user.name || 'User',
          email: user.email || '',
          avatarUrl,
        }
      })()
    : { name: 'User', email: '', avatarUrl: null }

  const pageHeaderConfig = useMemo(
    () => getPageHeaderForPath(location.pathname, t),
    [location.pathname, t]
  )

  const allowedPagesSet = useMemo(
    () => new Set(Array.isArray(allowedPages) ? allowedPages.filter(Boolean) : []),
    [allowedPages]
  )
  const isAdminRole = useMemo(() => {
    const rid = user?.role_id ?? user?.roles?.[0]?.id ?? user?.role?.id
    if (rid === ROLE_ID.ADMIN) return true
    const primary = (user?.primary_role ?? user?.roles?.[0]?.name ?? user?.role?.name ?? '').toString().toLowerCase()
    return primary === 'admin'
  }, [user])
  const hasPageAccess = useCallback((pageKey) => {
    if (!pageKey) return false
    return allowedPagesSet.has(String(pageKey))
  }, [allowedPagesSet])

  if (!token) return <Navigate to="/login" replace />

  if (loading) {
    return (
      <div className="app-layout" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }} aria-label="Loading">
        <LoaderDots />
      </div>
    )
  }

  return (
    <AppLayout
      user={sidebarUser}
      isAdminRole={isAdminRole}
      activeMenu={activeMenu}
      onMenuChange={handleMenuChange}
      allowedPages={allowedPages}
      crmCount={24}
      ticketsCount={7}
      alertsCount={unreadNotifications}
      shipmentsCount={12}
      sdFormsCount={5}
      appName="Amazon Marine"
      onLogout={handleLogout}
      pageTitle={pageHeaderConfig.title}
      pageBreadcrumbs={pageHeaderConfig.breadcrumbs}
    >
      <Outlet context={{ user, permissions, refreshUser, allowedPages, pageAccessVersion, hasPageAccess }} />
    </AppLayout>
  )
}
