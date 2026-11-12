import { Outlet } from 'react-router'

import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-16">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}
