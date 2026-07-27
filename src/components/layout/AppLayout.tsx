import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { NAV_ITEMS } from './navConfig'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const current = NAV_ITEMS.find((item) =>
    item.to === '/app' ? location.pathname === '/app' : location.pathname.startsWith(item.to),
  )

  return (
    <div className="flex h-screen overflow-hidden bg-midnight-50/40">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-midnight-950/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full">
            <button
              className="absolute -right-11 top-4 text-warm bg-midnight-900/70 rounded-full p-1.5"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar title={current?.label || 'Dashboard'} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
