import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ExternalLink, MousePointerClick, QrCode, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { ApiError } from '@/api/client'
import { useDeleteLink, useLink, useLinkStats, useMe, useUpdateLink } from '@/api/queries'
import type { Link } from '@/api/types'
import { Breakdown } from '@/components/charts/Breakdown'
import { TimeChart } from '@/components/charts/TimeChart'
import { DaysSelect } from '@/components/DaysSelect'
import { LinkStatusBadge } from '@/components/links/LinkStatusBadge'
import { QrDialog } from '@/components/links/QrDialog'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonClass'
import { Card, CardHeader, StatCard } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { ErrorState, FormError, Skeleton } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { useTitle } from '@/hooks/useTitle'
import { formatDateTime, formatNumber, fromLocalInput, toLocalInput } from '@/lib/format'
import { applyServerErrors, errorMessage } from '@/lib/forms'
import { displayShortUrl, shortUrl } from '@/lib/links'
import { NotFound } from './Errors'

const schema = z.object({
  url: z.string().trim().url('Enter a full URL, including https://'),
  expires_at: z.string(),
  max_visits: z.string().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0), 'Enter a whole number above 0'),
})
type Values = z.infer<typeof schema>

function EditLink({ link }: { link: Link }) {
  const update = useUpdateLink(link.short_code)
  const [formError, setFormError] = useState<string | null>(null)
  const defaults = { url: link.long_url, expires_at: toLocalInput(link.expires_at), max_visits: link.max_visits?.toString() ?? '' }
  const { register, handleSubmit, setError, reset, formState, setValue } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })

  // keep the form in sync when the link changes elsewhere (e.g. after toggling)
  useEffect(() => reset(defaults), [link.long_url, link.expires_at, link.max_visits]) // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      // send only what changed, so untouched limits aren't rewritten
      const body: Record<string, unknown> = {}
      if (v.url !== link.long_url) body.url = v.url
      if (v.expires_at !== defaults.expires_at) body.expires_at = fromLocalInput(v.expires_at)
      if (v.max_visits !== defaults.max_visits) body.max_visits = v.max_visits ? Number(v.max_visits) : null
      if (Object.keys(body).length === 0) return
      await update.mutateAsync(body)
      toast.success('Link updated')
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['url', 'expires_at', 'max_visits']))
    }
  })

  async function toggle(active: boolean) {
    try {
      await update.mutateAsync({ is_active: active })
      toast.success(active ? 'Link enabled' : 'Link disabled')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <Card>
      <CardHeader title="Settings" />
      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {link.admin_disabled ? 'An admin disabled this link. It cannot be turned back on.' : 'Disabled links show visitors a "not found" page.'}
            </p>
          </div>
          <Switch checked={link.is_active && !link.admin_disabled} onChange={toggle} label="Link active" disabled={link.admin_disabled || update.isPending} />
        </div>

        <form onSubmit={onSubmit} className="space-y-4 border-t border-slate-200 pt-5 dark:border-slate-800" noValidate>
          <FormError message={formError} />
          <Field label="Destination URL" error={formState.errors.url?.message}>
            {(a) => <Input {...a} inputMode="url" {...register('url')} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Expires at" error={formState.errors.expires_at?.message} hint={<button type="button" className="underline" onClick={() => setValue('expires_at', '', { shouldDirty: true })}>Remove expiry</button>}>
              {(a) => <Input {...a} type="datetime-local" {...register('expires_at')} />}
            </Field>
            <Field label="Max clicks" error={formState.errors.max_visits?.message} hint="Leave empty for unlimited.">
              {(a) => <Input {...a} type="number" min={1} inputMode="numeric" placeholder="Unlimited" {...register('max_visits')} />}
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => reset(defaults)} disabled={!formState.isDirty}>
              Reset
            </Button>
            <Button type="submit" loading={formState.isSubmitting} disabled={!formState.isDirty}>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </Card>
  )
}

function Stats({ code, visits }: { code: string; visits: number }) {
  const [days, setDays] = useState(30)
  const { data, isPending, error, refetch } = useLinkStats(code, days)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <DaysSelect value={days} onChange={setDays} />
      </div>
      {error ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={`Clicks, last ${days} days`} value={formatNumber(data.total_clicks)} icon={<MousePointerClick className="size-4" />} />
            <StatCard label="Unique visitors" value={formatNumber(data.unique_visitors)} icon={<Users className="size-4" />} />
            <StatCard label="All-time clicks" value={formatNumber(visits)} />
          </div>
          <Card>
            <CardHeader title="Clicks per day" />
            <div className="p-4"><TimeChart data={data.clicks_by_day} /></div>
          </Card>
          <div className="grid gap-6 md:grid-cols-3">
            <Card><CardHeader title="Referrers" /><div className="p-5"><Breakdown items={data.top_referrers} /></div></Card>
            <Card><CardHeader title="Devices" /><div className="p-5"><Breakdown items={data.devices} capitalize /></div></Card>
            <Card><CardHeader title="Browsers" /><div className="p-5"><Breakdown items={data.browsers} /></div></Card>
          </div>
        </>
      )}
    </div>
  )
}

export default function LinkDetail() {
  const { code = '' } = useParams()
  useTitle(code)
  const navigate = useNavigate()
  const { data: me } = useMe()
  const { data: link, isPending, error, refetch } = useLink(code)
  const remove = useDeleteLink()
  const [qrOpen, setQrOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return <NotFound />
  if (error) return <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
  if (isPending) return <Skeleton className="h-64 rounded-xl" />

  async function onDelete() {
    try {
      await remove.mutateAsync(code)
      toast.success('Link deleted')
      navigate('/links', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <RouterLink to="/links" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
        <ArrowLeft className="size-4" aria-hidden /> All links
      </RouterLink>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight break-all">{displayShortUrl(link.short_code)}</h1>
              <LinkStatusBadge link={link} />
            </div>
            <a href={link.long_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
              <span className="truncate">{link.long_url}</span>
              <ExternalLink className="size-3.5 shrink-0" aria-hidden />
            </a>
            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <div><dt className="inline">Created </dt><dd className="inline">{formatDateTime(link.created_at)}</dd></div>
              {link.expires_at && <div><dt className="inline">Expires </dt><dd className="inline">{formatDateTime(link.expires_at)}</dd></div>}
              {link.max_visits != null && <div><dt className="inline">Click limit </dt><dd className="inline">{link.visits} / {link.max_visits}</dd></div>}
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={shortUrl(link.short_code)} />
            <Button variant="secondary" size="sm" onClick={() => setQrOpen(true)} icon={<QrCode className="size-4" />}>QR code</Button>
            <a href={shortUrl(link.short_code)} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm')}>
              <ExternalLink className="size-4" /> Open
            </a>
          </div>
        </div>
      </Card>
      <QrDialog code={link.short_code} open={qrOpen} onClose={() => setQrOpen(false)} />

      <Stats code={link.short_code} visits={link.visits} />

      {link.owner_id === me?.id ? (
        <>
          <EditLink link={link} />
          <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader
          title="Delete this link"
          description="The short link stops working and its click history is removed. This can't be undone."
          action={<Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} icon={<Trash2 className="size-4" />}>Delete</Button>}
            />
          </Card>
        </>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You're viewing another user's link as an admin. Use <RouterLink to="/admin/links" className="underline">moderation</RouterLink> to block or delete it.
        </p>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        loading={remove.isPending}
        title="Delete link?"
        description={<>Delete <strong>{displayShortUrl(link.short_code)}</strong> and all its stats? This can't be undone.</>}
        confirmLabel="Delete link"
      />
    </div>
  )
}
