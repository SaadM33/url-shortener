import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'

import { ApiError } from '@/api/client'
import { keys } from '@/api/queries'
import { router } from '@/router'

import './index.css'

/** A 401 anywhere means the session is gone: drop the user so the guards redirect to /login. */
function onAuthError(error: unknown, expectsUnauthorized?: unknown) {
  if (error instanceof ApiError && error.status === 401 && !expectsUnauthorized) {
    queryClient.setQueryData(keys.me, null)
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => query.queryKey[0] !== 'me' && onAuthError(error),
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => onAuthError(error, mutation.meta?.expectsUnauthorized),
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // retry network/5xx hiccups, never 4xx: those won't fix themselves
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster richColors closeButton position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
)
