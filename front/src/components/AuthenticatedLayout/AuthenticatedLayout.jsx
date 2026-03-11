import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { getStoredToken, clearToken } from '../../pages/Login'
import { getProfile, logout as logoutApi } from '../../api/auth'
import AppLayout from '../AppLayout'
import LoaderDots from '../LoaderDots'
import '../LoaderDots/LoaderDots.css'

export default function AuthenticatedLayout() {
  const navigate = useNavigate()
  const location = useLocation()
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
    >
      <Outlet />
    </AppLayout>
  )
}
