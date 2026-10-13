import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { NAV_ITEMS } from './navConfig'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationsContext'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const { badgeFor } = useNotifications()
  if (!user) return null

  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role))

  return (
    <div className="flex flex-col h-full bg-midnight-900 text-warm w-64 shrink-0">
      <div className="px-5 h-16 flex items-center border-b border-white/10">
        <Logo size="lg" variant="white" />
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'bg-royal text-warm' : 'text-steel-300 hover:bg-white/5 hover:text-warm'
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
            <span className="flex-1">{item.label}</span>
            {item.section && <NavBadge {...badgeFor(item.section)} />}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2.5 mb-1">
          <p className="text-sm font-semibold text-warm truncate">{user.name}</p>
          <p className="text-xs text-steel-400 capitalize truncate">{user.role.replace('_', ' ')} · {user.estate_name || 'Nexhood'}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-steel-300 hover:bg-white/5 hover:text-alert-400 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </div>
  )
}

function NavBadge({ n, urgent }: { n: number; urgent: boolean }) {
  if (!n) return null
  return (
    <span
      className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold leading-5 text-center text-white ${urgent ? 'bg-alert animate-pulse' : 'bg-alert'}`}
      aria-label={urgent ? `${n} need${n === 1 ? 's' : ''} your action` : `${n} new`}
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}
