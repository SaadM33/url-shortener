import { API_URL } from '@/api/client'
import type { Link } from '@/api/types'

import { parseApiDate } from './format'

export const shortUrl = (code: string) => `${API_URL}/${code}`
export const displayShortUrl = (code: string) => shortUrl(code).replace(/^https?:\/\//, '')

export type LinkState = 'active' | 'disabled' | 'blocked' | 'expired' | 'limit'

export function linkState(link: Link): LinkState {
  if (link.admin_disabled) return 'blocked'
  if (!link.is_active) return 'disabled'
  if (link.expires_at && parseApiDate(link.expires_at) <= new Date()) return 'expired'
  if (link.max_visits != null && link.visits >= link.max_visits) return 'limit'
  return 'active'
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** "example.com/some/path" for compact display */
export function shortTarget(url: string): string {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '' : u.pathname
    return u.hostname.replace(/^www\./, '') + path + u.search
  } catch {
    return url
  }
}
