import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users2, QrCode, Siren, Bell, ArrowRight, Timer } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getDashboard } from '@/lib/api'
import type { AdminDashboard, ResidentDashboard } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Spinner } from '@/components/ui/Spinner'
import { Badge, statusTone } from '@/components/ui/Badge'
import { ActivityFeed, AttentionList, KpiTile, SetupChecklist } from '@/components/analytics/Widgets'
import { changeLabel, formatDuration } from '@/components/analytics/format'

function isAdminDashboard(d: AdminDashboard | ResidentDashboard): d is AdminDashboard {
  return 'trends' in d
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminDashboard | ResidentDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError('Could not load dashboard data.'))
      .finally(() => setLoading(false))
  }, [])

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${user?.name?.split(' ')[0]}`}
        subtitle={isAdmin ? `Here's how ${user?.estate_name || 'your estate'} is doing.` : 'Here’s what’s happening in your estate.'}
      />

      {loading && (
        <div className="flex justify-center py-20 text-royal">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {error && <div className="card p-6 text-alert-600 text-sm">{error}</div>}

      {data && (
        <div className="space-y-8">
          {!isAdminDashboard(data) && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Your visitor passes" value={data.summary.total_visitors} icon={QrCode} tone="royal" />
              <StatCard label="Your open incidents" value={data.summary.active_incidents} icon={Siren} tone="alert" />
              <StatCard label="Your active alerts" value={data.summary.total_alerts} icon={Bell} tone="midnight" />
            </div>
          )}

          {isAdminDashboard(data) ? (
            <AdminOverview data={data} />
          ) : (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-midnight-900">Your recent incident reports</h3>
                <Link to="/app/incidents" className="text-xs font-semibold text-royal flex items-center gap-1 hover:underline">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {data.recentIncidents.length === 0 ? (
                <p className="text-sm text-midnight-400">You haven't reported any incidents. Hopefully it stays that way.</p>
              ) : (
                <ul className="divide-y divide-midnight-50">
                  {data.recentIncidents.map((inc) => (
                    <li key={inc.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-midnight-900 truncate">{inc.title}</p>
                        <p className="text-xs text-midnight-400 capitalize">{inc.type.replace('_', ' ')}</p>
                      </div>
                      <Badge tone={statusTone(inc.status)}>{inc.status || 'reported'}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AdminOverview({ data }: { data: AdminDashboard }) {
  const days = data.period?.days ?? 30
  const s = data.summary
  const attention = data.attention ?? []
  const setup = data.setup ?? []
  const setupDone = setup.length > 0 && setup.every((x) => x.done)
  const r = data.response
  return (
    <div className="space-y-6">
      <section className="card p-5 sm:p-6" aria-labelledby="attention-h">
        <div className="flex items-center justify-between mb-4">
          <h3 id="attention-h" className="font-display font-semibold text-midnight-900">Needs your attention</h3>
          {attention.length > 0 && <Badge tone={attention.some((a) => a.level === 'critical') ? 'alert' : 'warning'}>{attention.length}</Badge>}
        </div>
        <AttentionList items={attention} limit={5} />
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile label={`Visitors (${days}d)`} value={s.total_visitors} icon={QrCode} change={changeLabel(s.visitors_change_pct, days)} changePct={s.visitors_change_pct} hint={`${s.visitors_prev ?? 0} in the previous ${days} days`} />
        <KpiTile label="Open incidents" value={s.active_incidents} icon={Siren} hint={`${s.incidents_new ?? 0} reported in ${days} days`} />
        <KpiTile label="Open alerts" value={s.active_alerts} icon={Bell} hint={`${s.total_alerts} raised in ${days} days`} />
        <KpiTile
          label="Residents active (7d)"
          value={data.people ? `${data.people.residents_active_7d ?? 0} of ${data.people.residents}` : s.users_active_7d ?? '—'}
          icon={Users2}
          hint={`${s.users_active_7d ?? 0} people in total used NexHood this week`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="card p-5 sm:p-6 lg:col-span-2" aria-labelledby="activity-h">
          <div className="flex items-center justify-between mb-2">
            <h3 id="activity-h" className="font-display font-semibold text-midnight-900">What's happening in the estate</h3>
            <Link to="/app/analytics" className="text-xs font-semibold text-royal flex items-center gap-1 hover:underline">
              Full analytics <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ActivityFeed items={data.recent_activity} limit={10} empty={`Nothing happened in the estate in the last ${days} days.`} />
        </section>

        <div className="space-y-6">
          <section className="card p-5 sm:p-6" aria-labelledby="response-h">
            <h3 id="response-h" className="font-display font-semibold text-midnight-900 flex items-center gap-2">
              <Timer className="h-4 w-4 text-royal" /> Emergency response ({days}d)
            </h3>
            {r && r.alerts_total > 0 ? (
              <dl className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-midnight-400">Typical time to first response</dt>
                  <dd className="font-display text-xl font-semibold text-midnight-900">{formatDuration(r.median_ack_minutes)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-midnight-400">Alerts someone responded to</dt>
                  <dd className="font-display text-xl font-semibold text-midnight-900">{r.ack_rate_pct ?? 0}%</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-sm text-midnight-400">No alerts raised in the last {days} days.</p>
            )}
          </section>

          {setup.length > 0 && !setupDone && (
            <section className="card p-5 sm:p-6">
              <SetupChecklist steps={setup} />
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
