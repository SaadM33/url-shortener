import { createBrowserRouter } from 'react-router'

import { GuestOnly, RequireAdmin, RequireAuth } from '@/auth/guards'
import { FullPageSpinner } from '@/components/ui/Feedback'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { NotFound, RouteError } from '@/pages/Errors'
import { Home } from '@/pages/Home'

/** Route-level code splitting: each page (and recharts) loads only when visited. */
const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default })

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    hydrateFallbackElement: <FullPageSpinner />,
    children: [
      { path: '/', element: <Home /> },
      {
        element: <AuthLayout />,
        children: [
          {
            element: <GuestOnly />,
            children: [
              { path: '/login', lazy: page(() => import('@/pages/Login')) },
              { path: '/register', lazy: page(() => import('@/pages/Register')) },
              { path: '/forgot-password', lazy: page(() => import('@/pages/ForgotPassword')) },
            ],
          },
          { path: '/reset-password', lazy: page(() => import('@/pages/ResetPassword')) },
          { path: '/verify-email', lazy: page(() => import('@/pages/VerifyEmail')) },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/dashboard', lazy: page(() => import('@/pages/Dashboard')) },
              { path: '/links', lazy: page(() => import('@/pages/Links')) },
              { path: '/links/:code', lazy: page(() => import('@/pages/LinkDetail')) },
              { path: '/settings', lazy: page(() => import('@/pages/Settings')) },
              {
                element: <RequireAdmin />,
                children: [
                  { path: '/admin', lazy: page(() => import('@/pages/admin/AdminOverview')) },
                  { path: '/admin/users', lazy: page(() => import('@/pages/admin/AdminUsers')) },
                  { path: '/admin/links', lazy: page(() => import('@/pages/admin/AdminLinks')) },
                ],
              },
              { path: '*', element: <NotFound /> },
            ],
          },
        ],
      },
    ],
  },
])
