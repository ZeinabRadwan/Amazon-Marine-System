import { Navigate, useLocation } from 'react-router-dom'
import { useAuthAccess } from '../hooks/useAuthAccess'

export default function RequirePageAccess({ pageKey, children, fallbackPath = '/' }) {
  const location = useLocation()
  const { hasPageAccess } = useAuthAccess()

  if (!pageKey) return children
  if (hasPageAccess(pageKey)) return children

  return <Navigate to={fallbackPath} replace state={{ from: location.pathname, deniedPage: pageKey }} />
}

