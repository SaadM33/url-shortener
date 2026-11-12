import { BarChart3, Link2, Plus, QrCode, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router'

import { useLinks } from '@/api/queries'
import type { LinkSort, LinkStatusFilter, SortOrder } from '@/api/types'
import { CreateLinkDialog } from '@/components/links/CreateLinkDialog'
import { LinkTable } from '@/components/links/LinkTable'
import { QrDialog } from '@/components/links/QrDialog'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonClass'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useTitle } from '@/hooks/useTitle'
import { PageHeader } from '@/layouts/AppLayout'

const PAGE_SIZE = 20
const SORTS = {
  'created_at:desc': 'Newest first',
  'created_at:asc': 'Oldest first',
  'visits:desc': 'Most clicks',
  'visits:asc': 'Fewest clicks',
  'expires_at:asc': 'Expiring soonest',
} as const
type SortKey = keyof typeof SORTS

/** Filters live in the URL, so they survive reloads and can be shared or bookmarked. */
export default function Links() {
  useTitle('Links')
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('q') ?? '')
  const q = useDebounce(search.trim(), 300)
  const status = (params.get('status') as LinkStatusFilter | null) ?? undefined
  const sortKey = (params.get('sort') as SortKey | null) ?? 'created_at:desc'
  const [sort, order] = sortKey.split(':') as [LinkSort, SortOrder]
  const offset = Number(params.get('offset')) || 0

  const [creating, setCreating] = useState(params.get('new') === '1')
  const [qrCode, setQrCode] = useState<string | null>(null)

  function update(next: Record<string, string | null>) {
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(next)) {
          if (v) p.set(k, v)
          else p.delete(k)
        }
        if (!('offset' in next)) p.delete('offset') // any filter change goes back to page 1
        return p
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if ((params.get('q') ?? '') !== q) update({ q: q || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync debounced search into the URL only
  }, [q])

  const { data, isPending, isFetching, error, refetch } = useLinks({ q: q || undefined, status, sort, order, limit: PAGE_SIZE, offset })
  const filtered = !!(q || status)

  return (
    <>
      <PageHeader
        title="Links"
        description="Everything you've shortened."
        actions={
          <Button onClick={() => setCreating(true)} icon={<Plus className="size-4" />}>
            New link
          </Button>
        }
      />
      <CreateLinkDialog open={creating} onClose={() => setCreating(false)} />
      {qrCode && <QrDialog code={qrCode} open onClose={() => setQrCode(null)} />}

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search links" aria-label="Search links" className="pl-9" />
          </div>
          <Select value={status ?? ''} onChange={(e) => update({ status: e.target.value || null })} aria-label="Filter by status" className="sm:w-40">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
          </Select>
          <Select value={sortKey} onChange={(e) => update({ sort: e.target.value === 'created_at:desc' ? null : e.target.value })} aria-label="Sort" className="sm:w-44">
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : isPending ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          filtered ? (
            <EmptyState icon={<Search className="size-6" />} title="No matching links" text="Try a different search or filter." />
          ) : (
            <EmptyState
              icon={<Link2 className="size-6" />}
              title="No links yet"
              text="Create your first short link to get started."
              action={<Button onClick={() => setCreating(true)} icon={<Plus className="size-4" />}>New link</Button>}
            />
          )
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={isFetching}>
            <LinkTable
              links={data.items}
              actions={(link) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setQrCode(link.short_code)} aria-label={`QR code for ${link.short_code}`} icon={<QrCode className="size-4" />} />
                  <RouterLink to={`/links/${link.short_code}`} className={buttonClass('ghost', 'sm')} aria-label={`Stats for ${link.short_code}`}>
                    <BarChart3 className="size-4" />
                  </RouterLink>
                </div>
              )}
            />
            <Pagination total={data.total} limit={PAGE_SIZE} offset={offset} onChange={(o) => update({ offset: o ? String(o) : null })} />
          </div>
        )}
      </Card>
    </>
  )
}
