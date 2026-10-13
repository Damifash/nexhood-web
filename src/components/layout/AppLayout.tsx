import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileTabBar } from './MobileTabBar'
import { NAV_ITEMS } from './navConfig'
import { NotificationsProvider } from '@/context/NotificationsContext'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const current = NAV_ITEMS.find((item) =>
    item.to === '/app' ? location.pathname === '/app' : location.pathname.startsWith(item.to),
  )

  return (
    <NotificationsProvider>
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-midnight-50/40">
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
            <Outlet />
          </div>
        </main>
        <MobileTabBar onMore={() => setMobileOpen(true)} />
      </div>
    </div>
    </NotificationsProvider>
  )
}
