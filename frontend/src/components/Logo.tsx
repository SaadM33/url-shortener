import { Link2 } from 'lucide-react'
import { Link } from 'react-router'

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">
        <Link2 className="size-4" aria-hidden />
      </span>
      Shortly
    </Link>
  )
}
