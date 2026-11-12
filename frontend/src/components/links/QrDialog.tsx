import { Download } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useRef } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { displayShortUrl, shortUrl } from '@/lib/links'

export function QrDialog({ code, open, onClose }: { code: string; open: boolean; onClose: () => void }) {
  const wrapper = useRef<HTMLDivElement>(null)

  function download() {
    const canvas = wrapper.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `qr-${code}.png`
    a.click()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="QR code"
      description={displayShortUrl(code)}
      footer={
        <Button onClick={download} icon={<Download className="size-4" />}>
          Download PNG
        </Button>
      }
    >
      <div ref={wrapper} className="flex justify-center rounded-lg bg-white p-6">
        <QRCodeCanvas value={shortUrl(code)} size={224} marginSize={2} level="M" title={`QR code for ${displayShortUrl(code)}`} />
      </div>
    </Dialog>
  )
}
