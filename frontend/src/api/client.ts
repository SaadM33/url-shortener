export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

type ValidationItem = { loc: (string | number)[]; msg: string }

/** Every failed request becomes an ApiError with a message that is safe to show. */
export class ApiError extends Error {
  readonly status: number
  /** field name -> message, from FastAPI 422 responses */
  readonly fieldErrors: Record<string, string>
  readonly retryAfter?: number

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
    this.retryAfter = retryAfter
  }
}

export type Query = Record<string, string | number | boolean | null | undefined>

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Query
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(API_URL + path)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function cleanMessage(msg: string) {
  // pydantic prefixes custom errors with "Value error, "
  const text = msg.replace(/^Value error, /, '')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

async function toError(res: Response): Promise<ApiError> {
  let detail: unknown
  try {
    detail = (await res.json())?.detail
  } catch {
    /* not JSON */
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After')) || undefined
    const wait = retryAfter ? ` Try again in ${retryAfter} second${retryAfter === 1 ? '' : 's'}.` : ''
    return new ApiError(429, `Too many attempts.${wait}`, {}, retryAfter)
  }

  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {}
    for (const item of detail as ValidationItem[]) {
      const field = String(item.loc[item.loc.length - 1])
      fieldErrors[field] ??= cleanMessage(item.msg)
    }
    const first = Object.values(fieldErrors)[0]
    return new ApiError(res.status, first ?? 'Please check the form.', fieldErrors)
  }

  if (typeof detail === 'string') return new ApiError(res.status, cleanMessage(detail))
  return new ApiError(res.status, res.status >= 500 ? 'Something went wrong on the server.' : `Request failed (${res.status}).`)
}

export async function api<T>(path: string, { method = 'GET', body, query, signal }: Options = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      signal,
      credentials: 'include', // the session lives in an HTTP-only cookie
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, "Can't reach the server, or it hit an error. Please try again.")
  }

  if (!res.ok) throw await toError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
