import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowRight, Check, Copy, RotateCcw } from 'lucide-react'
import { joinWaitlist, type WaitlistEstateSize, type WaitlistResult, type WaitlistRole } from '@/lib/api'
import { Spinner } from '@/components/ui/Spinner'

const ROLES: { value: WaitlistRole; label: string }[] = [
  { value: 'resident', label: 'Resident' },
  { value: 'estate_admin', label: 'Estate admin / Exco / Facility manager' },
  { value: 'security', label: 'Security company / Guard' },
  { value: 'other', label: 'Other' },
]

const SIZES: { value: WaitlistEstateSize; label: string }[] = [
  { value: 'under_50', label: 'Under 50 homes' },
  { value: '50_200', label: '50–200 homes' },
  { value: '200_plus', label: '200+ homes' },
]

const AREAS = [
  // Abuja
  'Gwarinpa', 'Maitama', 'Asokoro', 'Wuse', 'Wuse 2', 'Garki', 'Jabi', 'Utako', 'Katampe', 'Life Camp',
  'Lokogoma', 'Galadimawa', 'Lugbe', 'Kubwa', 'Apo', 'Guzape', 'Wuye', 'Durumi', 'Kado', 'Mabushi',
  'Gudu', 'Dawaki', 'Karsana', 'Idu', 'Maraba', 'Jahi', 'Kaura', 'Dakwo',
  // Lagos
  'Lekki', 'Ajah', 'Ikoyi', 'Victoria Island', 'Ikeja GRA', 'Magodo', 'Surulere', 'Yaba', 'Gbagada', 'Festac', 'Ogudu', 'Chevron', 'Sangotedo',
]

type Form = {
  name: string
  phone: string
  email: string
  role: WaitlistRole | ''
  estate_name: string
  area: string
  estate_size: WaitlistEstateSize | ''
  website: string
}

const EMPTY: Form = { name: '', phone: '', email: '', role: '', estate_name: '', area: '', estate_size: '', website: '' }

function validPhone(raw: string) {
  const d = raw.replace(/[^\d+]/g, '')
  return /^(\+?234\d{10}|0\d{10}|\d{10}|\+[1-9]\d{6,14})$/.test(d)
}

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {}
  if (f.name.trim().length < 2) e.name = 'Enter your name'
  if (!validPhone(f.phone)) e.phone = 'Enter a valid number, e.g. 08012345678'
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'That email doesn’t look right'
  if (!f.role) e.role = 'Pick one'
  if (f.estate_name.trim().length < 2) e.estate_name = 'Which estate?'
  if (f.area.trim().length < 2) e.area = 'Which area?'
  return e
}

function readSource() {
  try {
    const p = new URLSearchParams(window.location.search)
    const utm = ['utm_source', 'utm_medium', 'utm_campaign']
      .map((k) => (p.get(k) ? `${k}=${p.get(k)}` : ''))
      .filter(Boolean)
      .join('&')
    const ref = document.referrer ? `referrer=${new URL(document.referrer).hostname}` : ''
    return [utm, ref].filter(Boolean).join('&').slice(0, 300) || undefined
  } catch {
    return undefined
  }
}

function readRef() {
  try {
    const r = new URLSearchParams(window.location.search).get('ref')
    return r && /^[A-Za-z0-9]{4,12}$/.test(r) ? r.toUpperCase() : undefined
  } catch {
    return undefined
  }
}

export function Waitlist({ presetRole }: { presetRole: WaitlistRole | null }) {
  const [form, setForm] = useState<Form>(EMPTY)
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<(WaitlistResult & { firstName: string; estate: string }) | null>(null)
  const openedAt = useRef(Date.now())
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (presetRole) {
      setForm((f) => ({ ...f, role: presetRole }))
      nameRef.current?.focus({ preventScroll: true })
    }
  }, [presetRole])

  const errors = useMemo(() => validate(form), [form])
  const show = (k: keyof Form) => (submitted || touched[k]) && errors[k]

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    setError('')
    if (Object.keys(errors).length) {
      // Wait one tick so the error attributes from setSubmitted are rendered.
      setTimeout(() => document.querySelector<HTMLElement>('form [aria-invalid="true"]')?.focus(), 0)
      return
    }
    setLoading(true)
    try {
      const res = await joinWaitlist({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        role: form.role as WaitlistRole,
        estate_name: form.estate_name.trim(),
        area: form.area.trim(),
        estate_size: form.role === 'estate_admin' && form.estate_size ? form.estate_size : undefined,
        source: readSource(),
        ref: readRef(),
        website: form.website,
        elapsed_ms: Date.now() - openedAt.current,
      })
      setResult({ ...res, firstName: form.name.trim().split(/\s+/)[0], estate: form.estate_name.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the waitlist. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (result) return <WaitlistSuccess result={result} />

  const field = (k: keyof Form) => ({
    id: `wl-${k}`,
    'aria-invalid': show(k) ? true : undefined,
    'aria-describedby': show(k) ? `wl-${k}-err` : undefined,
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
  })
  const Err = ({ k }: { k: keyof Form }) =>
    show(k) ? (
      <p id={`wl-${k}-err`} className="mt-1 text-xs text-alert-600">
        {errors[k]}
      </p>
    ) : null

  return (
    <form onSubmit={onSubmit} noValidate className="card p-5 sm:p-8 space-y-4 text-left">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="submit" className="inline-flex items-center gap-1 font-semibold underline">
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="wl-name" className="label">Full name</label>
          <input ref={nameRef} {...field('name')} className="input" autoComplete="name" placeholder="Amaka Okafor" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Err k="name" />
        </div>
        <div>
          <label htmlFor="wl-phone" className="label">Phone / WhatsApp</label>
          <input {...field('phone')} className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          <Err k="phone" />
        </div>
      </div>

      <div>
        <label htmlFor="wl-email" className="label">
          Email <span className="normal-case font-normal text-midnight-300">(optional, so we can send your link)</span>
        </label>
        <input {...field('email')} className="input" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <Err k="email" />
      </div>

      <fieldset>
        <legend id="wl-role-legend" className="label">I am a…</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-labelledby="wl-role-legend">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={`press flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm cursor-pointer transition ${
                form.role === r.value ? 'border-royal bg-royal-50 text-midnight-900' : 'border-midnight-200 bg-white text-midnight-600 hover:border-midnight-300'
              } focus-within:ring-2 focus-within:ring-royal-400`}
            >
              <input
                type="radio"
                name="wl-role"
                value={r.value}
                checked={form.role === r.value}
                onChange={() => {
                  set('role', r.value)
                  setTouched((t) => ({ ...t, role: true }))
                }}
                aria-invalid={show('role') ? true : undefined}
                className="accent-royal"
              />
              {r.label}
            </label>
          ))}
        </div>
        <Err k="role" />
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="wl-estate_name" className="label">Estate name</label>
          <input {...field('estate_name')} className="input" placeholder="e.g. Sunshine Homes" value={form.estate_name} onChange={(e) => set('estate_name', e.target.value)} />
          <Err k="estate_name" />
        </div>
        <div>
          <label htmlFor="wl-area" className="label">Area / city</label>
          <input {...field('area')} className="input" list="wl-areas" placeholder="e.g. Gwarinpa, Abuja" value={form.area} onChange={(e) => set('area', e.target.value)} />
          <datalist id="wl-areas">
            {AREAS.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
          <Err k="area" />
        </div>
      </div>

      {form.role === 'estate_admin' && (
        <div>
          <label htmlFor="wl-estate_size" className="label">Roughly how many homes?</label>
          <select id="wl-estate_size" className="input" value={form.estate_size} onChange={(e) => set('estate_size', e.target.value as WaitlistEstateSize | '')}>
            <option value="">Choose one</option>
            {SIZES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Honeypot: hidden from people and screen readers, bots fill it in. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor="wl-website">Website</label>
        <input id="wl-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
      </div>

      <button type="submit" disabled={loading} className="btn-alert press w-full py-3 text-base">
        {loading ? <Spinner className="h-5 w-5" /> : <>Join the waitlist <ArrowRight className="h-4 w-4" /></>}
      </button>
      <p className="text-xs text-midnight-400 text-center">We’ll only use your details to bring NexHood to your estate. No spam.</p>
    </form>
  )
}

function WaitlistSuccess({ result }: { result: WaitlistResult & { firstName: string; estate: string } }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/?ref=${encodeURIComponent(result.ref_code)}#waitlist`
  const message =
    `I just joined the NexHood waitlist for ${result.estate}. ` +
    `It's security that works together: QR passes at the gate, a panic button that reaches security and police, and open accounts for service charge. ` +
    `Estates move up the list when more neighbours join: ${link}`
  const wa = `https://wa.me/?text=${encodeURIComponent(message)}`
  const others = Math.max(0, (result.estate_count || 0))

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy your link', link)
    }
  }

  return (
    <div className="card p-6 sm:p-10 text-center slide-check" role="status" aria-live="polite">
      <span className="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
        <Check className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-display text-2xl font-semibold text-midnight-900">
        {result.already_joined ? `You’re already on the list, ${result.firstName}.` : `You’re on the list, ${result.firstName}.`}
      </h3>
      {others > 0 && (
        <p className="mt-2 text-midnight-600">
          <strong className="text-midnight-900">{others}</strong> {others === 1 ? 'person' : 'people'} from {result.estate} {others === 1 ? 'has' : 'have'} joined.
        </p>
      )}
      <p className="mt-4 text-midnight-500 max-w-md mx-auto">
        Estates move up the list when more neighbours join. Share with your estate WhatsApp group.
      </p>
      {result.ref_code ? (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn press bg-[#1FAF38] text-white hover:bg-[#178a2c] text-base px-6 py-3">
            <WhatsAppIcon /> Share on WhatsApp
          </a>
          <button type="button" onClick={copy} className="btn-outline press text-base px-6 py-3">
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy link</>}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2Zm5.8 14.03c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.92-4.66-4.1-.13-.18-1.11-1.48-1.11-2.82 0-1.34.7-2 .95-2.27.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.56.79 1.92.86 2.06.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.34Z" />
    </svg>
  )
}
