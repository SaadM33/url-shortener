import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { useResetPassword } from '@/api/queries'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { useTitle } from '@/hooks/useTitle'
import { AuthCard } from '@/layouts/AuthLayout'
import { applyServerErrors, passwordSchema } from '@/lib/forms'

const schema = z
  .object({ new_password: passwordSchema, confirm: z.string() })
  .refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: "Passwords don't match" })
type Values = z.infer<typeof schema>

export default function ResetPassword() {
  useTitle('Choose a new password')
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const reset = useResetPassword()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, formState } = useForm<Values>({ resolver: zodResolver(schema) })

  if (!token) {
    return (
      <AuthCard title="Link is incomplete">
        <FormError message="This reset link is missing its token. Open the link from the email again, or request a new one." />
        <p className="mt-6 text-center text-sm">
          <Link to="/forgot-password" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Request a new link
          </Link>
        </p>
      </AuthCard>
    )
  }

  const onSubmit = handleSubmit(async ({ new_password }) => {
    setFormError(null)
    try {
      await reset.mutateAsync({ token, new_password })
      toast.success('Password updated. Log in with your new password.')
      navigate('/login', { replace: true })
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['new_password']))
    }
  })

  return (
    <AuthCard title="Choose a new password" subtitle="You'll be logged out everywhere else.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        {formError?.toLowerCase().includes('token') && (
          <p className="text-sm">
            <Link to="/forgot-password" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Request a new link
            </Link>
          </p>
        )}
        <Field label="New password" error={formState.errors.new_password?.message} hint="At least 8 characters.">
          {(a) => <Input {...a} type="password" autoComplete="new-password" autoFocus {...register('new_password')} />}
        </Field>
        <Field label="Confirm new password" error={formState.errors.confirm?.message}>
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('confirm')} />}
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthCard>
  )
}
