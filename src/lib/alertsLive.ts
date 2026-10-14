// Everything that makes an emergency alert reach a phone: the siren sound,
// vibration, phone notifications (Web Push) and the live alert feed.
import { api } from '@/lib/api'
import type { Alert } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Siren                                                               */
/* iPhones mute Web Audio when the ring/silent switch is off, and only  */
/* allow sound after a tap. So the siren is a real <audio> element (a   */
/* generated WAV), "unlocked" on the first tap, with the audio session  */
/* set to playback so it plays through the silent switch on iOS 17+.    */
/* ------------------------------------------------------------------ */
let sirenEl: HTMLAudioElement | null = null
let sirenTimer: number | null = null
let unlocked = false
let ctx: AudioContext | null = null

function setPlaybackSession() {
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession
    if (session) session.type = 'playback'
  } catch {
    /* older browsers */
  }
}

/** Builds a 2.4 second two-tone wail as a WAV file in memory. */
function sirenWavUrl() {
  const rate = 22050
  const seconds = 2.4
  const n = Math.floor(rate * seconds)
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const w = (o: number, str: string) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  w(36, 'data'); v.setUint32(40, n * 2, true)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = (i / rate) % 1.2
    const f = t < 0.6 ? 700 + (600 * t) / 0.6 : 1300 - (600 * (t - 0.6)) / 0.6
    phase += (2 * Math.PI * f) / rate
    // a little odd harmonic makes it cut through like a real siren
    const sample = 0.75 * Math.sin(phase) + 0.2 * Math.sin(3 * phase)
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true)
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

function siren(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null
  if (!sirenEl) {
    sirenEl = new Audio(sirenWavUrl())
    sirenEl.loop = true
    sirenEl.preload = 'auto'
    sirenEl.setAttribute('playsinline', '')
  }
  return sirenEl
}

/** Call from a tap. Plays the siren silently for a moment so the phone
 * allows it to play for real later. */
export function unlockAudio() {
  setPlaybackSession()
  const el = siren()
  if (el && !unlocked && el.paused) {
    el.muted = true
    el.play()
      .then(() => {
        unlocked = true
        if (!sirenTimer) {
          el.pause()
          el.currentTime = 0
        }
        el.muted = false
      })
      .catch(() => {
        el.muted = false
      })
  }
  // Web Audio too (used as a fallback on browsers without <audio> autoplay).
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctor && !ctx) ctx = new Ctor()
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
  } catch {
    /* ignore */
  }
}

export function audioReady() {
  return unlocked
}

/** Starts the siren. Resolves false if the phone blocked the sound (no tap yet). */
export async function startSiren(maxMs = 90_000): Promise<boolean> {
  setPlaybackSession()
  const el = siren()
  if (!el) return false
  if (sirenTimer) window.clearTimeout(sirenTimer)
  sirenTimer = window.setTimeout(stopSiren, maxMs)
  try {
    el.muted = false
    el.volume = 1
    el.currentTime = 0
    await el.play()
    unlocked = true
    return true
  } catch {
    return false
  }
}

export function stopSiren() {
  if (sirenTimer) window.clearTimeout(sirenTimer)
  sirenTimer = null
  if (sirenEl) {
    sirenEl.pause()
    sirenEl.currentTime = 0
  }
}

/* ------------------------------------------------------------------ */
/* Vibration (Android; iPhones don't allow web pages to vibrate)       */
/* ------------------------------------------------------------------ */
let vibeTimer: number | null = null
export const canVibrate = () => typeof navigator !== 'undefined' && 'vibrate' in navigator

export function startVibration() {
  if (!canVibrate() || vibeTimer) return
  const buzz = () => navigator.vibrate([900, 300, 900, 300, 900])
  buzz()
  vibeTimer = window.setInterval(buzz, 4000)
}

export function stopVibration() {
  if (vibeTimer) window.clearInterval(vibeTimer)
  vibeTimer = null
  if (canVibrate()) navigator.vibrate(0)
}

export function shortBuzz() {
  if (canVibrate()) navigator.vibrate([200, 100, 200])
}

/* ------------------------------------------------------------------ */
/* Phone notifications (Web Push)                                      */
/* ------------------------------------------------------------------ */
export type PushState = 'on' | 'off' | 'denied' | 'unsupported' | 'needs-install' | 'server-off'

export const isIOS = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true)

function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

function keyToBytes(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0))
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  try {
    const reg = await navigator.serviceWorker.getRegistration('/')
    const sub = await reg?.pushManager.getSubscription()
    return sub ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

/** Ask permission (must be called from a tap), then register this phone. */
export async function enablePush(fresh = false): Promise<PushState> {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off'
  return (await syncPush(fresh)) ? 'on' : 'server-off'
}

/** Make sure this phone's subscription is saved on the server. Safe to call
 * on every app start once permission is granted. */
export async function syncPush(fresh = false): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    const { data } = await api.get('/api/push/public-key')
    if (!data?.enabled || !data.public_key) return false
    let sub = await reg.pushManager.getSubscription()
    if (sub && fresh) {
      // Start clean: iPhones sometimes keep a subscription that no longer delivers.
      await sub.unsubscribe().catch(() => {})
      sub = null
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(data.public_key) })
    const json = sub.toJSON()
    await api.post('/api/push/subscribe', { endpoint: json.endpoint, keys: json.keys })
    return true
  } catch {
    return false
  }
}

export async function sendTestPush() {
  const { data } = await api.post('/api/push/test')
  return data as { sent: number; enabled: boolean; devices?: string[]; errors?: string[] }
}

/** Show a phone notification from the open app. On iPhone this is the only way to get the phone's own
 * notification sound and vibration while NexHood is on screen. */
export async function showLocalNotification(title: string, body: string, tag: string) {
  if (!pushSupported() || Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker.getRegistration('/')
    await reg?.showNotification(title, {
      body,
      tag,
      requireInteraction: true,
      icon: '/icon-192.png',
      data: { url: '/app/alerts' },
      // vibrate is supported on Android
      ...({ vibrate: [900, 300, 900, 300, 900], renotify: true } as Record<string, unknown>),
    })
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Live feed                                                           */
/* ------------------------------------------------------------------ */
export async function fetchActiveAlerts() {
  const { data } = await api.get('/api/alerts/active')
  return data as Alert[]
}

export const ALERT_LABEL: Record<string, string> = {
  panic: 'PANIC',
  emergency: 'Emergency',
  security_breach: 'Security breach',
  fire: 'Fire',
  medical: 'Medical emergency',
  general: 'Alert',
  drill: 'Test alert (drill)',
}

/** Other parts of the app (Alerts page, dashboard) listen for this to refresh. */
export function announceAlertsChanged() {
  window.dispatchEvent(new Event('nexhood:alerts-changed'))
}
