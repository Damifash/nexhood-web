import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { TERMS_VERSION } from '@/lib/legal'
import { AuthLayout } from '@/components/AuthLayout'
import { Spinner } from '@/components/ui/Spinner'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    estate_id: '',
  })
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    setLoading(true)
    try {
      await register({ ...form, role: 'resident', accept_terms: true, terms_version: TERMS_VERSION })
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Set up your estate" subtitle="For estate managers and executives. You become the estate’s admin, then invite residents and guards.">
      <div className="rounded-xl bg-amber-50 text-amber-800 text-sm px-4 py-3 mb-4">
        <strong>Live in an estate that already uses NexHood?</strong> Don’t sign up here. Your estate admin sends you an invite by email with your
        login.
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" required className="input" placeholder="Rita Adebayo" value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" placeholder="you@estate.com" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" required className="input" placeholder="08012345678" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="estate">Estate name</label>
          <input id="estate" required className="input" placeholder="e.g. Sunrise Court Estate, Lokogoma" value={form.estate_id} onChange={(e) => update('estate_id', e.target.value)} />
          <p className="text-xs text-midnight-300 mt-1">
            New estate? We'll create it and you'll be its admin. Already have an estate on Nexhood? Ask your
            estate admin for an invite instead — this form can't join an existing estate.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} className="input" placeholder="At least 6 characters" value={form.password} onChange={(e) => update('password', e.target.value)} />
        </div>
        <label className="flex items-start gap-2.5 text-sm text-midnight-600">
          <input type="checkbox" required checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-royal" />
          <span>
            I am 18 or older and agree to the{' '}
            <Link to="/terms" target="_blank" className="text-royal font-medium underline">Terms of Service</Link> and{' '}
            <Link to="/privacy" target="_blank" className="text-royal font-medium underline">Privacy Policy</Link>, including my data being stored
            with providers outside Nigeria as the policy explains.
          </span>
        </label>
        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? <Spinner className="h-4 w-4" /> : 'Create account'}
        </button>
      </form>
      <p className="text-sm text-midnight-400 mt-6 text-center">
        Already on Nexhood?{' '}
        <Link to="/login" className="text-royal font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
