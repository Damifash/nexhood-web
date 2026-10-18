import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { AuthLayout } from '@/components/AuthLayout'
import { Spinner } from '@/components/ui/Spinner'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      const redirectTo = (location.state as { from?: string })?.from || '/app'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to keep your neighborhood safe.">
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
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="text-xs text-royal font-semibold hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className="input pr-11"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight-300 hover:text-midnight-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? <Spinner className="h-4 w-4" /> : 'Log in'}
        </button>
      </form>
      <p className="text-sm text-midnight-400 mt-6 text-center">
        Estate manager setting up NexHood?{' '}
        <Link to="/register" className="text-royal font-semibold hover:underline">
          Set up your estate
        </Link>
      </p>
      <p className="text-xs text-midnight-300 mt-3 text-center">
        Residents and guards: your estate admin sends your login by email. Check your spam folder too.
      </p>
      <p className="text-xs text-midnight-300 mt-3 text-center">
        By logging in you agree to our{' '}
        <Link to="/terms" className="underline hover:text-midnight-600">Terms</Link> and{' '}
        <Link to="/privacy" className="underline hover:text-midnight-600">Privacy Policy</Link>.
      </p>
    </AuthLayout>
  )
}
