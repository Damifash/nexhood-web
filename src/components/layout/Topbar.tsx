import { Menu, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { useNotifications, type Section } from '@/context/NotificationsContext'
import { ShieldMark } from '@/components/Logo'
import { NAV_ITEMS } from './navConfig'

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user } = useAuth()
  const { badgeFor } = useNotifications()
  // Only count sections this person can actually open.
  const total = NAV_ITEMS.filter((i) => i.section && user && (!i.roles || i.roles.includes(user.role)))
    .reduce((sum, i) => sum + badgeFor(i.section as Section).n, 0)
  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="h-14 lg:h-16 shrink-0 border-b border-midnight-100 bg-white/80 backdrop-blur flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button className="lg:hidden text-midnight-600 relative" onClick={onMenuClick} aria-label={total ? `Open menu, ${total} new` : 'Open menu'}>
          <Menu className="h-6 w-6" />
          {total > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-alert ring-2 ring-white" aria-hidden="true" />}
        </button>
        {/* On phones each page already has its own heading, so the bar shows the estate instead. */}
        <h1 className="hidden lg:block font-display text-lg font-semibold text-midnight-900">{title}</h1>
        <div className="lg:hidden flex items-center gap-2 min-w-0">
          <ShieldMark className="h-7 w-7 shrink-0" />
          <span className="font-display font-semibold text-midnight-900 truncate">{user?.estate_name || 'NexHood'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <div className="h-9 w-9 rounded-full bg-royal-50 text-royal-600 flex items-center justify-center text-xs font-semibold">
          {initials || 'NH'}
        </div>
      </div>
    </header>
  )
}

function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      className="h-9 w-9 rounded-full flex items-center justify-center text-midnight-500 hover:text-midnight-900 hover:bg-midnight-50 transition-colors"
      aria-label={dark ? 'Switch to light mode' : 'Switch to night mode'}
      title={dark ? 'Light mode' : 'Night mode'}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}
