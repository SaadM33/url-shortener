import { BarChart3, LayoutDashboard, Link2, LogOut, Menu, Settings, Shield, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { useLogout, useMe } from '@/api/queries'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { useSessionKeepAlive } from '@/hooks/useSessionKeepAlive'
import { cn } from '@/lib/cn'

const main = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/links', label: 'Links', icon: Link2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]
const admin = [
  { to: '/admin', label: 'Overview', icon: BarChart3, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/links', label: 'Moderation', icon: Shield },
]

function NavItem({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof Link2; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
        )
      }
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </NavLink>
  )
}

export function AppLayout() {
  const { data: user } = useMe()
  const logout = useLogout()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useSessionKeepAlive(!!user)
  useEffect(() => setMenuOpen(false), [location.pathname])

  async function onLogout() {
    await logout.mutateAsync().catch(() => undefined)
    toast.success('Logged out')
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-6 p-4" aria-label="Main">
      <div className="space-y-1">{main.map((item) => <NavItem key={item.to} {...item} />)}</div>
      {user?.role === 'admin' && (
        <div className="space-y-1">
          <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">Admin</p>
          {admin.map((item) => <NavItem key={item.to} {...item} />)}
        </div>
      )}
      <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="truncate px-3 text-sm font-medium">{user?.username}</p>
        <p className="truncate px-3 text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
        <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={onLogout} loading={logout.isPending} icon={<LogOut className="size-4" />}>
          Log out
        </Button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 dark:focus:bg-slate-900">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            icon={menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          />
          <Logo to="/dashboard" />
        </div>
        <ThemeToggle />
      </header>

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-950">
          {sidebar}
        </aside>
        {menuOpen && (
          <div className="fixed inset-0 top-14 z-20 lg:hidden">
            <div className="absolute inset-0 bg-slate-950/40" onClick={() => setMenuOpen(false)} aria-hidden />
            <aside className="relative h-full w-64 bg-white shadow-xl dark:bg-slate-950">{sidebar}</aside>
          </div>
        )}
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
