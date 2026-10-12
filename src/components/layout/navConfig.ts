import {
  LayoutDashboard,
  QrCode,
  Siren,
  Bell,
  BarChart3,
  Users2,
  MessageSquare,
  HeartHandshake,
  Settings,
  Wallet,
  Landmark,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/lib/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles?: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/visitor-passes', label: 'Visitor Passes', icon: QrCode, roles: ['resident', 'guard', 'admin', 'super_admin'] },
  { to: '/app/incidents', label: 'Incidents', icon: Siren },
  { to: '/app/alerts', label: 'Alerts', icon: Bell },
  { to: '/app/payments', label: 'Bills & Payments', icon: Wallet, roles: ['resident', 'admin', 'super_admin'] },
  { to: '/app/finances', label: 'Estate Finances', icon: Landmark },
  { to: '/app/repairs', label: 'Repairs', icon: Wrench },
  { to: '/app/community', label: 'Community', icon: MessageSquare },
  { to: '/app/welfare', label: 'Welfare Fund', icon: HeartHandshake },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'super_admin'] },
  { to: '/app/users', label: 'Users', icon: Users2, roles: ['admin', 'super_admin'] },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]
