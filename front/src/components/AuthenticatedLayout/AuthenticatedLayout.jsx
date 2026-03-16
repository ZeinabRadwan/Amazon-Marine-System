import { useState, useEffect, useMemo } from 'react'
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
    case '/client-lookups':
      return { title: t('clientLookups.title'), breadcrumbs: [home, { label: t('clientLookups.title') }] }
    default:
      return { title: t('pageHeader.dashboard'), breadcrumbs: [home] }
  }
}

export default function AuthenticatedLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const token = getStoredToken()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    getProfile(token)
      .then((data) => {
        if (!cancelled) {
          const u = data.user ?? data.data ?? data
          setUser(u)
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
    if (id === 'clientLookups') {
      navigate('/client-lookups')
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
    '/client-lookups': 'clientLookups',
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
      <Outlet context={{ user }} />
    </AppLayout>
  )
}
