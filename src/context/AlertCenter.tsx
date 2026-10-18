import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { io, type Socket } from 'socket.io-client'
import { CheckCircle2, MapPin, Phone, ShieldCheck, Siren, VolumeX, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api, acknowledgeAlert } from '@/lib/api'
import type { Alert } from '@/lib/types'
import {
  ALERT_LABEL, announceAlertsChanged, fetchActiveAlerts, shortBuzz, showLocalNotification, startSiren, startVibration,
  stopSiren, stopVibration, syncPush, unlockAudio,
} from '@/lib/alertsLive'

const POLL_MS = 8_000
// Only take over the screen (with the siren) for alerts raised in the last
// 10 minutes. Older unanswered alerts still show on the Alerts page with a
// red dot, but logging in later doesn't set off a siren for them.
const RECENT_MS = 10 * 60 * 1000

type Ctx = { active: Alert[]; refresh: () => void }
const AlertCtx = createContext<Ctx>({ active: [], refresh: () => {} })
export const useAlertCenter = () => useContext(AlertCtx)

function ago(iso: string) {
  const v = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  const s = Math.max(0, Math.round((Date.now() - new Date(v.replace(/(\.\d{3})\d+/, '$1')).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return `${Math.round(s / 3600)}h ago`
}
function createdMs(iso: string) {
  const v = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  return new Date(v.replace(/(\.\d{3})\d+/, '$1')).getTime()
}

/**
 * Watches for emergencies everywhere in the app:
 *  - live socket + a fetch every 8 seconds as a backup
 *  - guards/admins: full-screen red alert with siren and vibration until someone responds
 *  - the person who raised it: "Mike is responding" as soon as a guard acknowledges
 */
export function AlertCenterProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth()
  const [active, setActive] = useState<Alert[]>([])
  const [takeover, setTakeover] = useState<Alert | null>(null)
  const [muted, setMuted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const dismissed = useRef<Set<string>>(new Set())
  const knownAcks = useRef<Map<string, number>>(new Map())
  const notified = useRef<Set<string>>(new Set())
  const [needsTap, setNeedsTap] = useState(false)
  const firstLoad = useRef(true)
  const isStaff = user?.role === 'guard' || user?.role === 'admin' || user?.role === 'super_admin'

  // First tap anywhere unlocks sound for later.
  useEffect(() => {
    // iPhones only count touchend/click as a real tap for sound.
    const on = () => unlockAudio()
    const evs = ['touchend', 'click', 'keydown'] as const
    evs.forEach((e) => window.addEventListener(e, on, { passive: true }))
    return () => evs.forEach((e) => window.removeEventListener(e, on))
  }, [])

  // Keep this phone registered for push if the person already allowed it.
  useEffect(() => {
    if (user) syncPush()
  }, [user])

  const refresh = useCallback(async () => {
    if (!user) return
    try {
      const list = await fetchActiveAlerts()
      setActive(list)

      // Resident: tell them when someone responds to their alert.
      for (const a of list) {
        const n = a.acknowledged_by?.length || 0
        const before = knownAcks.current.get(a.id)
        if (a.sender_id === user.id && before !== undefined && n > before) {
          const who = a.acknowledged_by[n - 1]
          const msg = `${who?.name || 'Security'} (${who?.role || 'guard'}) is responding to your alert.`
          setToast(msg)
          shortBuzz()
          if (document.hidden) showLocalNotification('Help is coming', msg, `ack-${a.id}`)
        }
        knownAcks.current.set(a.id, n)
      }

      if (isStaff) {
        const urgent = list.find(
          (a) => a.status === 'active' && a.sender_id !== user.id && !dismissed.current.has(a.id) && Date.now() - createdMs(a.created_at) < RECENT_MS,
        )
        setTakeover((cur) => {
          if (cur && list.some((a) => a.id === cur.id && a.status === 'active')) return list.find((a) => a.id === cur.id) || cur
          if (cur) {
            // Someone else responded: keep it on screen briefly with their name.
            const updated = list.find((a) => a.id === cur.id)
            return updated ? updated : null
          }
          return urgent || null
        })
        if (urgent && !notified.current.has(urgent.id)) {
          // Also a system notification: on iPhone this is what makes the phone
          // itself ring and vibrate, even with NexHood open.
          notified.current.add(urgent.id)
          showLocalNotification(`🚨 ${ALERT_LABEL[urgent.type] || 'Alert'} · ${urgent.sender_apartment || 'location not on file'}`, `${urgent.sender_name || 'A resident'} needs help. Tap to respond.`, `alert-${urgent.id}`)
        }
      }
      if (!firstLoad.current) announceAlertsChanged()
      firstLoad.current = false
    } catch {
      /* offline: try again on the next tick */
    }
  }, [user, isStaff])

  // Poll + refresh when the app comes back to the foreground.
  useEffect(() => {
    if (!user) return
    refresh()
    const t = window.setInterval(refresh, POLL_MS)
    const vis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('focus', vis)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('focus', vis)
    }
  }, [user, refresh])

  // Live socket: instant updates when the connection is up.
  useEffect(() => {
    if (!user?.estate_id || !token) return
    let socket: Socket | null = null
    try {
      socket = io(String(api.defaults.baseURL || ''), { transports: ['websocket', 'polling'], reconnection: true })
      socket.on('connect', () => socket?.emit('join_estate', { token, estate_id: user.estate_id }))
      for (const ev of ['emergency_alert', 'alert_acknowledged', 'alert_resolved', 'alert_escalated']) socket.on(ev, () => refresh())
    } catch {
      /* polling still covers us */
    }
    return () => {
      socket?.disconnect()
    }
  }, [user?.estate_id, token, refresh])

  // Siren + vibration while an unanswered alert is on screen.
  const ringing = !!takeover && takeover.status === 'active' && !muted
  useEffect(() => {
    if (ringing) {
      startSiren().then((ok) => setNeedsTap(!ok))
      startVibration()
    } else {
      setNeedsTap(false)
      stopSiren()
      stopVibration()
    }
    return () => {
      stopSiren()
      stopVibration()
    }
  }, [ringing, takeover?.id])

  // Once answered, close the takeover after a few seconds.
  useEffect(() => {
    if (takeover && takeover.status !== 'active') {
      const t = window.setTimeout(() => {
        dismissed.current.add(takeover.id)
        setTakeover(null)
        setMuted(false)
      }, 6000)
      return () => window.clearTimeout(t)
    }
  }, [takeover])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 8000)
    return () => window.clearTimeout(t)
  }, [toast])

  async function respond() {
    if (!takeover) return
    setBusy(true)
    try {
      const updated = await acknowledgeAlert(takeover.id)
      setTakeover(updated)
      setMuted(true)
      announceAlertsChanged()
      refresh()
    } catch {
      /* stays on screen so they can try again */
    } finally {
      setBusy(false)
    }
  }

  function close() {
    if (takeover) dismissed.current.add(takeover.id)
    setTakeover(null)
    setMuted(false)
  }

  const responder = takeover?.acknowledged_by?.[0]
  const others = active.filter((a) => a.status === 'active' && a.id !== takeover?.id && a.sender_id !== user?.id).length

  return (
    <AlertCtx.Provider value={{ active, refresh }}>
      {children}

      {takeover && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="sos-title"
          className={`fixed inset-0 z-[70] flex flex-col text-white ${takeover.status === 'active' ? 'bg-alert' : 'bg-emerald-700'}`}
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {takeover.status === 'active' && <div className="pointer-events-none absolute inset-0 bg-midnight-900/25 animate-pulse" aria-hidden="true" />}
          <div className="relative flex items-center justify-between px-5 pt-4">
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
              {takeover.status === 'active' ? <Siren className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              {takeover.is_drill ? 'Test alert' : takeover.status === 'active' ? 'Emergency' : 'Someone is responding'}
            </span>
            {takeover.status === 'active' && !muted && (
              <button type="button" onClick={() => setMuted(true)} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                <VolumeX className="h-4 w-4" /> Silence
              </button>
            )}
            {takeover.status !== 'active' && (
              <button type="button" onClick={close} className="rounded-full bg-white/15 p-2" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="relative flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-center max-w-lg w-full mx-auto">
            <h2 id="sos-title" className="font-display text-4xl sm:text-5xl font-semibold leading-tight">
              {ALERT_LABEL[takeover.type] || 'Alert'}
            </h2>
            <p className="mt-4 flex items-center gap-2 text-2xl font-semibold">
              <MapPin className="h-6 w-6 shrink-0" /> {takeover.sender_apartment || 'Location not on file'}
            </p>
            <p className="mt-2 text-lg text-white/90">
              {takeover.sender_name || 'A resident'} · {ago(takeover.created_at)}
            </p>
            {takeover.message && <p className="mt-4 rounded-2xl bg-white/15 px-4 py-3 text-lg">“{takeover.message}”</p>}
            {(takeover.escalation_level || 0) > 0 && takeover.status === 'active' && (
              <p className="mt-4 rounded-2xl bg-midnight-900/40 px-4 py-3 font-semibold">No one has responded yet. Please respond now.</p>
            )}
            {responder && (
              <p className="mt-6 flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-lg font-semibold">
                <CheckCircle2 className="h-6 w-6 shrink-0" /> {responder.user_id === user?.id ? 'You are' : `${responder.name || 'A guard'} is`} responding
              </p>
            )}
            {others > 0 && <p className="mt-4 text-sm text-white/80">+{others} more unanswered alert{others === 1 ? '' : 's'}</p>}
          </div>

          <div className="relative px-5 pb-6 space-y-3 max-w-lg w-full mx-auto">
            {needsTap && takeover.status === 'active' && !muted && (
              <button
                type="button"
                onClick={() => {
                  unlockAudio()
                  startSiren().then((ok) => setNeedsTap(!ok))
                }}
                className="w-full rounded-2xl bg-midnight-900 text-white py-3 font-semibold"
              >
                Tap to turn on the siren sound
              </button>
            )}
            {takeover.status === 'active' && (
              <button type="button" onClick={respond} disabled={busy} className="w-full rounded-2xl bg-white text-alert-700 py-4 text-lg font-bold shadow-xl active:scale-[0.98] transition">
                {busy ? 'Sending…' : "I'm responding"}
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              {takeover.sender_phone ? (
                <a href={`tel:${takeover.sender_phone}`} className="rounded-2xl bg-white/15 py-3.5 text-center font-semibold inline-flex items-center justify-center gap-2">
                  <Phone className="h-5 w-5" /> Call {takeover.sender_name?.split(' ')[0] || 'them'}
                </a>
              ) : (
                <span />
              )}
              <Link to="/app/alerts" onClick={close} className="rounded-2xl bg-white/15 py-3.5 text-center font-semibold">
                Open alerts
              </Link>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed inset-x-3 top-3 z-[65] mx-auto max-w-md rounded-2xl bg-emerald-600 text-white px-4 py-3 shadow-xl flex items-start gap-3" style={{ marginTop: 'env(safe-area-inset-top)' }}>
          <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="flex-1 text-sm font-semibold">{toast}</p>
          <button type="button" onClick={() => setToast(null)} aria-label="Close" className="shrink-0"><X className="h-4 w-4" /></button>
        </div>
      )}
    </AlertCtx.Provider>
  )
}
