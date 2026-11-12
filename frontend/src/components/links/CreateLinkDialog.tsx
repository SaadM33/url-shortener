import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, PartyPopper } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink } from 'react-router'
import { z } from 'zod'

import { useCreateLink } from '@/api/queries'
import type { Link } from '@/api/types'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonClass'
import { CopyButton } from '@/components/ui/CopyButton'
import { Dialog } from '@/components/ui/Dialog'
import { FormError } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { fromLocalInput } from '@/lib/format'
import { applyServerErrors } from '@/lib/forms'
import { displayShortUrl, shortUrl } from '@/lib/links'

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Paste the link you want to shorten')
    .transform((v) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.string().url('That doesn\'t look like a valid URL')),
  alias: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[A-Za-z0-9_-]{3,50}$/.test(v), '3–50 letters, numbers, - or _'),
  expires_at: z
    .string()
    .refine((v) => v === '' || new Date(v) > new Date(), 'Pick a time in the future'),
  max_visits: z
    .string()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0), 'Enter a whole number above 0'),
})
type FormIn = z.input<typeof schema>
type FormOut = z.output<typeof schema>

export function CreateLinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateLink()
  const [created, setCreated] = useState<Link | null>(null)
  const [showOptions, setShowOptions] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, reset, formState } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: { url: '', alias: '', expires_at: '', max_visits: '' },
  })

  function close() {
    onClose()
    // reset after the close animation so the success view doesn't flash
    setTimeout(() => {
      setCreated(null)
      setFormError(null)
      setShowOptions(false)
      reset()
    }, 150)
  }

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null)
    try {
      const link = await create.mutateAsync({
        url: v.url,
        alias: v.alias || null,
        expires_at: fromLocalInput(v.expires_at),
        max_visits: v.max_visits ? Number(v.max_visits) : null,
      })
      setCreated(link)
    } catch (err) {
      const msg = applyServerErrors(err, setError, ['url', 'alias', 'expires_at', 'max_visits'])
      // alias problems come back as plain 400/409 messages; show them on the field
      if (msg && /alias/i.test(msg)) {
        setError('alias', { message: msg })
        setShowOptions(true)
      } else setFormError(msg)
    }
  })

  if (created) {
    return (
      <Dialog open={open} onClose={close} title="Your link is ready">
        <div className="flex flex-col items-center gap-4 text-center">
          <PartyPopper className="size-8 text-indigo-500" aria-hidden />
          <a href={shortUrl(created.short_code)} target="_blank" rel="noreferrer" className="text-lg font-semibold break-all text-indigo-600 hover:underline dark:text-indigo-400">
            {displayShortUrl(created.short_code)}
          </a>
          <div className="flex gap-2">
            <CopyButton text={shortUrl(created.short_code)} label="Copy link" />
            <RouterLink to={`/links/${created.short_code}`} onClick={close} className={buttonClass('secondary', 'sm')}>
              View details
            </RouterLink>
          </div>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onClose={close} title="Create a short link">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <Field label="Long URL" error={formState.errors.url?.message}>
          {(a) => <Input {...a} placeholder="https://example.com/a/very/long/page" autoFocus inputMode="url" {...register('url')} />}
        </Field>

        <button
          type="button"
          onClick={() => setShowOptions((s) => !s)}
          aria-expanded={showOptions}
          className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ChevronDown className={`size-4 transition-transform ${showOptions ? 'rotate-180' : ''}`} aria-hidden />
          Custom alias and expiry
        </button>

        {showOptions && (
          <div className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <Field label="Custom alias" error={formState.errors.alias?.message} hint="Optional. Leave empty for a random code.">
              {(a) => <Input {...a} placeholder="my-link" autoComplete="off" {...register('alias')} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Expires at" error={formState.errors.expires_at?.message} hint="Your local time.">
                {(a) => <Input {...a} type="datetime-local" {...register('expires_at')} />}
              </Field>
              <Field label="Max clicks" error={formState.errors.max_visits?.message}>
                {(a) => <Input {...a} type="number" min={1} inputMode="numeric" placeholder="Unlimited" {...register('max_visits')} />}
              </Field>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={formState.isSubmitting}>
            Shorten
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
