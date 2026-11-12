/** Only allow same-site relative paths, so ?next= can't be used to bounce users to another site. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
}
