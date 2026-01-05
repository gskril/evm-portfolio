import { Navigate } from 'react-router-dom'

import { useAuthStatus } from '@/hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: authStatus, isLoading } = useAuthStatus()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // If password not set, redirect to setup
  if (!authStatus?.passwordSet) {
    return <Navigate to="/setup" replace />
  }

  // If password is set but not authenticated, redirect to login
  if (!authStatus?.authenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
