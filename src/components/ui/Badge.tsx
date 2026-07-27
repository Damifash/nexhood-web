const TONES: Record<string, string> = {
  neutral: 'bg-midnight-50 text-midnight-600',
  royal: 'bg-royal-50 text-royal-700',
  alert: 'bg-alert-50 text-alert-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  steel: 'bg-steel-100 text-steel-700',
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: keyof typeof TONES }) {
  return <span className={`badge ${TONES[tone]}`}>{children}</span>
}

export function statusTone(status?: string | null): keyof typeof TONES {
  const s = (status || 'reported').toLowerCase()
  if (['active', 'used', 'resolved', 'created', 'notified'].includes(s)) return 'success'
  if (['critical', 'high', 'expired', 'failed'].includes(s)) return 'alert'
  if (['acknowledged', 'pending', 'medium', 'in_progress'].includes(s)) return 'warning'
  if (['low', 'closed', 'skipped'].includes(s)) return 'steel'
  return 'neutral'
}
