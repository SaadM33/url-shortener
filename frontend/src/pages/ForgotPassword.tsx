import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'

import { useForgotPassword } from '@/api/queries'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { useTitle } from '@/hooks/useTitle'
import { AuthCard } from '@/layouts/AuthLayout'
import { errorMessage } from '@/lib/forms'

const schema = z.object({ email: z.string().trim().email('Enter a valid email') })

export default function ForgotPassword() {
  useTitle('Reset password')
  const forgot = useForgotPassword()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async ({ email }) => {
    await forgot.mutateAsync({ email })
    setSentTo(email)
  })

  if (sentTo) {
    return (
      <AuthCard title="Check your email">
        <div className="flex gap-3 rounded-lg bg-indigo-50 p-4 text-sm text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200">
          <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            If <strong>{sentTo}</strong> has an account, a reset link is on its way. It works once and expires in 30 minutes.
          </p>
        </div>
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Back to log in
          </Link>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="We'll email you a link to choose a new one.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={forgot.error ? errorMessage(forgot.error) : null} />
        <Field label="Email" error={formState.errors.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" autoFocus {...register('email')} />}
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  )
}
