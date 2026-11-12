import { Link, isRouteErrorResponse, useRouteError } from 'react-router'

import { buttonClass } from '@/components/ui/buttonClass'
import { useTitle } from '@/hooks/useTitle'

function Message({ code, title, text }: { code: string; title: string; text: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{code}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{text}</p>
      <Link to="/" className={buttonClass('primary', 'md', 'mt-6')}>
        Go home
      </Link>
    </div>
  )
}

export function NotFound() {
  useTitle('Not found')
  return <Message code="404" title="Page not found" text="The page you're looking for doesn't exist or was moved." />
}

export function RouteError() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />
  // a deploy can invalidate lazily loaded chunks; a reload fetches the new ones
  const chunkFailed = error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message)
  return (
    <Message
      code="Error"
      title={chunkFailed ? 'A new version is available' : 'Something went wrong'}
      text={chunkFailed ? 'Reload the page to continue.' : 'An unexpected error occurred. Try reloading the page.'}
    />
  )
}
