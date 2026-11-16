import { Ban, Search, ShieldCheck, ShieldOff, Trash2, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { toast } from 'sonner'

import { useAdminUsers, useDeleteUser, useMe, useUpdateUser } from '@/api/queries'
import type { AdminUser } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback'
import { Input, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { useTitle } from '@/hooks/useTitle'
import { PageHeader } from '@/layouts/AppLayout'
import { formatDate } from '@/lib/format'
import { errorMessage } from '@/lib/forms'

const PAGE_SIZE = 20
type Pending = { user: AdminUser; action: 'ban' | 'delete' | 'demote' } | null

export default function AdminUsers() {
  useTitle('Users')
  const { data: me } = useMe()
  const [search, setSearch] = useState('')
  const q = useDebounce(search.trim())
  const [filter, setFilter] = useState('')
  const [offset, setOffset] = useState(0)
  const [pending, setPending] = useState<Pending>(null)

  const params = {
    q: q || undefined,
    role: filter === 'admin' ? ('admin' as const) : undefined,
    is_active: filter === 'banned' ? false : undefined,
    limit: PAGE_SIZE,
    offset,
  }
  const { data, isPending, error, refetch } = useAdminUsers(params)
  const update = useUpdateUser()
  const remove = useDeleteUser()

  async function run(label: string, fn: () => Promise<unknown>) {
    try {
      await fn()
      toast.success(label)
      setPending(null)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const confirm = pending && {
    ban: { title: `Ban ${pending.user.username}?`, text: 'They are logged out right away and can no longer log in. Their links keep working.', label: 'Ban user' },
    demote: { title: `Remove admin from ${pending.user.username}?`, text: 'They lose access to the admin area.', label: 'Remove admin' },
    delete: { title: `Delete ${pending.user.username}?`, text: 'Their account, links and click history are deleted. This cannot be undone.', label: 'Delete user' },
  }[pending.action]

  return (
    <>
      <PageHeader title="Users" description="Manage accounts and roles." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0) }} placeholder="Search email or username" aria-label="Search users" className="pl-9" />
          </div>
          <Select value={filter} onChange={(e) => { setFilter(e.target.value); setOffset(0) }} aria-label="Filter users" className="sm:w-40">
            <option value="">All users</option>
            <option value="admin">Admins</option>
            <option value="banned">Banned</option>
          </Select>
        </div>

        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : isPending ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={<Search className="size-6" />} title="No users found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs font-medium tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-3">User</th>
                    <th scope="col" className="hidden px-3 py-3 sm:table-cell">Role</th>
                    <th scope="col" className="hidden px-3 py-3 md:table-cell">Joined</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.items.map((u) => {
                    const self = u.id === me?.id
                    return (
                      <tr key={u.id}>
                        <td className="w-full max-w-0 px-5 py-3">
                          <p className="truncate font-medium">
                            {u.username ?? '—'} {self && <span className="font-normal text-slate-400">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                          <RouterLink to={`/admin/links?owner=${u.id}`} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                            View links
                          </RouterLink>
                        </td>
                        <td className="hidden px-3 py-3 sm:table-cell">
                          <div className="flex gap-1.5">
                            {u.role === 'admin' ? <Badge tone="indigo">Admin</Badge> : <Badge>User</Badge>}
                            {!u.is_active && <Badge tone="red">Banned</Badge>}
                            {!u.email_verified && <Badge tone="amber">Unverified</Badge>}
                          </div>
                        </td>
                        <td className="hidden px-3 py-3 text-slate-500 md:table-cell dark:text-slate-400">{u.created_at ? formatDate(u.created_at) : '—'}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            {u.role === 'admin' ? (
                              <Button variant="ghost" size="sm" disabled={self} title="Remove admin" aria-label={`Remove admin from ${u.email}`} onClick={() => setPending({ user: u, action: 'demote' })} icon={<ShieldOff className="size-4" />} />
                            ) : (
                              <Button variant="ghost" size="sm" title="Make admin" aria-label={`Make ${u.email} an admin`} onClick={() => run('User is now an admin', () => update.mutateAsync({ id: u.id, role: 'admin' }))} icon={<ShieldCheck className="size-4" />} />
                            )}
                            {u.is_active ? (
                              <Button variant="ghost" size="sm" disabled={self} title="Ban" aria-label={`Ban ${u.email}`} onClick={() => setPending({ user: u, action: 'ban' })} icon={<Ban className="size-4" />} />
                            ) : (
                              <Button variant="ghost" size="sm" title="Unban" aria-label={`Unban ${u.email}`} onClick={() => run('User unbanned', () => update.mutateAsync({ id: u.id, is_active: true }))} icon={<UserCheck className="size-4" />} />
                            )}
                            <Button variant="ghost" size="sm" disabled={self} title="Delete" aria-label={`Delete ${u.email}`} onClick={() => setPending({ user: u, action: 'delete' })} icon={<Trash2 className="size-4 text-red-500" />} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination total={data.total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
          </>
        )}
      </Card>

      {pending && confirm && (
        <ConfirmDialog
          open
          onClose={() => setPending(null)}
          title={confirm.title}
          description={confirm.text}
          confirmLabel={confirm.label}
          loading={update.isPending || remove.isPending}
          onConfirm={() =>
            pending.action === 'delete'
              ? run('User deleted', () => remove.mutateAsync(pending.user.id))
              : pending.action === 'ban'
                ? run('User banned', () => update.mutateAsync({ id: pending.user.id, is_active: false }))
                : run('Admin removed', () => update.mutateAsync({ id: pending.user.id, role: 'user' }))
          }
        />
      )}
    </>
  )
}
