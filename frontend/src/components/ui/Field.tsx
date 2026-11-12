import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

const control =
  'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:opacity-60 dark:bg-slate-900 dark:text-slate-100'

const border = (invalid?: boolean) =>
  invalid ? 'border-red-500 dark:border-red-500' : 'border-slate-300 dark:border-slate-700'

type FieldProps = {
  label: string
  error?: string
  hint?: ReactNode
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode
  className?: string
}

/** Label + control + hint/error, with the aria wiring done once. */
export function Field({ label, error, hint, children, className }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(control, 'h-10', border(!!rest['aria-invalid']), className)} {...rest} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={cn(control, 'h-10 pr-8', border(!!rest['aria-invalid']), className)} {...rest}>
      {children}
    </select>
  )
})
