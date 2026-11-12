import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { useLogin, useRegister } from '@/api/queries'
import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { useTitle } from '@/hooks/useTitle'
import { AuthCard } from '@/layouts/AuthLayout'
import { applyServerErrors, passwordSchema, usernameSchema } from '@/lib/forms'

const schema = z
  .object({
    email: z.string().trim().email('Enter a valid email'),
    username: usernameSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: "Passwords don't match" })
type Values = z.infer<typeof schema>

export default function Register() {
  useTitle('Create account')
  const navigate = useNavigate()
  const registerUser = useRegister()
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, formState } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async ({ email, username, password }) => {
    setFormError(null)
    try {
      await registerUser.mutateAsync({ email, username, password })
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['email', 'username', 'password']))
      return
    }
    try {
      await login.mutateAsync({ email, password })
      toast.success('Welcome to Shortly!')
      navigate('/dashboard', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  })

  return (
    <AuthCard title="Create your account" subtitle="Free, and it takes a few seconds.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <Field label="Email" error={formState.errors.email?.message}>
          {(a) => <Input {...a} type="email" autoComplete="email" autoFocus {...register('email')} />}
        </Field>
        <Field label="Username" error={formState.errors.username?.message}>
          {(a) => <Input {...a} autoComplete="username" {...register('username')} />}
        </Field>
        <Field label="Password" error={formState.errors.password?.message} hint="At least 8 characters.">
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('password')} />}
        </Field>
        <Field label="Confirm password" error={formState.errors.confirm?.message}>
          {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('confirm')} />}
        </Field>
        <Button type="submit" className="w-full" loading={formState.isSubmitting}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
          Log in
        </Link>
      </p>
    </AuthCard>
  )
}
