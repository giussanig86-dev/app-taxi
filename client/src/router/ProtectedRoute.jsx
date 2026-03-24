import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-main">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.ruolo)) {
    return <Navigate to="/" replace />
  }

  return children
}
