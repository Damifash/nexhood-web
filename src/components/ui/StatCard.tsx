import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'royal',
}: {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: 'royal' | 'alert' | 'steel' | 'midnight'
}) {
  const tones: Record<string, string> = {
    royal: 'bg-royal-50 text-royal-600',
    alert: 'bg-alert-50 text-alert-600',
    steel: 'bg-steel-100 text-steel-700',
    midnight: 'bg-midnight-50 text-midnight-700',
  }
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-display font-semibold text-midnight-900 leading-tight">{value}</p>
        <p className="text-xs text-midnight-400 font-medium truncate">{label}</p>
      </div>
    </div>
  )
}
