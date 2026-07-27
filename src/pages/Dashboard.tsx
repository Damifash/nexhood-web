import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users2, QrCode, Siren, Bell, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getDashboard } from '@/lib/api'
import type { AdminDashboard, ResidentDashboard } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Spinner } from '@/components/ui/Spinner'
import { Badge, statusTone } from '@/components/ui/Badge'

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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Visitor passes" value={data.summary.total_visitors} icon={QrCode} tone="royal" />
            <StatCard label="Active incidents" value={data.summary.active_incidents} icon={Siren} tone="alert" />
            <StatCard label="Alerts" value={data.summary.total_alerts} icon={Bell} tone="midnight" />
            {isAdmin && <StatCard label="Active residents" value={data.summary.total_users} icon={Users2} tone="steel" />}
          </div>

          {isAdminDashboard(data) ? (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="font-display font-semibold text-midnight-900 mb-4">Incident types (30 days)</h3>
                {data.distributions.incident_types.length === 0 ? (
                  <p className="text-sm text-midnight-400">No incidents recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.distributions.incident_types.map((t) => {
                      const max = Math.max(...data.distributions.incident_types.map((x) => x.count), 1)
                      return (
                        <div key={t.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize text-midnight-700">{t.id.replace('_', ' ')}</span>
                            <span className="text-midnight-400">{t.count}</span>
                          </div>
                          <div className="h-2 rounded-full bg-midnight-50 overflow-hidden">
                            <div className="h-full bg-royal rounded-full" style={{ width: `${(t.count / max) * 100}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-midnight-900">Recent activity</h3>
                  <Link to="/app/analytics" className="text-xs font-semibold text-royal flex items-center gap-1 hover:underline">
                    Full analytics <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {data.recent_activity.length === 0 ? (
                  <p className="text-sm text-midnight-400">Nothing logged yet.</p>
                ) : (
                  <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {data.recent_activity.slice(0, 8).map((a, i) => (
                      <li key={i} className="text-sm flex items-center justify-between gap-3 border-b border-midnight-50 pb-3 last:border-0 last:pb-0">
                        <span className="text-midnight-700 capitalize truncate">
                          {String(a.action)} {String(a.entity)}
                        </span>
                        <Badge tone="royal">{String(a.action)}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
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
