import { useEffect, useState } from 'react'
import { Download, PlusSquare, Share, Smartphone, X } from 'lucide-react'
import { isIOS, isStandalone } from '@/lib/alertsLive'
import { canPromptInstall, onInstallChange, promptInstall } from '@/lib/installPrompt'

const KEY = 'nexhood_install_dismissed'
const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** "Add NexHood to your home screen" for everyone (residents too), shown
 *  until the app is installed or the person closes the card. */
export function InstallAppCard() {
  const [dismissed, setDismissed] = useState(read)
  const [, force] = useState(0)
  const [done, setDone] = useState(false)
  useEffect(() => onInstallChange(() => force((n) => n + 1)), [])

  if (dismissed || isStandalone() || done) return null
  const ios = isIOS()
  const oneTap = canPromptInstall()
  const mobile = ios || /Android/i.test(navigator.userAgent)
  if (!mobile && !oneTap) return null

  function close() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* private mode */
    }
    setDismissed(true)
  }

  return (
    <section className="card p-5 mb-6 border-royal-200 bg-royal-50/40 relative" aria-labelledby="install-h">
      <button type="button" onClick={close} className="absolute right-3 top-3 text-midnight-400 hover:text-midnight-700 p-1" aria-label="Close">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="h-10 w-10 shrink-0 rounded-xl bg-royal text-white flex items-center justify-center">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 id="install-h" className="font-display font-semibold text-midnight-900">Add NexHood to your home screen</h3>
          <p className="text-sm text-midnight-500 mt-0.5">
            It opens like an app, keeps you logged in, and is needed for alert notifications{ios ? ' on iPhone' : ''}.
          </p>
          {oneTap ? (
            <button
              type="button"
              className="btn-primary mt-3 text-sm"
              onClick={async () => {
                if (await promptInstall()) setDone(true)
              }}
            >
              <Download className="h-4 w-4" /> Add to home screen
            </button>
          ) : ios ? (
            <ol className="mt-3 space-y-1.5 text-sm text-midnight-700">
              <li className="flex items-center gap-2">
                <span className="font-semibold">1.</span> Open this page in <strong>Safari</strong>.
              </li>
              <li className="flex items-center gap-2">
                <span className="font-semibold">2.</span> Tap <Share className="h-4 w-4 inline text-royal" aria-label="the Share button" /> <strong>Share</strong> at the bottom.
              </li>
              <li className="flex items-center gap-2">
                <span className="font-semibold">3.</span> Tap <PlusSquare className="h-4 w-4 inline text-royal" aria-hidden="true" /> <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
              </li>
              <li className="flex items-center gap-2">
                <span className="font-semibold">4.</span> Open NexHood from the new icon.
              </li>
            </ol>
          ) : (
            <p className="mt-3 text-sm text-midnight-700">
              In Chrome, tap <strong>⋮</strong> (top right), then <strong>Add to Home screen</strong> or <strong>Install app</strong>.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
