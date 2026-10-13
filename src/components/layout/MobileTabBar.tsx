import { NavLink } from 'react-router-dom'
import { Bell, LayoutDashboard, Menu, QrCode, Siren, Users2, Wallet, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useNotifications, type Section } from '@/context/NotificationsContext'
import type { Role } from '@/lib/types'
import { NAV_ITEMS } from './navConfig'

type Tab = { to: string; label: string; icon: LucideIcon; section?: Section }

// The four places each role goes most, one thumb-tap away. Everything else
// lives under "More" (the full menu).
const TABS: Record<Role, Tab[]> = {
  resident: [
    { to: '/app', label: 'Home', icon: LayoutDashboard },
    { to: '/app/visitor-passes', label: 'Passes', icon: QrCode, section: 'visitor_passes' },
    { to: '/app/payments', label: 'Bills', icon: Wallet, section: 'payments' },
    { to: '/app/alerts', label: 'Alerts', icon: Bell, section: 'alerts' },
  ],
  guard: [
    { to: '/app', label: 'Gate', icon: LayoutDashboard },
    { to: '/app/visitor-passes', label: 'Passes', icon: QrCode, section: 'visitor_passes' },
    { to: '/app/alerts', label: 'Alerts', icon: Bell, section: 'alerts' },
    { to: '/app/incidents', label: 'Incidents', icon: Siren, section: 'incidents' },
  ],
  police: [
    { to: '/app', label: 'Home', icon: LayoutDashboard },
    { to: '/app/alerts', label: 'Alerts', icon: Bell, section: 'alerts' },
    { to: '/app/incidents', label: 'Incidents', icon: Siren, section: 'incidents' },
  ],
  admin: [
    { to: '/app', label: 'Home', icon: LayoutDashboard },
    { to: '/app/payments', label: 'Bills', icon: Wallet, section: 'payments' },
    { to: '/app/alerts', label: 'Alerts', icon: Bell, section: 'alerts' },
    { to: '/app/users', label: 'People', icon: Users2 },
  ],
  super_admin: [
    { to: '/app', label: 'Home', icon: LayoutDashboard },
    { to: '/app/payments', label: 'Bills', icon: Wallet, section: 'payments' },
    { to: '/app/alerts', label: 'Alerts', icon: Bell, section: 'alerts' },
    { to: '/app/users', label: 'People', icon: Users2 },
  ],
}

export function MobileTabBar({ onMore }: { onMore: () => void }) {
  const { user } = useAuth()
  const { badgeFor } = useNotifications()
  if (!user) return null
  const tabs = TABS[user.role] || TABS.resident
  const tabSections = new Set(tabs.map((t) => t.section).filter(Boolean))
  // "More" carries a dot for anything new in sections that aren't on the bar.
  const moreCount = NAV_ITEMS.filter((i) => i.section && !tabSections.has(i.section) && (!i.roles || i.roles.includes(user.role)))
    .reduce((sum, i) => sum + badgeFor(i.section as Section).n, 0)

  return (
    <nav
      aria-label="Quick navigation"
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-midnight-100 bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex">
        {tabs.map((t) => {
          const b = t.section ? badgeFor(t.section) : { n: 0, urgent: false }
          return (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                end={t.to === '/app'}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-semibold ${isActive ? 'text-royal' : 'text-midnight-400'}`
                }
              >
                <span className="relative">
                  <t.icon className="h-[22px] w-[22px]" strokeWidth={2} />
                  {b.n > 0 && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-alert text-white text-[10px] leading-[1.1rem] text-center ring-2 ring-white ${b.urgent ? 'animate-pulse' : ''}`}
                      aria-label={`${b.n} new`}
                    >
                      {b.n > 9 ? '9+' : b.n}
                    </span>
                  )}
                </span>
                {t.label}
              </NavLink>
            </li>
          )
        })}
        <li className="flex-1">
          <button type="button" onClick={onMore} className="relative w-full flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-semibold text-midnight-400">
            <span className="relative">
              <Menu className="h-[22px] w-[22px]" strokeWidth={2} />
              {moreCount > 0 && <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-alert ring-2 ring-white" aria-label={`${moreCount} new in other sections`} />}
            </span>
            More
          </button>
        </li>
      </ul>
    </nav>
  )
}
