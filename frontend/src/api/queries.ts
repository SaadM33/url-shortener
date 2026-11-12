import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, ApiError } from './client'
import type {
  AdminUser,
  AdminUserPage,
  AdminUserUpdate,
  Detail,
  Link,
  LinkInput,
  LinkListParams,
  LinkPage,
  LinkStats,
  LinkUpdate,
  Overview,
  Providers,
  SiteStats,
  User,
  UserListParams,
} from './types'

/** All query keys in one place so invalidation stays consistent. */
export const keys = {
  me: ['me'] as const,
  providers: ['providers'] as const,
  overview: (days: number) => ['overview', days] as const,
  links: ['links'] as const,
  linkList: (p: LinkListParams) => ['links', 'list', p] as const,
  link: (code: string) => ['links', 'one', code] as const,
  linkStats: (code: string, days: number) => ['links', 'stats', code, days] as const,
  admin: ['admin'] as const,
  adminUsers: (p: UserListParams) => ['admin', 'users', p] as const,
  adminLinks: (p: LinkListParams) => ['admin', 'links', p] as const,
  siteStats: (days: number) => ['admin', 'stats', days] as const,
}

// ---------- session ----------

/** The logged-in user, or null when logged out. Never throws on 401. */
export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async ({ signal }) => {
      try {
        return await api<User>('/auth/me', { signal })
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return null
        throw err
      }
    },
    staleTime: 5 * 60_000,
  })
}

export function useProviders() {
  return useQuery({
    queryKey: keys.providers,
    queryFn: ({ signal }) => api<Providers>('/auth/providers', { signal }),
    staleTime: Infinity,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    meta: { expectsUnauthorized: true },
    mutationFn: async (body: { email: string; password: string }) => {
      await api<Detail>('/auth/login', { method: 'POST', body })
      return api<User>('/auth/me')
    },
    onSuccess: (user) => {
      qc.clear() // nothing from a previous session should survive
      qc.setQueryData(keys.me, user)
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: { email: string; username: string; password: string }) =>
      api<User>('/auth/register', { method: 'POST', body }),
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api<Detail>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      qc.clear()
      qc.setQueryData(keys.me, null)
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (body: { email: string }) => api<Detail>('/auth/forgot-password', { method: 'POST', body }),
  })
}

export function useResetPassword() {
  return useMutation({
    meta: { expectsUnauthorized: true },
    mutationFn: (body: { token: string; new_password: string }) =>
      api<Detail>('/auth/reset-password', { method: 'POST', body }),
  })
}

// ---------- account ----------

export function useOverview(days: number) {
  return useQuery({
    queryKey: keys.overview(days),
    queryFn: ({ signal }) => api<Overview>('/auth/me/overview', { query: { days }, signal }),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { username: string }) => api<User>('/auth/me', { method: 'PATCH', body }),
    onSuccess: (user) => qc.setQueryData(keys.me, user),
  })
}

export function useChangePassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { current_password?: string; new_password: string }) =>
      api<Detail>('/auth/change-password', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { password?: string }) => api<Detail>('/auth/me', { method: 'DELETE', body }),
    onSuccess: () => {
      qc.clear()
      qc.setQueryData(keys.me, null)
    },
  })
}

// ---------- links ----------

export function useLinks(params: LinkListParams) {
  return useQuery({
    queryKey: keys.linkList(params),
    queryFn: ({ signal }) => api<LinkPage>('/urls', { query: params, signal }),
    placeholderData: keepPreviousData, // no flicker while paging or searching
  })
}

export function useLink(code: string) {
  return useQuery({
    queryKey: keys.link(code),
    queryFn: ({ signal }) => api<Link>(`/urls/${encodeURIComponent(code)}`, { signal }),
  })
}

export function useLinkStats(code: string, days: number) {
  return useQuery({
    queryKey: keys.linkStats(code, days),
    queryFn: ({ signal }) => api<LinkStats>(`/urls/${encodeURIComponent(code)}/stats`, { query: { days }, signal }),
    placeholderData: keepPreviousData,
  })
}

function useInvalidateLinks() {
  const qc = useQueryClient()
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.links }),
      qc.invalidateQueries({ queryKey: ['overview'] }),
      qc.invalidateQueries({ queryKey: keys.admin }),
    ])
}

export function useCreateLink() {
  const invalidate = useInvalidateLinks()
  return useMutation({
    mutationFn: (body: LinkInput) => api<Link>('/urls', { method: 'POST', body }),
    onSuccess: invalidate,
  })
}

export function useUpdateLink(code: string) {
  const qc = useQueryClient()
  const invalidate = useInvalidateLinks()
  return useMutation({
    mutationFn: (body: LinkUpdate) => api<Link>(`/urls/${encodeURIComponent(code)}`, { method: 'PUT', body }),
    onSuccess: (link) => {
      qc.setQueryData(keys.link(code), link)
      return invalidate()
    },
  })
}

export function useDeleteLink() {
  const invalidate = useInvalidateLinks()
  return useMutation({
    mutationFn: (code: string) => api<Detail>(`/urls/${encodeURIComponent(code)}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

// ---------- admin ----------

export function useAdminUsers(params: UserListParams) {
  return useQuery({
    queryKey: keys.adminUsers(params),
    queryFn: ({ signal }) => api<AdminUserPage>('/admin/users', { query: params, signal }),
    placeholderData: keepPreviousData,
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: AdminUserUpdate & { id: number }) =>
      api<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.admin }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<Detail>(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.admin }),
  })
}

export function useAdminLinks(params: LinkListParams) {
  return useQuery({
    queryKey: keys.adminLinks(params),
    queryFn: ({ signal }) => api<LinkPage>('/admin/urls', { query: params, signal }),
    placeholderData: keepPreviousData,
  })
}

export function useModerateLink() {
  const invalidate = useInvalidateLinks()
  return useMutation({
    mutationFn: ({ code, is_active }: { code: string; is_active: boolean }) =>
      api<Link>(`/admin/urls/${encodeURIComponent(code)}`, { method: 'PATCH', body: { is_active } }),
    onSuccess: invalidate,
  })
}

export function useAdminDeleteLink() {
  const invalidate = useInvalidateLinks()
  return useMutation({
    mutationFn: (code: string) => api<Detail>(`/admin/urls/${encodeURIComponent(code)}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useSiteStats(days: number) {
  return useQuery({
    queryKey: keys.siteStats(days),
    queryFn: ({ signal }) => api<SiteStats>('/admin/stats', { query: { days }, signal }),
    placeholderData: keepPreviousData,
  })
}
