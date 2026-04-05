import { Navigate, useLocation } from 'react-router-dom'
import { useAuthAccess } from '../hooks/useAuthAccess'

/**
 * Restricts children to system admin (role id 1 or primary role name "admin").
 */
export default function RequireAdmin({ children, fallbackPath = '/' }) {
  const location = useLocation()
  const { isAdminRole } = useAuthAccess()

  if (isAdminRole) return children

  return <Navigate to={fallbackPath} replace state={{ from: location.pathname, denied: 'admin' }} />
}
