import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { useChangePassword, useDeleteAccount, useMe, useUpdateProfile } from '@/api/queries'
import type { User } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { FormError } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Field'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { useTitle } from '@/hooks/useTitle'
import { PageHeader } from '@/layouts/AppLayout'
import { applyServerErrors, passwordSchema, usernameSchema } from '@/lib/forms'

function Profile({ user }: { user: User }) {
  const update = useUpdateProfile()
  const [formError, setFormError] = useState<string | null>(null)
  const schema = z.object({ username: usernameSchema })
  const { register, handleSubmit, setError, formState, reset } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: user.username },
  })

  const onSubmit = handleSubmit(async ({ username }) => {
    setFormError(null)
    try {
      const saved = await update.mutateAsync({ username })
      reset({ username: saved.username })
      toast.success('Profile saved')
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['username']))
    }
  })

  return (
    <Card>
      <CardHeader title="Profile" description="How you appear in Shortly." />
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <FormError message={formError} />
        <Field label="Email" hint="Your email can't be changed yet.">
          {(a) => <Input {...a} value={user.email} disabled readOnly />}
        </Field>
        <Field label="Username" error={formState.errors.username?.message}>
          {(a) => <Input {...a} autoComplete="username" {...register('username')} />}
        </Field>
        <div className="flex justify-end">
          <Button type="submit" loading={formState.isSubmitting} disabled={!formState.isDirty}>Save</Button>
        </div>
      </form>
    </Card>
  )
}

function Password({ user }: { user: User }) {
  const change = useChangePassword()
  const [formError, setFormError] = useState<string | null>(null)
  const schema = z
    .object({ current_password: z.string(), new_password: passwordSchema, confirm: z.string() })
    .refine((v) => !user.has_password || v.current_password.length > 0, { path: ['current_password'], message: 'Enter your current password' })
    .refine((v) => v.new_password === v.confirm, { path: ['confirm'], message: "Passwords don't match" })
  const { register, handleSubmit, setError, reset, formState } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', new_password: '', confirm: '' },
  })

  const onSubmit = handleSubmit(async ({ current_password, new_password }) => {
    setFormError(null)
    try {
      await change.mutateAsync({ current_password: user.has_password ? current_password : undefined, new_password })
      reset()
      toast.success(user.has_password ? 'Password changed. Other devices were logged out.' : 'Password set. You can now log in with it.')
    } catch (err) {
      const msg = applyServerErrors(err, setError, ['current_password', 'new_password'])
      if (msg && /current password/i.test(msg)) setError('current_password', { message: msg })
      else setFormError(msg)
    }
  })

  return (
    <Card>
      <CardHeader
        title={user.has_password ? 'Change password' : 'Set a password'}
        description={user.has_password ? 'Changing it logs you out on every other device.' : 'You sign in with Google. Add a password to also log in with your email.'}
      />
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <FormError message={formError} />
        {user.has_password && (
          <Field label="Current password" error={formState.errors.current_password?.message}>
            {(a) => <Input {...a} type="password" autoComplete="current-password" {...register('current_password')} />}
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" error={formState.errors.new_password?.message}>
            {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('new_password')} />}
          </Field>
          <Field label="Confirm new password" error={formState.errors.confirm?.message}>
            {(a) => <Input {...a} type="password" autoComplete="new-password" {...register('confirm')} />}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={formState.isSubmitting}>{user.has_password ? 'Change password' : 'Set password'}</Button>
        </div>
      </form>
    </Card>
  )
}

function Appearance() {
  const { theme, setTheme } = useTheme()
  const options: { value: Theme; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ]
  return (
    <Card>
      <CardHeader title="Appearance" />
      <fieldset className="flex flex-wrap gap-2 p-5">
        <legend className="sr-only">Theme</legend>
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm has-checked:border-indigo-500 has-checked:bg-indigo-50 dark:border-slate-700 dark:has-checked:bg-indigo-500/10">
            <input type="radio" name="theme" value={o.value} checked={theme === o.value} onChange={() => setTheme(o.value)} className="accent-indigo-600" />
            {o.label}
          </label>
        ))}
      </fieldset>
    </Card>
  )
}

function DangerZone({ user }: { user: User }) {
  const remove = useDeleteAccount()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ready = user.has_password ? password.length > 0 : confirmText === user.username

  async function onDelete(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await remove.mutateAsync(user.has_password ? { password } : {})
      toast.success('Your account was deleted')
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the account')
    }
  }

  return (
    <Card className="border-red-200 dark:border-red-900/50">
      <CardHeader
        title="Delete account"
        description="Permanently removes your account, all your links and their stats."
        action={<Button variant="danger" size="sm" onClick={() => setOpen(true)}>Delete account</Button>}
      />
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete your account?" description="This can't be undone. All your links stop working immediately.">
        <form onSubmit={onDelete} className="space-y-4">
          <FormError message={error} />
          {user.has_password ? (
            <Field label="Enter your password to confirm">
              {(a) => <Input {...a} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />}
            </Field>
          ) : (
            <Field label={`Type ${user.username} to confirm`}>
              {(a) => <Input {...a} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />}
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="danger" disabled={!ready} loading={remove.isPending}>Delete forever</Button>
          </div>
        </form>
      </Dialog>
    </Card>
  )
}

export default function Settings() {
  useTitle('Settings')
  const { data: user } = useMe()
  if (!user) return null
  return (
    <>
      <PageHeader title="Settings" description="Manage your account." actions={user.role === 'admin' ? <Badge tone="indigo">Admin</Badge> : undefined} />
      <div className="max-w-3xl space-y-6">
        <Profile user={user} />
        <Password user={user} />
        <Appearance />
        <DangerZone user={user} />
      </div>
    </>
  )
}
