import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900', className)}
      {...rest}
    />
  )
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </Card>
  )
}
