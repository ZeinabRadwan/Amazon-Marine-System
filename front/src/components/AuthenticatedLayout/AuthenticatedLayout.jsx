import { useState, useEffect, useMemo, useCallback } from 'react'
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getStoredToken, clearToken } from '../../pages/Login'
import { getProfile, logout as logoutApi } from '../../api/auth'
import AppLayout from '../AppLayout'
import LoaderDots from '../LoaderDots'
import '../LoaderDots/LoaderDots.css'

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
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  const refreshUser = useCallback(() => {
    if (!token) return Promise.resolve()
    return getProfile(token).then((data) => {
      const u = data.user ?? data.data ?? data
      setUser(u)
      setPermissions(Array.isArray(data.permissions) ? data.permissions : [])
      return u
    })
  }, [token])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    getProfile(token)
      .then((data) => {
        if (!cancelled) {
          const u = data.user ?? data.data ?? data
          setUser(u)
          if (Array.isArray(data.permissions)) setPermissions(data.permissions)
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearToken()
          navigate('/login', { replace: true })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token, navigate])

  if (!token) return <Navigate to="/login" replace />

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logoutApi(token)
    } catch {
      // ignore
    } finally {
      clearToken()
      navigate('/login', { replace: true })
    }
    setLoggingOut(false)
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
    '/shipments': 'shipments',
    '/pricing': 'pricing',
    '/invoices': 'invoices',
    '/notifications': 'notifications',
    '/settings': 'settings',
    '/accountings': 'accounts',
    '/treasury': 'treasury',
    '/expenses': 'expenses',
  }
  const activeMenu = pathToMenu[location.pathname] ?? 'dashboard'

  const sidebarUser = user
    ? {
        name: user.name || 'User',
        email: user.email || '',
        avatarUrl: user.avatar_url ?? user.avatarUrl ?? null,
      }
    : { name: 'User', email: '', avatarUrl: null }

  const pageHeaderConfig = useMemo(
    () => getPageHeaderForPath(location.pathname, t),
    [location.pathname, t]
  )

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
      activeMenu={activeMenu}
      onMenuChange={handleMenuChange}
      crmCount={24}
      ticketsCount={7}
      alertsCount={3}
      shipmentsCount={12}
      sdFormsCount={5}
      appName="Amazon Marine"
      onLogout={handleLogout}
      pageTitle={pageHeaderConfig.title}
      pageBreadcrumbs={pageHeaderConfig.breadcrumbs}
    >
      <Outlet context={{ user, permissions, refreshUser }} />
    </AppLayout>
  )
}
