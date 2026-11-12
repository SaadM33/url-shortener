/** The API sends naive UTC timestamps ("2026-11-08T13:03:10"); treat them as UTC. */
export function parseApiDate(value: string): Date {
  return new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`)
}

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const shortDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })
const plain = new Intl.NumberFormat()

export const formatDateTime = (value: string) => dateTime.format(parseApiDate(value))
export const formatDate = (value: string) => dateOnly.format(parseApiDate(value))
/** For chart axes: "2026-11-08" (a calendar day, not a timestamp) -> "Nov 8" */
export const formatDay = (day: string) => shortDay.format(new Date(`${day}T00:00:00`))
export const formatNumber = (n: number) => (n >= 10_000 ? compact.format(n) : plain.format(n))

export function formatRelative(value: string): string {
  const seconds = (parseApiDate(value).getTime() - Date.now()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return relative.format(Math.round(seconds), 'second')
}

/** API timestamp -> value for <input type="datetime-local"> in the user's timezone. */
export function toLocalInput(value: string | null | undefined): string {
  if (!value) return ''
  const d = parseApiDate(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value (local time) -> ISO string with timezone for the API. */
export function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}
