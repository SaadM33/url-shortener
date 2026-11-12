import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'

import type { Link } from '@/api/types'
import { CopyButton } from '@/components/ui/CopyButton'
import { formatDateTime, formatNumber, formatRelative } from '@/lib/format'
import { displayShortUrl, shortTarget, shortUrl } from '@/lib/links'

import { LinkStatusBadge } from './LinkStatusBadge'

type Props = {
  links: Link[]
  /** where the short code links to; null = not clickable */
  detailHref?: (link: Link) => string | null
  actions?: (link: Link) => ReactNode
  showOwner?: boolean
}

export function LinkTable({ links, detailHref = (l) => `/links/${l.short_code}`, actions, showOwner }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 text-left text-xs font-medium tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:text-slate-400">
          <tr>
            <th scope="col" className="px-5 py-3">Link</th>
            {showOwner && <th scope="col" className="hidden px-3 py-3 md:table-cell">Owner</th>}
            <th scope="col" className="px-3 py-3 text-right">Clicks</th>
            <th scope="col" className="hidden px-3 py-3 sm:table-cell">Status</th>
            <th scope="col" className="hidden px-3 py-3 lg:table-cell">Created</th>
            <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {links.map((link) => {
            const href = detailHref(link)
            return (
              <tr key={link.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="w-full max-w-0 px-5 py-3">
                  <div className="flex items-center gap-1">
                    {href ? (
                      <RouterLink to={href} className="truncate font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        {displayShortUrl(link.short_code)}
                      </RouterLink>
                    ) : (
                      <span className="truncate font-medium">{displayShortUrl(link.short_code)}</span>
                    )}
                    <CopyButton text={shortUrl(link.short_code)} compact />
                  </div>
                  <a href={link.long_url} target="_blank" rel="noreferrer" title={link.long_url} className="flex items-center gap-1 truncate text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                    <span className="truncate">{shortTarget(link.long_url)}</span>
                    <ArrowUpRight className="size-3 shrink-0" aria-hidden />
                  </a>
                  <div className="mt-1 sm:hidden">
                    <LinkStatusBadge link={link} />
                  </div>
                </td>
                {showOwner && <td className="hidden px-3 py-3 text-slate-500 md:table-cell dark:text-slate-400">#{link.owner_id ?? '—'}</td>}
                <td className="px-3 py-3 text-right font-medium tabular-nums">
                  {formatNumber(link.visits)}
                  {link.max_visits != null && <span className="font-normal text-slate-400"> / {formatNumber(link.max_visits)}</span>}
                </td>
                <td className="hidden px-3 py-3 sm:table-cell">
                  <LinkStatusBadge link={link} />
                </td>
                <td className="hidden px-3 py-3 whitespace-nowrap text-slate-500 lg:table-cell dark:text-slate-400" title={formatDateTime(link.created_at)}>
                  {formatRelative(link.created_at)}
                </td>
                <td className="px-5 py-3 text-right whitespace-nowrap">{actions?.(link)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
