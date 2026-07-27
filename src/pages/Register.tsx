import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register({ ...form, role: 'resident' })
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Join your estate" subtitle="The first person from an estate becomes its admin — everyone else joins under them.">
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" placeholder="you@estate.com" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" required className="input" placeholder="+2348012345678" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="estate">Estate name</label>
          <input id="estate" required className="input" placeholder="Maraba Gardens Estate" value={form.estate_id} onChange={(e) => update('estate_id', e.target.value)} />
          <p className="text-xs text-midnight-300 mt-1">If it doesn't exist yet, we'll create it — and you'll be its admin.</p>
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} className="input" placeholder="At least 6 characters" value={form.password} onChange={(e) => update('password', e.target.value)} />
        </div>
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
