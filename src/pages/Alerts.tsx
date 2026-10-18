import { useEffect, useState, type FormEvent } from 'react'
import { Siren, ShieldAlert, PhoneCall, Phone, AlertCircle, CheckCircle2, X, MapPin, FlaskConical, Clock } from 'lucide-react'
import { EMERGENCY_NUMBERS } from '@/lib/emergencyNumbers'
import { acknowledgeAlert, createAlert, listAlerts, notifyPolice, resolveAlert, getEstate, getEstateContacts } from '@/lib/api'
import type { Alert } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner, EmptyState } from '@/components/ui/Spinner'
import { Badge, statusTone } from '@/components/ui/Badge'
import { AlertSetupCard } from '@/components/alerts/AlertSetupCard'
import { unlockAudio } from '@/lib/alertsLive'

const TYPES = [
  { value: 'panic', label: 'Panic' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'security_breach', label: 'Security breach' },
  { value: 'fire', label: 'Fire' },
  { value: 'medical', label: 'Medical' },
  { value: 'general', label: 'General' },
]

// Which call buttons each alert type deserves. Showing "Call police" on
// every alert taught people to ignore it — the action should match the
// situation: crime-related alerts point at police, fire/medical point at
// the estate's emergency contacts, and every urgent type offers the gate
// guard, who is closest and fastest. General alerts get no call button.
const CALL_ACTIONS: Record<string, Array<'police' | 'guard' | 'emergency'>> = {
  panic: ['police', 'guard'],
  emergency: ['police', 'guard'],
  security_breach: ['police', 'guard'],
  fire: ['emergency', 'guard'],
  medical: ['emergency', 'guard'],
  general: [],
  drill: [],
}

function isOld(a: Alert) {
  const v = /[zZ]|[+-]\d{2}:?\d{2}$/.test(a.created_at) ? a.created_at : a.created_at + 'Z'
  return Date.now() - new Date(v.replace(/(\.\d{3})\d+/, '$1')).getTime() > 24 * 3600 * 1000
}

export default function Alerts() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('emergency')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [policePhone, setPolicePhone] = useState('')
  const [contacts, setContacts] = useState<{ name: string; phone?: string }[]>([])
  const [guards, setGuards] = useState<{ id: string; name?: string; phone?: string }[]>([])
  const canManage = user?.role === 'guard' || user?.role === 'admin' || user?.role === 'super_admin'

  async function load(quiet = false) {
    if (!quiet) setLoading(true)
    try {
      setAlerts(await listAlerts())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // The alert centre announces every change (new alert, someone responding).
    const on = () => load(true)
    window.addEventListener('nexhood:alerts-changed', on)
    return () => window.removeEventListener('nexhood:alerts-changed', on)
  }, [])

  const [closingOld, setClosingOld] = useState(false)
  const oldOpen = alerts.filter((a) => a.status !== 'resolved' && isOld(a))
  async function closeOld() {
    setClosingOld(true)
    try {
      for (const a of oldOpen) await resolveAlert(a.id)
      await load(true)
      setNotice(`Closed ${oldOpen.length} old alert${oldOpen.length === 1 ? '' : 's'}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close old alerts')
    } finally {
      setClosingOld(false)
    }
  }

  const myOpen = alerts.find((a) => a.sender_id === user?.id && a.status !== 'resolved' && !isOld(a) && !a.is_drill)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  // Email delivery isn't instant enough to rely on for real emergencies —
  // a direct call is the actual fast path, so pull the estate's police
  // number in for a one-tap "Call police" button. This used to be limited
  // to guards/admins, but a resident in the middle of an emergency needs
  // this exactly as much — sometimes more, since they're often first on
  // the scene. Emergency contacts stay management-only below.
  useEffect(() => {
    if (!user?.estate_id) return
    getEstate(user.estate_id)
      .then((estate) => {
        setPolicePhone((estate.settings?.police_phone as string) || '')
        setContacts((estate.settings?.emergencyContacts as { name: string; phone?: string }[]) || [])
      })
      .catch(() => {})
    // Guard/admin phone directory — so a resident can ring the gate guard
    // directly instead of only having "police" as an option.
    getEstateContacts()
      .then((c) => setGuards(c.guards.filter((g) => g.phone)))
      .catch(() => {})
  }, [user?.estate_id])

  async function send(kind: string) {
    unlockAudio()
    setError('')
    setNotice('')
    setSending(true)
    try {
      const priority = kind === 'panic' ? 'critical' : 'high'
      const alert = await createAlert({ type: kind, message: message || undefined, priority })
      setAlerts((prev) => [alert, ...prev])
      setMessage('')
      if (kind === 'drill') setNotice('Test alert sent. Every guard and admin phone should ring now. Check who responds and how fast.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send alert')
    } finally {
      setSending(false)
    }
  }

  // Panic: a 3-second countdown with Cancel, so a pocket tap doesn't raise a false alarm.
  const [countdown, setCountdown] = useState<number | null>(null)
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setCountdown(null)
      send('panic')
      return
    }
    if ('vibrate' in navigator) navigator.vibrate(120)
    const t = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    await send(type)
  }

  // Each of these used to fail silently on error — a 403/404 would just
  // throw and nothing would happen on screen, which is exactly what looked
  // like a "broken button." Surface failures through the same error banner
  // the send-alert form uses.
  async function handleAck(id: string) {
    try {
      const updated = await acknowledgeAlert(id)
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not acknowledge alert')
    }
  }

  // Opens the phone dialer immediately (the part that actually matters in
  // an emergency) and separately fires the notification call in the
  // background — best-effort, doesn't block or interrupt the call if it
  // fails. Previously this gave zero on-screen feedback either way, which
  // is why it felt like the button "did nothing" even when the email
  // technically sent — now it always surfaces a banner saying exactly what
  // happened (notified N people, or "no police contact set up yet").
  function handlePoliceCall(id: string) {
    setNotice('')
    setError('')
    notifyPolice(id)
      .then((res) => {
        setNotice(res.message)
        return load()
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not notify police'))
  }

  async function handleResolve(id: string) {
    try {
      const updated = await resolveAlert(id)
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resolve alert')
    }
  }

  return (
    <div>
      <PageHeader
        title="Alerts"
        subtitle={canManage ? 'Every alert rings guard and admin phones until someone responds.' : 'Press the button and every guard on duty is alerted at once.'}
        action={
          <a href={`tel:${policePhone || '112'}`} className="btn-alert">
            <Phone className="h-4 w-4" /> {policePhone ? 'Call police' : 'Call 112'}
          </a>
        }
      />

      {/* Quick-dial strip — visible to EVERY role, not just management.
          A resident in trouble should be two taps from the gate guard's
          phone. Guards come first (closest responder), then the estate's
          configured emergency contacts. Entries without a phone number
          are simply not rendered. */}
      {(guards.length > 0 || contacts.some((c) => c.phone)) && (
        <div className="card p-4 mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-midnight-400 mr-1">Quick contacts:</span>
          {guards.map((g) => (
            <a key={g.id} href={`tel:${g.phone}`} className="btn-outline text-xs px-3 py-1.5">
              <Phone className="h-3.5 w-3.5" /> {g.name ? `${g.name} (Guard)` : 'Gate guard'}
            </a>
          ))}
          {contacts.filter((c) => c.phone).map((c, i) => (
            <a key={i} href={`tel:${c.phone}`} className="btn-outline text-xs px-3 py-1.5">
              <Phone className="h-3.5 w-3.5" /> {c.name || 'Call'}
            </a>
          ))}
        </div>
      )}

      <details className="card p-4 mb-6 group">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
          <span className="font-semibold text-midnight-900 flex items-center gap-2">
            <Phone className="h-4 w-4 text-alert" /> Emergency numbers
          </span>
          <span className="text-xs text-midnight-400 group-open:hidden">Show</span>
        </summary>
        <ul className="mt-3 divide-y divide-midnight-100">
          {policePhone && (
            <li className="py-2.5 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-midnight-900">Estate police contact</span>
                <span className="block text-xs text-midnight-400">Added by your estate admin</span>
              </span>
              <a href={`tel:${policePhone}`} className="btn-outline text-xs px-3 py-1.5 shrink-0">
                <Phone className="h-3.5 w-3.5" /> {policePhone}
              </a>
            </li>
          )}
          {EMERGENCY_NUMBERS.map((n) => (
            <li key={n.phone} className="py-2.5 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-midnight-900">{n.label}</span>
                <span className="block text-xs text-midnight-400">{n.detail}</span>
              </span>
              <a href={`tel:${n.phone}`} className="btn-outline text-xs px-3 py-1.5 shrink-0">
                <Phone className="h-3.5 w-3.5" /> {n.display}
              </a>
            </li>
          ))}
        </ul>
      </details>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3 mb-6">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3 mb-6">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>{notice}</span>
        </div>
      )}

      {myOpen && (
        <div className={`card p-5 mb-6 border-2 ${myOpen.acknowledged_by.length ? 'border-emerald-300 bg-emerald-50/60' : 'border-alert/40 bg-alert-50/60'}`} role="status">
          {myOpen.acknowledged_by.length ? (
            <p className="flex items-center gap-2 font-semibold text-emerald-800">
              <CheckCircle2 className="h-5 w-5" /> {myOpen.acknowledged_by[0].name || 'Security'} is responding to your alert
            </p>
          ) : (
            <p className="flex items-center gap-2 font-semibold text-alert-700">
              <Clock className="h-5 w-5 animate-pulse" /> Alert sent. Guards’ phones are ringing. Waiting for someone to respond…
            </p>
          )}
          <p className="text-sm text-midnight-500 mt-1">If you can, call the gate guard or the police using the buttons below.</p>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm('Call off this alert? Guards will be told you are safe.')) return
              await handleResolve(myOpen.id)
              setNotice('Alert called off. Guards have been told you are safe.')
            }}
            className="btn-outline mt-3 text-sm"
          >
            <CheckCircle2 className="h-4 w-4" /> I'm safe, cancel alert
          </button>
        </div>
      )}

      {canManage && <div className="mb-6"><AlertSetupCard hideWhenOn compact /></div>}

      {!canManage && (
        countdown !== null ? (
          <div className="w-full mb-6 rounded-3xl bg-midnight-900 text-white py-6 px-5 shadow-xl flex flex-col items-center gap-3" role="status">
            <span className="font-display text-5xl font-semibold tabular-nums">{countdown}</span>
            <span className="text-sm text-white/85">Sending panic alert…</span>
            <button type="button" onClick={() => setCountdown(null)} className="rounded-full bg-white text-midnight-900 px-8 py-3 font-semibold">
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              unlockAudio()
              setCountdown(3)
            }}
            disabled={sending}
            className="w-full mb-6 rounded-3xl bg-alert text-white py-8 shadow-xl active:scale-[0.98] transition flex flex-col items-center justify-center gap-2 disabled:opacity-70"
          >
            {sending ? <Spinner className="h-8 w-8" /> : <Siren className="h-10 w-10" />}
            <span className="font-display text-2xl font-semibold">Panic button</span>
            <span className="text-sm text-white/85">Alerts every guard and the admin at once</span>
          </button>
        )
      )}

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Siren className="h-5 w-5 text-alert" />
          <h3 className="font-display font-semibold text-midnight-900">{canManage ? 'Send an alert' : 'Other kinds of alert'}</h3>
        </div>
        <form onSubmit={handleSend} className="flex flex-col sm:flex-row gap-3">
          <select className="input sm:w-48" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input className="input flex-1" placeholder="Optional details..." value={message} onChange={(e) => setMessage(e.target.value)} />
          <button className="btn-alert" disabled={sending}>
            {sending ? <Spinner className="h-4 w-4" /> : 'Send alert'}
          </button>
        </form>
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-midnight-50 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => send('drill')} disabled={sending} className="btn-outline text-sm">
              <FlaskConical className="h-4 w-4" /> Run a test alert
            </button>
            <p className="text-xs text-midnight-400 flex-1 min-w-[12rem]">Rings every guard and admin phone, marked as a test. Do one each month to check everyone responds.</p>
          </div>
        )}
      </div>

      {canManage && oldOpen.length > 0 && (
        <div className="mb-6 rounded-xl bg-amber-50 text-amber-800 text-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span>{oldOpen.length} alert{oldOpen.length === 1 ? ' is' : 's are'} still open from over a day ago. Close them so new emergencies stand out.</span>
          <button type="button" onClick={closeOld} disabled={closingOld} className="btn-outline text-xs px-3 py-1.5">
            {closingOld ? <Spinner className="h-3.5 w-3.5" /> : 'Close old alerts'}
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-16 text-royal"><Spinner className="h-6 w-6" /></div>
        ) : alerts.length === 0 ? (
          <EmptyState title="No alerts" subtitle="All quiet — nothing sent yet." />
        ) : (
          <ul className="divide-y divide-midnight-50">
            {alerts.map((a) => {
              const acknowledgedByMe = a.acknowledged_by.some((ack) => ack.user_id === user?.id)
              // The right call-to-action depends on WHAT the alert is, not
              // just how urgent it is — see CALL_ACTIONS above.
              const actions = a.status !== 'resolved' ? (CALL_ACTIONS[a.type] ?? []) : []
              const firstGuard = guards[0]
              const firstContact = contacts.find((c) => c.phone)
              return (
                <li key={a.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ShieldAlert className={`h-4 w-4 ${a.priority === 'critical' ? 'text-alert' : 'text-amber-500'}`} />
                      <p className="font-medium text-midnight-900 capitalize">{a.is_drill ? 'Test alert' : a.type.replace('_', ' ')}</p>
                      <Badge tone={a.priority === 'critical' || a.priority === 'high' ? 'alert' : 'warning'}>{a.priority}</Badge>
                      <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                    </div>
                    <p className="text-sm text-midnight-700 mt-1 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-midnight-400" />
                      <span className="font-semibold">{a.sender_apartment || 'Location not on file'}</span>
                      <span className="text-midnight-400">· {a.sender_name || 'Resident'}</span>
                    </p>
                    {a.message && <p className="text-sm text-midnight-500 mt-1">{a.message}</p>}
                    <p className="text-xs text-midnight-400 mt-1">
                      {new Date(a.created_at).toLocaleString()} ·{' '}
                      {a.acknowledged_by.length
                        ? `${a.acknowledged_by.map((x) => x.name || x.role).join(', ')} responding`
                        : a.status === 'resolved' ? 'closed' : <span className="text-alert-600 font-semibold">no one has responded yet</span>}
                      {a.police_status === 'notified' && ' · Police notified'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {/* Call buttons are chosen by alert TYPE (see CALL_ACTIONS):
                        crime → police, fire/medical → emergency contact,
                        and every urgent type also offers the gate guard.
                        All available to every role — a resident who just
                        raised the alert needs these the most. */}
                    {actions.includes('police') && policePhone && (
                      <a
                        href={`tel:${policePhone}`}
                        onClick={() => handlePoliceCall(a.id)}
                        className="btn-alert text-xs px-3 py-1.5"
                      >
                        <PhoneCall className="h-3.5 w-3.5" /> {a.police_status === 'notified' ? 'Call police again' : 'Call police'}
                      </a>
                    )}
                    {actions.includes('emergency') && firstContact && (
                      <a href={`tel:${firstContact.phone}`} className="btn-alert text-xs px-3 py-1.5">
                        <PhoneCall className="h-3.5 w-3.5" /> Call {firstContact.name || 'emergency contact'}
                      </a>
                    )}
                    {/* Not shown to guards — they ARE the guard. They get
                        police + the sender's number instead. */}
                    {actions.includes('guard') && firstGuard && user?.role !== 'guard' && (
                      <a href={`tel:${firstGuard.phone}`} className="btn-outline text-xs px-3 py-1.5">
                        <Phone className="h-3.5 w-3.5" /> Call guard{firstGuard.name ? ` (${firstGuard.name})` : ''}
                      </a>
                    )}
                    {canManage && (
                      <>
                        {a.sender_phone && (
                          <a href={`tel:${a.sender_phone}`} className="btn-outline text-xs px-3 py-1.5">
                            <Phone className="h-3.5 w-3.5" /> Call {a.sender_name || 'sender'}
                          </a>
                        )}
                        {a.status !== 'resolved' && !acknowledgedByMe && (
                          <button onClick={() => handleAck(a.id)} className="btn-outline text-xs px-3 py-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> I'm responding
                          </button>
                        )}
                        {a.status !== 'resolved' && (
                          <button onClick={() => handleResolve(a.id)} className="btn-outline text-xs px-3 py-1.5">
                            <X className="h-3.5 w-3.5" /> Resolve
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
