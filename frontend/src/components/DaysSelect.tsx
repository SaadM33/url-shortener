import { cn } from '@/lib/cn'

const OPTIONS = [7, 30, 90]

export function DaysSelect({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <div role="group" aria-label="Time range" className="inline-flex rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
      {OPTIONS.map((days) => (
        <button
          key={days}
          type="button"
          aria-pressed={value === days}
          onClick={() => onChange(days)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            value === days
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
          )}
        >
          {days}d
        </button>
      ))}
    </div>
  )
}
