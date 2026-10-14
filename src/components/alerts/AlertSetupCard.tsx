import { useEffect, useState } from 'react'
import { BellRing, CheckCircle2, Share, Smartphone, Volume2 } from 'lucide-react'
import { Spinner } from '@/components/ui/Spinner'
import {
  canVibrate, enablePush, getPushState, isIOS, sendTestPush, startSiren, startVibration, stopSiren, stopVibration, unlockAudio, type PushState,
} from '@/lib/alertsLive'

/**
 * "Get emergency alerts on this phone": turns on phone notifications and
 * lets the person test the siren and vibration. Shown on the dashboard for
 * guards and admins until it's on, and always in Settings.
 */
export function AlertSetupCard({ compact = false, hideWhenOn = false }: { compact?: boolean; hideWhenOn?: boolean }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    getPushState().then(setState)
  }, [])

  async function turnOn(fresh = false) {
    unlockAudio()
    setBusy(true)
    setMsg('')
    const s = await enablePush(fresh)
    if (fresh && s === 'on') setMsg('Phone re-connected. Tap “Test siren and vibration” to check.')
    setState(s)
    if (s === 'server-off') setMsg('Phone notifications are not switched on on the server yet. The siren still works while the app is open.')
    setBusy(false)
  }

  async function test() {
    unlockAudio()
    setTesting(true)
    const played = await startSiren(3000)
    if (!played) setMsg('Your phone blocked the sound. Turn the volume up, tap the button again, and check the side switch is not on silent.')
    startVibration()
    window.setTimeout(() => {
      stopSiren()
      stopVibration()
      setTesting(false)
    }, 3000)
    if (state === 'on') {
      try {
        const r = await sendTestPush()
        if (r.errors && r.errors.length) setMsg(`Problem sending to this phone: ${r.errors[0]}`)
        else if (r.sent) setMsg(`Test notification sent to ${r.sent} device${r.sent === 1 ? '' : 's'}. On iPhone, lock the screen or leave the app to see it.`)
        else setMsg('No device is registered for your account yet. Tap “Turn on emergency alerts” again.')
      } catch {
        setMsg('Siren tested. The test notification could not be sent.')
      }
    }
  }

  if (state === null) return null
  if (hideWhenOn && state === 'on') return null

  return (
    <section className={`card ${compact ? 'p-4' : 'p-5 sm:p-6'} ${state === 'on' ? '' : 'border-alert/30 bg-alert-50/40'}`} aria-labelledby="alert-setup-h">
      <div className="flex items-start gap-3">
        <span className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${state === 'on' ? 'bg-emerald-50 text-emerald-600' : 'bg-alert text-white'}`}>
          {state === 'on' ? <CheckCircle2 className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id="alert-setup-h" className="font-display font-semibold text-midnight-900">
            {state === 'on' ? 'Emergency alerts are on for this phone' : 'Get emergency alerts on this phone'}
          </h3>
          <p className="text-sm text-midnight-500 mt-0.5">
            {state === 'on'
              ? `This phone will ${canVibrate() ? 'vibrate and ' : ''}show a notification for every emergency, even when NexHood is closed.`
              : 'When a resident presses the panic button, this phone rings, vibrates and shows who needs help and where.'}
          </p>

          {state === 'needs-install' && (
            <ol className="mt-3 space-y-1.5 text-sm text-midnight-700">
              <li className="flex gap-2"><Share className="h-4 w-4 shrink-0 mt-0.5 text-royal" /> On iPhone, tap the Share button in Safari, then “Add to Home Screen”.</li>
              <li className="flex gap-2"><Smartphone className="h-4 w-4 shrink-0 mt-0.5 text-royal" /> Open NexHood from the new icon on your home screen and come back here.</li>
            </ol>
          )}
          {state === 'denied' && (
            <p className="mt-3 text-sm text-alert-700">Notifications are blocked for NexHood. Allow them in your browser or phone settings for nexhoodapp.com, then reload.</p>
          )}
          {state === 'unsupported' && (
            <p className="mt-3 text-sm text-midnight-500">This browser can’t show phone notifications. Use Chrome on Android, or add NexHood to the home screen on iPhone. The siren still works while the app is open.</p>
          )}
          {isIOS() && state === 'on' && <p className="mt-2 text-xs text-midnight-400">On iPhone the vibration comes from the notification. In Settings › Notifications › NexHood, turn on Sounds and Banners, and set Time Sensitive / Allow while Focus is on.</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {state === 'on' && (
              <button type="button" onClick={() => turnOn(true)} disabled={busy} className="btn-outline text-sm">
                {busy ? <Spinner className="h-4 w-4" /> : <BellRing className="h-4 w-4" />} Re-connect this phone
              </button>
            )}
            {(state === 'off' || state === 'server-off') && (
              <button type="button" onClick={() => turnOn()} disabled={busy} className="btn-alert text-sm">
                {busy ? <Spinner className="h-4 w-4" /> : <BellRing className="h-4 w-4" />} Turn on emergency alerts
              </button>
            )}
            <button type="button" onClick={test} disabled={testing} className="btn-outline text-sm">
              <Volume2 className="h-4 w-4" /> {testing ? 'Testing…' : 'Test siren and vibration'}
            </button>
          </div>
          {msg && <p className="mt-3 text-xs text-midnight-500" role="status">{msg}</p>}
        </div>
      </div>
    </section>
  )
}
