import { Navigate, Outlet, useLocation } from 'react-router'

import { useMe } from '@/api/queries'
import { ErrorState, FullPageSpinner } from '@/components/ui/Feedback'
import { safeNext } from '@/lib/safeNext'

/** Only lets logged-in users through; others go to /login and come back afterwards. */
export function RequireAuth() {
  const { data: user, isPending, error, refetch } = useMe()
  const location = useLocation()

  if (isPending) return <FullPageSpinner />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!user) {
    const next = location.pathname + location.search
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <Outlet />
}

export function RequireAdmin() {
  const { data: user } = useMe()
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <Outlet />
}

/** Login/register pages: send already-logged-in users onward. */
export function GuestOnly() {
  const { data: user, isPending } = useMe()
  const location = useLocation()
  if (isPending) return <FullPageSpinner />
  if (user) return <Navigate to={safeNext(new URLSearchParams(location.search).get('next'))} replace />
  return <Outlet />
}
