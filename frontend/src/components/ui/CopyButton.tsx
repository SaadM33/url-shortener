import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from './Button'

export function CopyButton({ text, label = 'Copy', compact }: { text: string; label?: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.")
    }
  }

  const icon = copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />
  return (
    <Button variant={compact ? 'ghost' : 'secondary'} size="sm" onClick={copy} icon={icon} aria-label={compact ? `${label} ${text}` : undefined}>
      {!compact && (copied ? 'Copied' : label)}
    </Button>
  )
}
