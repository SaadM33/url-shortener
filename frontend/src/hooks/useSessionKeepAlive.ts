import { useEffect } from 'react'

import { api } from '@/api/client'

const EVERY_MS = 10 * 60_000

/**
 * The session cookie expires after TOKEN_EXPIRE_MINUTES (30 by default).
 * While the tab is in use, extend it every 10 minutes so active users aren't logged out.
 */
export function useSessionKeepAlive(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let last = Date.now()
    const refresh = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < EVERY_MS) return
      last = Date.now()
      api('/auth/refresh', { method: 'POST' }).catch(() => {
        /* a 401 here surfaces on the next real request */
      })
    }
    const timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [enabled])
}
