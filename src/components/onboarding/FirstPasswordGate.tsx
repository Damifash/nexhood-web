import { useState, type FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { changePassword } from '@/lib/api'

/** People invited by their admin log in with a temporary password from the
 *  invite email. The first thing they see is this: choose their own. */
export function FirstPasswordGate() {
  const { user, setUser, setSessionToken } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const location = useLocation()
  // Never in front of the panic button.
  if (!user?.must_change_password || location.pathname.startsWith('/app/alerts')) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (next.length < 8) return setError('Use at least 8 characters.')
    if (next !== again) return setError('The two new passwords don’t match.')
    if (next === current) return setError('Choose a password different from the one in your email.')
    setBusy(true)
    try {
      const r = await changePassword(current, next)
      if (r?.token) setSessionToken(r.token)
      setUser({ ...user!, must_change_password: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password')
    } finally {
      setBusy(false)
    }
  }

  const type = show ? 'text' : 'password'
  return (
    <div className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center bg-midnight-950/70 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="fp-title">
      <form onSubmit={submit} className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-xl space-y-4 max-h-[100dvh] overflow-y-auto">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 shrink-0 rounded-xl bg-royal text-white flex items-center justify-center">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 id="fp-title" className="font-display text-xl font-semibold text-midnight-900">Welcome, {user.name.split(' ')[0]}. Set your password</h2>
            <p className="text-sm text-midnight-500 mt-1">You logged in with the temporary password from your invite email. Choose your own so only you can get in.</p>
          </div>
        </div>
        {error && <p className="rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">{error}</p>}
        <div>
          <label className="label" htmlFor="fp-cur">Temporary password (from the email)</label>
          <input id="fp-cur" required type={type} autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="fp-new">New password</label>
          <div className="relative">
            <input id="fp-new" required minLength={8} type={type} autoComplete="new-password" className="input pr-10" placeholder="At least 8 characters" value={next} onChange={(e) => setNext(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight-300 hover:text-midnight-600" aria-label={show ? 'Hide passwords' : 'Show passwords'}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="fp-again">New password again</label>
          <input id="fp-again" required type={type} autoComplete="new-password" className="input" value={again} onChange={(e) => setAgain(e.target.value)} />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? 'Saving…' : 'Save my password'}</button>
      </form>
    </div>
  )
}
