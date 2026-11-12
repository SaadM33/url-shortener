import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from './Button'

type Props = { total: number; limit: number; offset: number; onChange: (offset: number) => void }

export function Pagination({ total, limit, offset, onChange }: Props) {
  if (total <= limit) return null
  const page = Math.floor(offset / limit) + 1
  const pages = Math.ceil(total / limit)
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm dark:border-slate-800">
      <p className="text-slate-500 dark:text-slate-400">
        {offset + 1}–{Math.min(offset + limit, total)} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(offset - limit)} icon={<ChevronLeft className="size-4" />}>
          Previous
        </Button>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {page} / {pages}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(offset + limit)}>
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
