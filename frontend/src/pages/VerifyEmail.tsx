import { CheckCircle2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'

import { useMe, useVerifyEmail } from '@/api/queries'
import { buttonClass } from '@/components/ui/buttonClass'
import { FormError, Spinner } from '@/components/ui/Feedback'
import { useTitle } from '@/hooks/useTitle'
import { AuthCard } from '@/layouts/AuthLayout'
import { errorMessage } from '@/lib/forms'

export default function VerifyEmail() {
  useTitle('Confirm your email')
  const [params] = useSearchParams()
  const token = params.get('token')
  const verify = useVerifyEmail()
  const { data: user } = useMe()
  const sent = useRef(false)

  // verify once on arrival (the ref stops StrictMode's double effect from sending twice)
  useEffect(() => {
    if (token && !sent.current) {
      sent.current = true
      verify.mutate({ token })
    }
  }, [token, verify])

  const next = user ? '/dashboard' : '/login'
  const nextLabel = user ? 'Go to your dashboard' : 'Log in'

  if (!token) {
    return (
      <AuthCard title="Link is incomplete">
        <FormError message="This link is missing its token. Open the link from the email again." />
      </AuthCard>
    )
  }

  if (verify.isSuccess) {
    return (
      <AuthCard title="Email confirmed">
        <div className="flex gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            <strong>{verify.data.email}</strong> is confirmed. You can create short links now.
          </p>
        </div>
        <Link to={next} className={buttonClass('primary', 'md', 'mt-6 w-full')}>
          {nextLabel}
        </Link>
      </AuthCard>
    )
  }

  if (verify.isError) {
    return (
      <AuthCard title="Couldn't confirm your email">
        <FormError message={errorMessage(verify.error)} />
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Links expire after 24 hours. {user ? 'Use "Resend email" on your dashboard to get a new one.' : 'Log in to get a new one.'}
        </p>
        <Link to={next} className={buttonClass('secondary', 'md', 'mt-6 w-full')}>
          {nextLabel}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Confirming your email">
      <Spinner label="Confirming" />
    </AuthCard>
  )
}
