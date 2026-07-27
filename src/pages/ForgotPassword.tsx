import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { forgotPassword } from '@/lib/api'
import { AuthLayout } from '@/components/AuthLayout'
import { Spinner } from '@/components/ui/Spinner'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      // Always shown regardless of whether the email exists — the backend
      // deliberately doesn't reveal that, so the UI shouldn't either.
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to get back in.">
      {sent ? (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>If that email is registered, a reset link is on its way. Check your inbox (and spam folder).</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              placeholder="you@estate.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? <Spinner className="h-4 w-4" /> : 'Send reset link'}
          </button>
        </form>
      )}
      <p className="text-sm text-midnight-400 mt-6 text-center">
        <Link to="/login" className="text-royal font-semibold hover:underline">
          Back to login
        </Link>
      </p>
    </AuthLayout>
  )
}
