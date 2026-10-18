import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { CreditCard, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileTabBar } from './MobileTabBar'
import { NAV_ITEMS } from './navConfig'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { AlertCenterProvider } from '@/context/AlertCenter'
import { ThemeProvider, useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { acceptTerms, getBillingStatus, type PlanStatus } from '@/lib/api'
import { TERMS_VERSION } from '@/lib/legal'

export function AppLayout() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  )
}

function AppShell() {
  const { dark } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const current = NAV_ITEMS.find((item) =>
    item.to === '/app' ? location.pathname === '/app' : location.pathname.startsWith(item.to),
  )

  return (
    <NotificationsProvider>
    <AlertCenterProvider>
    <div className={`flex h-screen h-[100dvh] overflow-hidden bg-midnight-50/40 ${dark ? 'theme-dark' : ''}`}>
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-midnight-950/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-fit max-w-[85vw]">
            <button
              className="absolute -right-11 top-4 text-warm bg-midnight-900/70 rounded-full p-1.5"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={current?.label || 'Dashboard'} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-28 sm:px-8 sm:pt-8 lg:pb-8">
          <div className="max-w-6xl mx-auto w-full">
            <PlanBanner />
            <Outlet />
          </div>
        </main>
        <MobileTabBar onMore={() => setMobileOpen(true)} />
      </div>
    </div>
    <TermsGate />
    </AlertCenterProvider>
    </NotificationsProvider>
  )
}

/** Tells admins when the estate's NexHood plan needs paying. Residents,
 *  guards and police never see it. */
function PlanBanner() {
  const { user } = useAuth()
  const location = useLocation()
  const [plan, setPlan] = useState<{ status: PlanStatus; days_left: number } | null>(null)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    getBillingStatus().then(setPlan).catch(() => {})
  }, [isAdmin, location.pathname])

  if (!isAdmin || !plan || location.pathname.startsWith('/app/billing')) return null
  let text = ''
  let urgent = false
  if (plan.status === 'trialing' && plan.days_left <= 7) text = `Your free trial ends in ${plan.days_left} ${plan.days_left === 1 ? 'day' : 'days'}.`
  else if (plan.status === 'active' && plan.days_left <= 7) text = `Your NexHood plan renews in ${plan.days_left} ${plan.days_left === 1 ? 'day' : 'days'}.`
  else if (plan.status === 'grace') {
    text = 'Your NexHood plan has ended. Renew this week to avoid a pause.'
    urgent = true
  } else if (plan.status === 'lapsed') {
    text = 'Your NexHood plan has ended. Inviting people and sending bills are paused. Alerts still work.'
    urgent = true
  }
  if (!text) return null
  return (
    <Link
      to="/app/billing"
      className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${urgent ? 'bg-alert-50 text-alert-700' : 'bg-amber-50 text-amber-800'}`}
    >
      <CreditCard className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{text}</span>
      <span className="shrink-0 underline">Pay now</span>
    </Link>
  )
}

/** Everyone already using NexHood (and everyone who joins by invite) is asked
 *  once to agree to the current Terms and Privacy Policy. Their agreement is
 *  saved with the date and version, as the data protection rules expect. */
function TermsGate() {
  const { user, setUser } = useAuth()
  const location = useLocation()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Never stand between someone and the panic button.
  if (!user || user.terms_accepted_version === TERMS_VERSION || location.pathname.startsWith('/app/alerts')) return null

  async function agree() {
    setSaving(true)
    setError('')
    try {
      const updated = await acceptTerms(TERMS_VERSION)
      setUser({ ...user!, ...updated, terms_accepted_version: TERMS_VERSION })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-midnight-950/60 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="terms-title">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-xl">
        <h2 id="terms-title" className="font-display text-xl font-semibold text-midnight-900">Our Terms and Privacy Policy</h2>
        <p className="text-sm text-midnight-500 mt-2">
          Please read and agree to continue. In short: we keep your estate’s data private, we never sell it, and NexHood helps people reach each other in an
          emergency but is not an emergency service. In an emergency, also call 112.
        </p>
        <div className="flex gap-4 mt-3 text-sm">
          <a href="/terms" target="_blank" rel="noopener" className="text-royal font-medium underline">Terms of Service</a>
          <a href="/privacy" target="_blank" rel="noopener" className="text-royal font-medium underline">Privacy Policy</a>
        </div>
        {error && <p className="text-sm text-alert-700 mt-3">{error}</p>}
        <button type="button" onClick={agree} disabled={saving} className="btn-primary w-full mt-5">
          {saving ? 'Saving…' : 'I am 18+ and I agree'}
        </button>
      </div>
    </div>
  )
}
