export function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = minutes / 60
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hr`
  return `${Math.round(hours / 24)} days`
}

/** Parse an API timestamp safely. The API sends UTC; older responses
 * had no "Z" and 6-digit microseconds, which some browsers (Safari)
 * reject as "Invalid Date" and others read as local time. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  let v = value.trim().replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1')
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) v += 'Z'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export function timeAgo(iso: string | null | undefined) {
  const d = parseDate(iso)
  if (!d) return ''
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} day${Math.floor(s / 86400) === 1 ? '' : 's'} ago`
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

export function clockTime(iso: string | null | undefined) {
  const d = parseDate(iso)
  return d ? d.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' }) : ''
}

export function dayHeading(iso: string | null | undefined) {
  const d = parseDate(iso)
  if (!d) return ''
  const today = new Date()
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((startOf(today) - startOf(d)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
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
