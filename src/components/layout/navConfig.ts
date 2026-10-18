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
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/lib/types'
import type { Section } from '@/context/NotificationsContext'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  roles?: Role[]
  section?: Section
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/visitor-passes', label: 'Visitor Passes', icon: QrCode, section: 'visitor_passes', roles: ['resident', 'guard', 'admin', 'super_admin'] },
  { to: '/app/incidents', label: 'Incidents', icon: Siren, section: 'incidents' },
  { to: '/app/alerts', label: 'Alerts', icon: Bell, section: 'alerts' },
  { to: '/app/payments', label: 'Bills & Payments', icon: Wallet, section: 'payments', roles: ['resident', 'admin', 'super_admin'] },
  { to: '/app/finances', label: 'Estate Finances', icon: Landmark, section: 'finances', roles: ['resident', 'admin', 'super_admin'] },
  { to: '/app/repairs', label: 'Repairs', icon: Wrench, section: 'repairs', roles: ['resident', 'guard', 'admin', 'super_admin'] },
  { to: '/app/community', label: 'Community', icon: MessageSquare, section: 'community', roles: ['resident', 'guard', 'admin', 'super_admin'] },
  { to: '/app/welfare', label: 'Welfare Fund', icon: HeartHandshake, section: 'welfare', roles: ['resident', 'guard', 'admin', 'super_admin'] },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'super_admin'] },
  { to: '/app/users', label: 'Users', icon: Users2, roles: ['admin', 'super_admin'] },
  { to: '/app/billing', label: 'Plan & billing', icon: CreditCard, roles: ['admin', 'super_admin'] },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]
