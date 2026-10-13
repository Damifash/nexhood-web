// Everything that makes an emergency alert reach a phone: the siren sound,
// vibration, phone notifications (Web Push) and the live alert feed.
import { api } from '@/lib/api'
import type { Alert } from '@/lib/types'

/* ------------------------------------------------------------------ */
/* Siren (generated with Web Audio, so there is no sound file to load) */
/* ------------------------------------------------------------------ */
let ctx: AudioContext | null = null
let sirenTimer: number | null = null
let sirenNodes: { osc: OscillatorNode; gain: GainNode } | null = null

function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  return ctx
}

/** Browsers only allow sound after the person has tapped the page once.
 * Called on the first tap anywhere in the app, so the siren can play later. */
export function unlockAudio() {
  const c = audioCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  // A silent blip "primes" iOS Safari.
  try {
    const o = c.createOscillator()
    const g = c.createGain()
    g.gain.value = 0
    o.connect(g).connect(c.destination)
    o.start()
    o.stop(c.currentTime + 0.01)
  } catch {
    /* ignore */
  }
}

export function audioReady() {
  return !!ctx && ctx.state === 'running'
}

/** Two-tone wailing siren until stopSiren() (or maxMs) */
export function startSiren(maxMs = 90_000) {
  const c = audioCtx()
  if (!c || sirenNodes) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sawtooth'
  gain.gain.value = 0.35
  osc.connect(gain).connect(c.destination)
  const t0 = c.currentTime
  // Sweep 700Hz -> 1300Hz and back every 1.2s for the full duration.
  for (let t = 0; t < maxMs / 1000; t += 1.2) {
    osc.frequency.setValueAtTime(700, t0 + t)
    osc.frequency.linearRampToValueAtTime(1300, t0 + t + 0.6)
    osc.frequency.linearRampToValueAtTime(700, t0 + t + 1.2)
  }
  osc.start()
  sirenNodes = { osc, gain }
  sirenTimer = window.setTimeout(stopSiren, maxMs)
}

export function stopSiren() {
  if (sirenTimer) window.clearTimeout(sirenTimer)
  sirenTimer = null
  if (sirenNodes) {
    try {
      sirenNodes.gain.gain.value = 0
      sirenNodes.osc.stop()
    } catch {
      /* already stopped */
    }
    sirenNodes = null
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
export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off'
  return (await syncPush()) ? 'on' : 'server-off'
}

/** Make sure this phone's subscription is saved on the server. Safe to call
 * on every app start once permission is granted. */
export async function syncPush(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    const { data } = await api.get('/api/push/public-key')
    if (!data?.enabled || !data.public_key) return false
    let sub = await reg.pushManager.getSubscription()
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
  return data as { sent: number; enabled: boolean }
}

/** While the app is open but in the background, show a phone notification. */
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
