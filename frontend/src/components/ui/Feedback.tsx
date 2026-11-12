import { AlertCircle, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

import { Button } from './Button'

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-slate-500', className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  )
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-800', className)} aria-hidden />
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-400">{icon}</div>}
      <h3 className="font-medium">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <AlertCircle className="mb-2 size-6 text-red-500" aria-hidden />
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div role="alert" className="flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </div>
  )
}
