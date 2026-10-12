import type { ActivityItem } from '@/lib/types'

export function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = minutes / 60
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hr`
  return `${Math.round(hours / 24)} days`
}

export function timeAgo(iso: string) {
  const then = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z').getTime()
  const s = Math.max(0, (Date.now() - then) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`
  return new Date(then).toLocaleDateString()
}

const ACTIVITY_TEXT: Record<string, string> = {
  'create:visitor_pass': 'issued a visitor pass',
  'validate:visitor_pass': 'checked in a visitor at the gate',
  'create:incident': 'reported an incident',
  'update:incident': 'updated an incident',
  'edit_content:incident': 'edited an incident report',
  'create:alert': 'raised an alert',
  'acknowledge:alert': 'acknowledged an alert',
  'resolve:alert': 'resolved an alert',
  'police_notify:alert': 'notified the police',
  'invite:user': 'invited a new user',
  'create:user': 'added a user',
  'update:user': 'updated a user',
  'delete:user': 'removed a user',
  'role_change:user': "changed a user's role",
  'update_settings:estate': 'updated estate settings',
  'create:estate': 'created the estate',
  'verify:donation': 'confirmed a welfare pledge',
  'update:user_profile': 'updated their profile',
}

export function activityText(a: ActivityItem) {
  return ACTIVITY_TEXT[`${a.action}:${a.entity}`] || `${String(a.action).replace(/_/g, ' ')} ${String(a.entity).replace(/_/g, ' ')}`
}

export function changeLabel(pct: number | null | undefined, days: number) {
  if (pct === null || pct === undefined) return null
  if (pct === 0) return `Same as previous ${days} days`
  return `${pct > 0 ? '+' : ''}${pct}% vs previous ${days} days`
}

export const SERIES = {
  visitors: '#2c3ed6',
  incidents: '#d97706',
  alerts: '#0f9d8a',
} as const
