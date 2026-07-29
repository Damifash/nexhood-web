import { useEffect, useState, type FormEvent } from 'react'
import { Siren, ShieldAlert, PhoneCall, Phone, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { acknowledgeAlert, createAlert, listAlerts, notifyPolice, resolveAlert, getEstate } from '@/lib/api'
import type { Alert } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner, EmptyState } from '@/components/ui/Spinner'
import { Badge, statusTone } from '@/components/ui/Badge'

const TYPES = [
  { value: 'panic', label: 'Panic' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'security_breach', label: 'Security breach' },
  { value: 'fire', label: 'Fire' },
  { value: 'medical', label: 'Medical' },
  { value: 'general', label: 'General' },
]

export default function Alerts() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('emergency')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [policePhone, setPolicePhone] = useState('')
  const [contacts, setContacts] = useState<{ name: string; phone?: string }[]>([])
  const canManage = user?.role === 'guard' || user?.role === 'admin' || user?.role === 'super_admin'

  async function load() {
    setLoading(true)
    try {
      setAlerts(await listAlerts())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

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
  }, [user?.estate_id])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      const priority = type === 'panic' ? 'critical' : 'high'
      const alert = await createAlert({ type, message: message || undefined, priority })
      setAlerts((prev) => [alert, ...prev])
      setMessage('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send alert')
    } finally {
      setSending(false)
    }
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
  // an emergency) and separately fires the email notification/audit-log
  // call in the background — best-effort, doesn't block or interrupt the
  // call if it fails. Previously this button ONLY sent a silent email,
  // which is why it felt like it "did nothing."
  function handlePoliceCall(id: string) {
    notifyPolice(id).then(load).catch(() => {})
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
        subtitle="Send and respond to real-time emergency alerts."
        action={
          policePhone ? (
            <a href={`tel:${policePhone}`} className="btn-alert">
              <Phone className="h-4 w-4" /> Call police
            </a>
          ) : undefined
        }
      />

      {canManage && contacts.some((c) => c.phone) && (
        <div className="card p-4 mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-midnight-400 mr-1">Emergency contacts:</span>
          {contacts.filter((c) => c.phone).map((c, i) => (
            <a key={i} href={`tel:${c.phone}`} className="btn-outline text-xs px-3 py-1.5">
              <Phone className="h-3.5 w-3.5" /> {c.name || 'Call'}
            </a>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3 mb-6">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Siren className="h-5 w-5 text-alert" />
          <h3 className="font-display font-semibold text-midnight-900">Send an alert</h3>
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
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-16 text-royal"><Spinner className="h-6 w-6" /></div>
        ) : alerts.length === 0 ? (
          <EmptyState title="No alerts" subtitle="All quiet — nothing sent yet." />
        ) : (
          <ul className="divide-y divide-midnight-50">
            {alerts.map((a) => {
              const acknowledgedByMe = a.acknowledged_by.some((ack) => ack.user_id === user?.id)
              return (
                <li key={a.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ShieldAlert className={`h-4 w-4 ${a.priority === 'critical' ? 'text-alert' : 'text-amber-500'}`} />
                      <p className="font-medium text-midnight-900 capitalize">{a.type.replace('_', ' ')}</p>
                      <Badge tone={a.priority === 'critical' || a.priority === 'high' ? 'alert' : 'warning'}>{a.priority}</Badge>
                      <Badge tone={statusTone(a.status)}>{a.status}</Badge>
                    </div>
                    {a.message && <p className="text-sm text-midnight-500 mt-1">{a.message}</p>}
                    <p className="text-xs text-midnight-400 mt-1">
                      {new Date(a.created_at).toLocaleString()} · {a.acknowledged_by.length} acknowledged
                      {a.police_status === 'notified' && ' · Police notified'}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    {/* Available to everyone, not just guards/admins — a
                        resident who just raised a critical alert needs to
                        be able to call police themselves, immediately,
                        without waiting on staff. Opens the dialer directly
                        instead of only sending a silent email. */}
                    {a.status !== 'resolved' && (a.priority === 'critical' || a.priority === 'high') && policePhone && (
                      <a
                        href={`tel:${policePhone}`}
                        onClick={() => handlePoliceCall(a.id)}
                        className="btn-alert text-xs px-3 py-1.5"
                      >
                        <PhoneCall className="h-3.5 w-3.5" /> {a.police_status === 'notified' ? 'Call police again' : 'Call police'}
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
                            <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledge
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
