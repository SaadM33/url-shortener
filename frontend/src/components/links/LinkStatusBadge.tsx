import type { Link } from '@/api/types'
import { Badge } from '@/components/ui/Badge'
import { linkState } from '@/lib/links'

const look = {
  active: { tone: 'green', label: 'Active' },
  disabled: { tone: 'slate', label: 'Disabled' },
  blocked: { tone: 'red', label: 'Blocked by admin' },
  expired: { tone: 'amber', label: 'Expired' },
  limit: { tone: 'amber', label: 'Click limit reached' },
} as const

export function LinkStatusBadge({ link }: { link: Link }) {
  const { tone, label } = look[linkState(link)]
  return <Badge tone={tone}>{label}</Badge>
}
