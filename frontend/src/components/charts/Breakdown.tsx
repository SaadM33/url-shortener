import type { CountItem } from '@/api/types'
import { formatNumber } from '@/lib/format'

/** Ranked list with proportional bars. Reads well as a list for screen readers too. */
export function Breakdown({ items, empty = 'No data yet', capitalize }: { items: CountItem[]; empty?: string; capitalize?: boolean }) {
  const total = items.reduce((s, i) => s + i.count, 0)
  if (!total) return <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{empty}</p>
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const pct = Math.round((item.count / total) * 100)
        return (
          <li key={item.name} className="text-sm">
            <div className="mb-1 flex justify-between gap-3">
              <span className={capitalize ? 'truncate capitalize' : 'truncate'} title={item.name}>
                {item.name}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
                {formatNumber(item.count)} · {pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
