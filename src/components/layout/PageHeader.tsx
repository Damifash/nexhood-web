import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-midnight-900">{title}</h2>
        {subtitle && <p className="text-sm text-midnight-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
