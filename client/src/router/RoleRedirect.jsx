import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function RoleRedirect() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  switch (user.ruolo) {
    case 'cliente':
      return <Navigate to="/dashboard" replace />
    case 'consulente':
      return <Navigate to="/consulente" replace />
    case 'super_admin':
      return <Navigate to="/admin" replace />
    default:
      return <Navigate to="/login" replace />
  }
}
