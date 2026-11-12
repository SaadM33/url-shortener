import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

import { Button } from './Button'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** Native <dialog>: focus trapping, Esc to close and the top layer come for free. */
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // showModal() focuses the first focusable element (the close button); prefer the first form field
      dialog.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      {open && (
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="dialog-title" className="text-lg font-semibold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" icon={<X className="size-4" />} />
          </div>
          {children}
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

type ConfirmProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: ReactNode
  confirmLabel: string
  loading?: boolean
  danger?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, loading, danger = true }: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
    </Dialog>
  )
}
