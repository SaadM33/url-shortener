import { Ban, CheckCircle2, Search, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { useAdminDeleteLink, useAdminLinks, useModerateLink } from '@/api/queries'
import type { Link, LinkStatusFilter } from '@/api/types'
import { LinkTable } from '@/components/links/LinkTable'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useTitle } from '@/hooks/useTitle'
import { PageHeader } from '@/layouts/AppLayout'
import { displayShortUrl } from '@/lib/links'
import { errorMessage } from '@/lib/forms'

const PAGE_SIZE = 20

export default function AdminLinks() {
  useTitle('Moderation')
  const [params, setParams] = useSearchParams()
  const owner = Number(params.get('owner')) || undefined
  const [search, setSearch] = useState('')
  const q = useDebounce(search.trim())
  const [status, setStatus] = useState<LinkStatusFilter | ''>('')
  const [offset, setOffset] = useState(0)
  const [pending, setPending] = useState<{ link: Link; action: 'block' | 'delete' } | null>(null)

  const { data, isPending, error, refetch } = useAdminLinks({ q: q || undefined, status: status || undefined, owner_id: owner, limit: PAGE_SIZE, offset })
  const moderate = useModerateLink()
  const remove = useAdminDeleteLink()

  async function run(label: string, fn: () => Promise<unknown>) {
    try {
      await fn()
      toast.success(label)
      setPending(null)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader title="Link moderation" description="Every link on the site. Blocked links stay off until an admin lifts the block." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0) }} placeholder="Search code or destination" aria-label="Search links" className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as LinkStatusFilter | ''); setOffset(0) }} aria-label="Filter by status" className="sm:w-40">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="disabled">Disabled</option>
          </Select>
          {owner && (
            <Button variant="secondary" size="sm" onClick={() => { setParams({}); setOffset(0) }} icon={<X className="size-4" />}>
              Owner #{owner}
            </Button>
          )}
        </div>

        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : isPending ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={<Search className="size-6" />} title="No links found" />
        ) : (
          <>
            <LinkTable
              links={data.items}
              showOwner
              detailHref={(l) => `/links/${l.short_code}`}
              actions={(link) => (
                <div className="flex justify-end gap-1">
                  {link.admin_disabled ? (
                    <Button variant="ghost" size="sm" title="Lift block" aria-label={`Unblock ${link.short_code}`} onClick={() => run('Block lifted', () => moderate.mutateAsync({ code: link.short_code, is_active: true }))} icon={<CheckCircle2 className="size-4 text-emerald-500" />} />
                  ) : (
                    <Button variant="ghost" size="sm" title="Block" aria-label={`Block ${link.short_code}`} onClick={() => setPending({ link, action: 'block' })} icon={<Ban className="size-4" />} />
                  )}
                  <Button variant="ghost" size="sm" title="Delete" aria-label={`Delete ${link.short_code}`} onClick={() => setPending({ link, action: 'delete' })} icon={<Trash2 className="size-4 text-red-500" />} />
                </div>
              )}
            />
            <Pagination total={data.total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
          </>
        )}
      </Card>

      {pending && (
        <ConfirmDialog
          open
          onClose={() => setPending(null)}
          loading={moderate.isPending || remove.isPending}
          title={pending.action === 'block' ? 'Block this link?' : 'Delete this link?'}
          description={
            pending.action === 'block' ? (
              <>Visitors to <strong>{displayShortUrl(pending.link.short_code)}</strong> will see "not found", and the owner can't turn it back on.</>
            ) : (
              <>Delete <strong>{displayShortUrl(pending.link.short_code)}</strong> and its click history? This cannot be undone.</>
            )
          }
          confirmLabel={pending.action === 'block' ? 'Block link' : 'Delete link'}
          onConfirm={() =>
            pending.action === 'block'
              ? run('Link blocked', () => moderate.mutateAsync({ code: pending.link.short_code, is_active: false }))
              : run('Link deleted', () => remove.mutateAsync(pending.link.short_code))
          }
        />
      )}
    </>
  )
}
