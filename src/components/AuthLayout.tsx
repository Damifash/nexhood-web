import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo, ShieldMark } from './Logo'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-warm">
      <div className="relative hidden lg:flex flex-col justify-between text-warm p-12 overflow-hidden">
        <img
          src="/brand/guard-portrait.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, rgba(7,20,86,0.88) 0%, rgba(7,20,86,0.75) 45%, rgba(0,19,158,0.92) 100%)',
        }} />
        <div className="absolute right-0 top-0 h-full w-40 flex opacity-60">
          <div className="w-10 h-full bg-royal-600/40" />
          <div className="w-6 h-full bg-royal/70 mx-2" />
          <div className="w-10 h-full bg-midnight-700/40" />
        </div>
        <Link to="/" className="relative z-10">
          <Logo variant="white" size="xl" />
        </Link>
        <div className="relative z-10 max-w-sm">
          <ShieldMark className="h-16 w-16 mb-6" />
          <p className="font-display text-3xl font-semibold leading-tight">
            Security is stronger when it is shared.
          </p>
          <p className="mt-4 text-steel-300 text-sm leading-relaxed">
            Residents, guards, admins and police — connected on one platform to keep every estate safe, together.
          </p>
        </div>
        <p className="relative z-10 text-xs text-steel-400">© {new Date().getFullYear()} Nexhood. Protecting homes, connecting neighbors.</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="lg:hidden mb-10">
          <Link to="/"><Logo variant="navy" size="lg" /></Link>
        </div>
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <h1 className="font-display text-2xl font-semibold text-midnight-900">{title}</h1>
          <p className="text-sm text-midnight-400 mt-1.5 mb-8">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
