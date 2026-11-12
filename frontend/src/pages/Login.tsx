import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'

import { API_URL } from '@/api/client'
import { useLogin, useProviders } from '@/api/queries'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonClass'
import { FormError } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { useTitle } from '@/hooks/useTitle'
import { AuthCard } from '@/layouts/AuthLayout'
import { applyServerErrors } from '@/lib/forms'
import { safeNext } from '@/lib/safeNext'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
type Values = z.infer<typeof schema>

const callbackErrors: Record<string, string> = {
  google_failed: 'Google sign-in was cancelled or failed. Please try again.',
  google_unverified: 'Your Google email address is not verified.',
  google_no_email: "Google didn't share an email address.",
  google_unavailable: 'Google sign-in is not set up on this server.',
  account_disabled: 'This account has been disabled.',
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  )
}

export default function Login() {
  useTitle('Log in')
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useLogin()
  const { data: providers } = useProviders()
  const [formError, setFormError] = useState<string | null>(callbackErrors[params.get('error') ?? ''] ?? null)

  const { register, handleSubmit, setError, formState } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login.mutateAsync(values)
      navigate(safeNext(params.get('next')), { replace: true })
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['email', 'password']))
    }
  })

  return (
    <AuthCard title="Welcome back" subtitle="Log in to manage your links.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <Field label="Email" error={formState.errors.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" autoFocus {...register('email')} />}
        </Field>
        <Field label="Password" error={formState.errors.password?.message}>
          {(a) => <Input {...a} type="password" autoComplete="current-password" {...register('password')} />}
        </Field>
        <div className="text-right text-sm">
          <Link to="/forgot-password" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Log in
        </Button>
      </form>

      {providers?.google && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            or
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
          {/* a full-page navigation, not fetch: Google's consent screen can't run in a fetch */}
          <a href={`${API_URL}/auth/google/login`} className={buttonClass('secondary', 'md', 'w-full')}>
            <GoogleIcon />
            Continue with Google
          </a>
        </>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        No account?{' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Create one
        </Link>
      </p>
    </AuthCard>
  )
}
