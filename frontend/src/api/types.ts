import type { components } from './schema'

type S = components['schemas']

export type User = S['UserResponse']
export type Link = S['URLResponse']
export type LinkPage = S['URLPage']
export type LinkInput = S['URLInput']
export type LinkUpdate = S['URLUpdate']
export type LinkStats = S['URLStats']
export type Overview = S['Overview']
export type DayCount = S['DayCount']
export type CountItem = S['CountItem']
export type TopLink = S['TopLink']
export type AdminUser = S['AdminUserResponse']
export type AdminUserPage = S['AdminUserPage']
export type AdminUserUpdate = S['AdminUserUpdate']
export type SiteStats = S['SiteStats']

export type LinkStatusFilter = 'active' | 'expired' | 'disabled'
export type LinkSort = 'created_at' | 'visits' | 'expires_at'
export type SortOrder = 'asc' | 'desc'

export type LinkListParams = {
  q?: string
  status?: LinkStatusFilter
  sort?: LinkSort
  order?: SortOrder
  limit?: number
  offset?: number
  owner_id?: number
}

export type UserListParams = {
  q?: string
  role?: 'user' | 'admin'
  is_active?: boolean
  limit?: number
  offset?: number
}

export type Providers = { password: boolean; google: boolean }
export type Detail = { detail: string }
