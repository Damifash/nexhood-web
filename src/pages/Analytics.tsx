import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Bell, Download, QrCode, Siren, Timer, Users2, HeartHandshake, MessageSquare, ShieldAlert, Wrench } from 'lucide-react'
import { getDashboard } from '@/lib/api'
import type { AdminDashboard, AnalyticsPeriod, DailyPoint } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { ActivityFeed, AttentionList, KpiTile, PeriodPicker, SetupChecklist } from '@/components/analytics/Widgets'
import { SERIES, changeLabel, formatDuration } from '@/components/analytics/format'

const ROLE_LABELS: Record<string, string> = {
  resident: 'Residents',
  guard: 'Guards',
  admin: 'Admins',
  police: 'Police',
  super_admin: 'Platform admins',
}

const ALERT_STATUS_TONE: Record<string, 'alert' | 'warning' | 'success' | 'neutral'> = {
  active: 'alert',
  acknowledged: 'warning',
  resolved: 'success',
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function titleCase(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function hourLabel(h: number) {
  if (h === 0) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

/** For long periods a daily line is just noise — roll it up into weeks. */
function rollUp(daily: DailyPoint[], days: number) {
  if (days < 90) return daily.map((d) => ({ ...d, label: d.date.slice(5) }))
  const weeks: (DailyPoint & { label: string })[] = []
  daily.forEach((d, i) => {
    if (i % 7 === 0) weeks.push({ ...d, label: `w/c ${d.date.slice(5)}` })
    else {
      const w = weeks[weeks.length - 1]
      w.visitors += d.visitors
      w.incidents += d.incidents
      w.alerts += d.alerts
    }
  })
  return weeks
}

function downloadCsv(data: AdminDashboard) {
  const days = data.period?.days ?? 30
  const s = data.summary
  const r = data.response
  const lines = [
    ['NexHood estate report', `Last ${days} days`, new Date().toISOString().slice(0, 10)],
    [],
    ['Metric', 'Value'],
    ['Visitor passes', s.total_visitors],
    ['Incidents reported', s.incidents_new ?? ''],
    ['Open incidents', s.active_incidents],
    ['Alerts raised', s.total_alerts],
    ['Open alerts', s.active_alerts],
    ['Typical minutes to first alert response', r?.median_ack_minutes != null ? Math.round(r.median_ack_minutes) : ''],
    ['Alerts responded to (%)', r?.ack_rate_pct ?? ''],
    ['Typical hours to resolve an incident', r?.median_incident_resolve_hours != null ? r.median_incident_resolve_hours.toFixed(1) : ''],
    ['Active users (7 days)', s.users_active_7d ?? ''],
    [],
    ['Date', 'Visitor passes', 'Incidents', 'Alerts'],
    ...(data.trends.daily ?? []).map((d) => [d.date, d.visitors, d.incidents, d.alerts]),
  ]
  const csv = lines.map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nexhood-report-${days}d-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const axisProps = {
  tick: { fontSize: 11, fill: '#5f7ea3' },
  tickLine: false,
  axisLine: { stroke: '#e4e9f0' },
} as const

const tooltipStyle = { borderRadius: 12, border: '1px solid #e4e9f0', fontSize: 12, boxShadow: '0 4px 16px rgba(7,20,86,.08)' }

export default function Analytics() {
  const [days, setDays] = useState<AnalyticsPeriod>(30)
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getDashboard(days)
      .then((d) => !cancelled && setData(d as AdminDashboard))
      .catch(() => !cancelled && setError('Could not load analytics.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [days])

  const trend = useMemo(() => (data?.trends.daily ? rollUp(data.trends.daily, days) : []), [data, days])
  const hasTrend = trend.some((d) => d.visitors || d.incidents || d.alerts)
  const hours = useMemo(() => (data?.visitors?.by_hour ?? []).map((count, h) => ({ label: hourLabel(h), count })), [data])
  const weekdays = useMemo(() => (data?.visitors?.by_weekday ?? []).map((count, i) => ({ label: WEEKDAYS[i], count })), [data])
  const busiestHour = useMemo(() => {
    const arr = data?.visitors?.by_hour ?? []
    const max = Math.max(0, ...arr)
    return max > 0 ? hourLabel(arr.indexOf(max)) : null
  }, [data])

  const s = data?.summary
  const r = data?.response
  const p = data?.people

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="How your estate is doing: security, response times and engagement."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker value={days} onChange={setDays} />
            {data && (
              <button type="button" onClick={() => downloadCsv(data)} className="btn-outline text-xs px-3.5 py-2">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            )}
          </div>
        }
      />

      {loading && !data && (
        <div className="flex justify-center py-20 text-royal">
          <Spinner className="h-6 w-6" />
        </div>
      )}
      {error && <div className="card p-6 text-alert-600 text-sm">{error}</div>}

      {data && s && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {/* Headline numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile label="Visitor passes" value={s.total_visitors} icon={QrCode} change={changeLabel(s.visitors_change_pct, days)} changePct={s.visitors_change_pct} hint={`${s.visitors_prev ?? 0} in the previous ${days} days`} />
            <KpiTile label="Incidents reported" value={s.incidents_new ?? 0} icon={Siren} change={changeLabel(s.incidents_change_pct, days)} changePct={s.incidents_change_pct} hint={`${s.active_incidents} still open`} />
            <KpiTile label="Alerts raised" value={s.total_alerts} icon={Bell} change={changeLabel(s.alerts_change_pct, days)} changePct={s.alerts_change_pct} hint={`${s.active_alerts} still open`} />
            <KpiTile label="Active users" value={s.users_active_period ?? '—'} icon={Users2} hint={`${s.users_active_7d ?? 0} this week · ${s.total_users} on NexHood`} />
          </div>

          {/* Attention + setup */}
          <div className="grid lg:grid-cols-3 gap-6">
            <section className="card p-5 sm:p-6 lg:col-span-2" aria-labelledby="att-h">
              <h3 id="att-h" className="font-display font-semibold text-midnight-900 mb-4">Needs your attention</h3>
              <AttentionList items={data.attention ?? []} />
            </section>
            {data.setup && data.setup.length > 0 && (
              <section className="card p-5 sm:p-6">
                <SetupChecklist steps={data.setup} />
              </section>
            )}
          </div>

          {/* Trend */}
          <section className="card p-5 sm:p-6" aria-labelledby="trend-h">
            <h3 id="trend-h" className="font-display font-semibold text-midnight-900">Activity over time</h3>
            <p className="text-xs text-midnight-400 mb-4">{days >= 90 ? 'Weekly' : 'Daily'} visitor passes, incidents and alerts</p>
            {!hasTrend ? (
              <p className="text-sm text-midnight-400 py-12 text-center">Nothing recorded in this period yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#eef0f9" />
                  <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis {...axisProps} allowDecimals={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#c9d4e2', strokeWidth: 1 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="plainline" />
                  <Line type="monotone" dataKey="visitors" name="Visitor passes" stroke={SERIES.visitors} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                  <Line type="monotone" dataKey="incidents" name="Incidents" stroke={SERIES.incidents} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                  <Line type="monotone" dataKey="alerts" name="Alerts" stroke={SERIES.alerts} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* Response */}
          <section className="card p-5 sm:p-6" aria-labelledby="resp-h">
            <h3 id="resp-h" className="font-display font-semibold text-midnight-900 flex items-center gap-2">
              <Timer className="h-4 w-4 text-royal" /> Emergency response
            </h3>
            <p className="text-xs text-midnight-400 mb-4">How fast guards and admins respond. "Typical" is the median, so one slow case doesn't skew it.</p>
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl bg-midnight-50/60 p-4">
                <dt className="text-xs text-midnight-500">Typical time to first response</dt>
                <dd className="mt-1 font-display text-2xl font-semibold">{formatDuration(r?.median_ack_minutes)}</dd>
              </div>
              <div className="rounded-xl bg-midnight-50/60 p-4">
                <dt className="text-xs text-midnight-500">Alerts someone responded to</dt>
                <dd className="mt-1 font-display text-2xl font-semibold">{r?.ack_rate_pct != null ? `${r.ack_rate_pct}%` : '—'}</dd>
                <dd className="text-xs text-midnight-400">{r ? `${r.alerts_acknowledged} of ${r.alerts_total}` : ''}</dd>
              </div>
              <div className="rounded-xl bg-midnight-50/60 p-4">
                <dt className="text-xs text-midnight-500">Typical time to close an alert</dt>
                <dd className="mt-1 font-display text-2xl font-semibold">{formatDuration(r?.median_alert_resolve_minutes)}</dd>
              </div>
              <div className="rounded-xl bg-midnight-50/60 p-4">
                <dt className="text-xs text-midnight-500">Typical time to resolve an incident</dt>
                <dd className="mt-1 font-display text-2xl font-semibold">
                  {r?.median_incident_resolve_hours != null ? formatDuration(r.median_incident_resolve_hours * 60) : '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-midnight-500">
              <ShieldAlert className="h-3.5 w-3.5" /> Police notified {r?.police_notified ?? 0} time{r?.police_notified === 1 ? '' : 's'} in this period.
            </div>
          </section>

          {/* Visitors */}
          <div className="grid lg:grid-cols-2 gap-6">
            <section className="card p-5 sm:p-6" aria-labelledby="hours-h">
              <h3 id="hours-h" className="font-display font-semibold text-midnight-900">When visitors arrive</h3>
              <p className="text-xs text-midnight-400 mb-4">
                By hour of day (Nigeria time){busiestHour ? ` · busiest around ${busiestHour}` : ''}. Useful for planning guard shifts.
              </p>
              {s.total_visitors === 0 ? (
                <p className="text-sm text-midnight-400 py-10 text-center">No visitor passes in this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hours} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap={2}>
                    <CartesianGrid vertical={false} stroke="#eef0f9" />
                    <XAxis dataKey="label" {...axisProps} interval={2} />
                    <YAxis {...axisProps} allowDecimals={false} width={36} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#eef0f9' }} formatter={(v) => [v, 'Visitors']} />
                    <Bar dataKey="count" fill={SERIES.visitors} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>
            <section className="card p-5 sm:p-6" aria-labelledby="wd-h">
              <h3 id="wd-h" className="font-display font-semibold text-midnight-900">Busiest days</h3>
              <p className="text-xs text-midnight-400 mb-4">Visitors by day of the week</p>
              {s.total_visitors === 0 ? (
                <p className="text-sm text-midnight-400 py-10 text-center">No visitor passes in this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weekdays} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap={6}>
                    <CartesianGrid vertical={false} stroke="#eef0f9" />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} allowDecimals={false} width={36} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#eef0f9' }} formatter={(v) => [v, 'Visitors']} />
                    <Bar dataKey="count" fill={SERIES.visitors} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {data.visitors && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="success">Checked in: {data.visitors.status.used ?? 0}</Badge>
                  <Badge tone="royal">Upcoming: {data.visitors.status.active ?? 0}</Badge>
                  <Badge tone="steel">Never used: {data.visitors.status.expired ?? 0}</Badge>
                </div>
              )}
            </section>
          </div>

          {/* Incidents + alerts breakdown */}
          <div className="grid lg:grid-cols-2 gap-6">
            <section className="card p-5 sm:p-6" aria-labelledby="types-h">
              <h3 id="types-h" className="font-display font-semibold text-midnight-900 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-royal" /> Incident types
              </h3>
              <p className="text-xs text-midnight-400 mb-4">What residents reported in this period</p>
              {data.distributions.incident_types.length === 0 ? (
                <p className="text-sm text-midnight-400">No incidents reported.</p>
              ) : (
                <ul className="space-y-3">
                  {data.distributions.incident_types.map((t) => {
                    const max = Math.max(...data.distributions.incident_types.map((x) => x.count), 1)
                    return (
                      <li key={t.id}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-midnight-700">{titleCase(t.id)}</span>
                          <span className="text-midnight-500 tabular-nums">{t.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-midnight-50 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(t.count / max) * 100}%`, background: SERIES.incidents }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
            <section className="card p-5 sm:p-6" aria-labelledby="al-h">
              <h3 id="al-h" className="font-display font-semibold text-midnight-900">Alerts</h3>
              <p className="text-xs text-midnight-400 mb-4">By status and type in this period</p>
              {data.distributions.alert_status.length === 0 ? (
                <p className="text-sm text-midnight-400">No alerts raised.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {data.distributions.alert_status.map((a) => (
                      <Badge key={a.id} tone={ALERT_STATUS_TONE[a.id] || 'neutral'}>{titleCase(a.id)}: {a.count}</Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.distributions.alert_types.map((a) => (
                      <Badge key={a.id} tone="neutral">{titleCase(a.id)}: {a.count}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* People + community */}
          <div className="grid lg:grid-cols-2 gap-6">
            <section className="card p-5 sm:p-6" aria-labelledby="ppl-h">
              <h3 id="ppl-h" className="font-display font-semibold text-midnight-900">People</h3>
              <p className="text-xs text-midnight-400 mb-4">Who's on NexHood and who's actually using it</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(p?.by_role ?? {}).map(([role, n]) => (
                  <Badge key={role} tone="royal">{ROLE_LABELS[role] || titleCase(role)}: {n}</Badge>
                ))}
                {!p?.by_role?.guard && <Badge tone="alert">Guards: 0</Badge>}
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-midnight-50/60 p-3">
                  <dd className="font-display text-xl font-semibold">{s.logins_period ?? 0}</dd>
                  <dt className="text-xs text-midnight-500">Logins</dt>
                </div>
                <div className="rounded-xl bg-midnight-50/60 p-3">
                  <dd className="font-display text-xl font-semibold">{p?.residents_dormant_30d ?? 0}</dd>
                  <dt className="text-xs text-midnight-500">Residents inactive 30d+</dt>
                </div>
                <div className="rounded-xl bg-midnight-50/60 p-3">
                  <dd className="font-display text-xl font-semibold">{p?.never_logged_in ?? 0}</dd>
                  <dt className="text-xs text-midnight-500">Never logged in</dt>
                </div>
              </dl>
            </section>
            <section className="card p-5 sm:p-6" aria-labelledby="com-h">
              <h3 id="com-h" className="font-display font-semibold text-midnight-900">Community & welfare</h3>
              <p className="text-xs text-midnight-400 mb-4">Engagement beyond security</p>
              <dl className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-midnight-50/60 p-3">
                  <MessageSquare className="h-4 w-4 mx-auto text-royal" />
                  <dd className="font-display text-xl font-semibold mt-1">{data.engagement.posts_period ?? data.engagement.posts_last_30d}</dd>
                  <dt className="text-xs text-midnight-500">Posts</dt>
                </div>
                <div className="rounded-xl bg-midnight-50/60 p-3">
                  <HeartHandshake className="h-4 w-4 mx-auto text-royal" />
                  <dd className="font-display text-xl font-semibold mt-1">{data.engagement.active_campaigns}</dd>
                  <dt className="text-xs text-midnight-500">Active campaigns</dt>
                </div>
                <div className="rounded-xl bg-midnight-50/60 p-3">
                  <span className="block text-royal font-semibold text-sm">₦</span>
                  <dd className="font-display text-xl font-semibold mt-1">{data.engagement.welfare_raised_total.toLocaleString()}</dd>
                  <dt className="text-xs text-midnight-500">Welfare raised (all time)</dt>
                </div>
              </dl>
            </section>
          </div>

          {/* Activity log */}
          <section className="card p-5 sm:p-6" aria-labelledby="log-h">
            <h3 id="log-h" className="font-display font-semibold text-midnight-900 mb-2">Activity log</h3>
            <ActivityFeed items={data.recent_activity} limit={25} />
          </section>
        </div>
      )}
    </div>
  )
}
