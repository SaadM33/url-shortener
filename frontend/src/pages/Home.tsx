import { Navigate } from 'react-router'

import { useMe } from '@/api/queries'
import { FullPageSpinner } from '@/components/ui/Feedback'

export function Home() {
  const { data: user, isPending } = useMe()
  if (isPending) return <FullPageSpinner />
  return <Navigate to={user ? '/dashboard' : '/login'} replace />
}
