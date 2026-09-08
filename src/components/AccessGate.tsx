import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

function LoadingAccess() {
  return <div className="skeleton mx-auto h-40 max-w-lg rounded-3xl" />
}

export function RequireViewer({ children }: { children: ReactNode }) {
  const { configured, isDlrUser, loading, session } = useAuth()
  const location = useLocation()

  if (!configured) return children
  if (loading) return <LoadingAccess />
  if (!session || !isDlrUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return children
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { admin, configured, isDlrUser, loading, session } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingAccess />
  if (!configured) return <Navigate to="/" replace />
  if (!session || !isDlrUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!admin) return <Navigate to="/" replace />
  return children
}
