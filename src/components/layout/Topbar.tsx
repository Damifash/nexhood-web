import { Menu } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export function Topbar({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user } = useAuth()
  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="h-16 border-b border-midnight-100 bg-white/80 backdrop-blur flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button className="lg:hidden text-midnight-600" onClick={onMenuClick}>
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="font-display text-lg font-semibold text-midnight-900">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-royal-50 text-royal-600 flex items-center justify-center text-xs font-semibold">
          {initials || 'NH'}
        </div>
      </div>
    </header>
  )
}
