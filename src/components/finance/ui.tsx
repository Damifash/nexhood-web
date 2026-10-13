import { useState, type ReactNode } from 'react'
import { AlertCircle, Copy, Check, ImagePlus, X } from 'lucide-react'
import { compressImage } from '@/lib/finance'
import { Spinner } from '@/components/ui/Spinner'

export function ErrorBox({ message }: { message: string }) {
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{message}</span>
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { key: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="no-scrollbar flex gap-2 overflow-x-auto pb-1 mb-5">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          type="button"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-400 ${
            value === t.key ? 'bg-midnight-900 text-warm' : 'bg-white border border-midnight-200 text-midnight-600 hover:border-midnight-300'
          }`}
        >
          {t.label}
          {t.count ? <span className={`ml-2 rounded-full px-1.5 text-xs ${value === t.key ? 'bg-white/20' : 'bg-alert-50 text-alert-700'}`}>{t.count}</span> : null}
        </button>
      ))}
    </div>
  )
}

export function Money({ value, className = '' }: { value: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>₦{Math.round(value || 0).toLocaleString('en-NG')}</span>
}

export function Stat({ label, children, hint, tone = 'neutral' }: { label: string; children: ReactNode; hint?: string; tone?: 'neutral' | 'good' | 'bad' }) {
  const toneCls = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-alert-700' : 'text-midnight-900'
  return (
    <div className="card p-4 sm:p-5 min-w-0">
      <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-midnight-400 truncate">{label}</p>
      <p className={`mt-1.5 font-display text-xl sm:text-2xl font-semibold tabular-nums break-words ${toneCls}`}>{children}</p>
      {hint && <p className="mt-1 text-[11px] sm:text-xs text-midnight-400">{hint}</p>}
    </div>
  )
}

export function CopyText({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* clipboard blocked */
        }
      }}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-royal hover:underline"
      aria-label={`Copy ${label || text}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function ImagePicker({ value, onChange, label = 'Receipt photo' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div>
      <span className="label">{label}</span>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="Selected receipt" className="h-28 rounded-xl border border-midnight-100 object-cover" />
          <button type="button" onClick={() => onChange('')} className="absolute -top-2 -right-2 rounded-full bg-midnight-900 text-warm p-1" aria-label="Remove photo">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-midnight-200 px-4 py-5 text-sm text-midnight-500 cursor-pointer hover:border-royal-300 hover:text-royal">
          {busy ? <Spinner className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />} Take or choose a photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setError('')
              setBusy(true)
              try {
                onChange(await compressImage(f))
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not read that photo')
              } finally {
                setBusy(false)
              }
            }}
          />
        </label>
      )}
      {error && <p className="text-xs text-alert-600 mt-1">{error}</p>}
    </div>
  )
}

export function formatDate(iso?: string | null) {
  if (!iso) return ''
  const v = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  const d = new Date(v.replace(/(\.\d{3})\d+/, '$1'))
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
