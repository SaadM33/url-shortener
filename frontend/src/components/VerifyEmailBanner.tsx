import { MailWarning } from 'lucide-react'
import { toast } from 'sonner'

import { useResendVerification } from '@/api/queries'
import type { User } from '@/api/types'
import { errorMessage } from '@/lib/forms'

import { Button } from './ui/Button'

export function VerifyEmailBanner({ user }: { user: User }) {
  const resend = useResendVerification()

  async function onResend() {
    try {
      await resend.mutateAsync()
      toast.success(`Sent a new link to ${user.email}`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div role="status" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <MailWarning className="size-5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        Confirm <strong>{user.email}</strong> using the link we emailed you. Until then you can't create links.
      </p>
      <Button variant="secondary" size="sm" onClick={onResend} loading={resend.isPending}>
        Resend email
      </Button>
    </div>
  )
}
