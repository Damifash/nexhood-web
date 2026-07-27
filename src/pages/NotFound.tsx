import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-warm px-6 text-center">
      <Logo size="md" className="mb-8" />
      <p className="font-display text-6xl font-semibold text-midnight-900">404</p>
      <p className="text-midnight-500 mt-3 mb-8">This street doesn't exist in the neighborhood.</p>
      <Link to="/" className="btn-primary">Back home</Link>
    </div>
  )
}
