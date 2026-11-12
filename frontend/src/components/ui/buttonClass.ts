import { cn } from '@/lib/cn'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-600/60',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-600/60',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(
    'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-70',
    variants[variant],
    sizes[size],
    className,
  )
