import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    // On phones the modal is a bottom sheet (easy to reach with a thumb, never
    // cut off by the keyboard); on bigger screens it's a centred card.
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-midnight-950/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[92vh] max-h-[92dvh] overflow-y-auto overscroll-contain`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-midnight-100">
          <span className="sm:hidden absolute left-1/2 top-1.5 -translate-x-1/2 h-1 w-10 rounded-full bg-midnight-100" aria-hidden="true" />
          <h3 className="font-display font-semibold text-lg text-midnight-900 min-w-0 truncate">{title}</h3>
          <button onClick={onClose} className="text-midnight-400 hover:text-midnight-700 rounded-full p-1 hover:bg-midnight-50 shrink-0" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
