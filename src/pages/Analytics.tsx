import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { Users2, QrCode, Siren, Bell, HeartHandshake, MessageSquare } from 'lucide-react'
import { getDashboard } from '@/lib/api'
import type { AdminDashboard } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'

const PIE_COLORS = ['#00139E', '#FE1513', '#A3B5CB', '#071456', '#4f61bb', '#e30f0d']

const ROLE_LABELS: Record<string, string> = {
  resident: 'Residents',
  guard: 'Guards',
  admin: 'Admins',
  police: 'Police',
  super_admin: 'Super admins',
}

const PASS_STATUS_TONE: Record<string, 'success' | 'steel' | 'alert' | 'neutral'> = {
  active: 'success',
  used: 'steel',
  expired: 'alert',
}

const ALERT_STATUS_TONE: Record<string, 'alert' | 'warning' | 'success' | 'neutral'> = {
  active: 'alert',
  acknowledged: 'warning',
  resolved: 'success',
}

const SEVERITY_TONE: Record<string, 'alert' | 'warning' | 'steel' | 'neutral'> = {
  critical: 'alert',
  high: 'alert',
  medium: 'warning',
  low: 'steel',
}

function titleCase(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function BreakdownRow({
  items,
  toneMap,
  labelMap,
  emptyText,
}: {
  // Defensive: an old/mismatched backend response might omit this field
  // entirely rather than send an empty array, so don't assume it's there.
  items: { id: string; count: number }[] | undefined
  toneMap?: Record<string, 'success' | 'warning' | 'alert' | 'steel' | 'neutral' | 'royal'>
  labelMap?: Record<string, string>
  emptyText: string
}) {
  if (!items || items.length === 0) return <p className="text-sm text-midnight-400">{emptyText}</p>
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item.id} tone={toneMap?.[item.id] || 'neutral'}>
          {labelMap?.[item.id] || titleCase(item.id)}: {item.count}
        </Badge>
      ))}
    </div>
  )
}

export default function Analytics() {
  const [data, setData] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboard()
      .then((d) => setData(d as AdminDashboard))
      .finally(() => setLoading(false))
  }, [])

  const chartData = useMemo(() => {
    if (!data) return []
    const map = new Map<string, { date: string; incidents: number; visitors: number }>()
    data.trends.incidents.forEach((row) => {
      map.set(row.id, { date: row.id, incidents: row.count, visitors: map.get(row.id)?.visitors || 0 })
    })
    data.trends.visitors.forEach((row) => {
      const existing = map.get(row.id)
      map.set(row.id, { date: row.id, incidents: existing?.incidents || 0, visitors: row.count })
    })
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [data])

  const pieData = useMemo(
    () => (data?.distributions.incident_types || []).map((t) => ({ name: titleCase(t.id), value: t.count })),
    [data],
  )

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-royal">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (!data) return <p className="text-midnight-400">Could not load analytics.</p>

  return (
    <div>
      <PageHeader title="Analytics" subtitle="30-day overview of your estate's security activity." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Visitor passes (30d)" value={data.summary.total_visitors} icon={QrCode} tone="royal" />
        <StatCard label="Open incidents" value={data.summary.active_incidents} icon={Siren} tone="alert" />
        <StatCard label="Alerts needing attention" value={data.summary.active_alerts ?? data.summary.total_alerts} icon={Bell} tone="midnight" />
        <StatCard label="Active users (all roles)" value={data.summary.total_users} icon={Users2} tone="steel" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-midnight-900 mb-3 text-sm">Users by role</h3>
          <BreakdownRow items={data.distributions.users_by_role} labelMap={ROLE_LABELS} emptyText="No active users yet." />
          <p className="text-xs text-midnight-400 mt-3">Admin is capped at 3 per estate — see Users to invite more residents, guards or police.</p>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-midnight-900 mb-3 text-sm">Visitor pass status (30d)</h3>
          <BreakdownRow items={data.distributions.pass_status} toneMap={PASS_STATUS_TONE} emptyText="No visitor passes issued yet." />
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-midnight-900 mb-3 text-sm">Open incidents by severity</h3>
          <BreakdownRow items={data.distributions.incident_severity_open} toneMap={SEVERITY_TONE} emptyText="Nothing open right now." />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-midnight-900 mb-1">Incidents vs. visitor passes</h3>
          <p className="text-xs text-midnight-400 mb-4">Daily volume over the last 30 days</p>
          {chartData.length === 0 ? (
            <p className="text-sm text-midnight-400 py-12 text-center">Not enough data yet to chart.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#7b89cc' }} tickLine={false} axisLine={{ stroke: '#eef0f9' }} />
                <YAxis tick={{ fontSize: 11, fill: '#7b89cc' }} tickLine={false} axisLine={{ stroke: '#eef0f9' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eef0f9', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="incidents" stroke="#FE1513" strokeWidth={2.5} dot={false} name="Incidents" />
                <Line type="monotone" dataKey="visitors" stroke="#00139E" strokeWidth={2.5} dot={false} name="Visitor passes" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-display font-semibold text-midnight-900 mb-1">Incident types</h3>
          <p className="text-xs text-midnight-400 mb-4">Breakdown by category (30d)</p>
          {pieData.length === 0 ? (
            <p className="text-sm text-midnight-400 py-12 text-center">No incidents recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #eef0f9', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <div className="card p-6">
          <h3 className="font-display font-semibold text-midnight-900 mb-1">Alerts (30d)</h3>
          <p className="text-xs text-midnight-400 mb-4">By status and type — resolve stale alerts from the Alerts page.</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-midnight-400 mb-1.5">Status</p>
              <BreakdownRow items={data.distributions.alert_status} toneMap={ALERT_STATUS_TONE} emptyText="No alerts raised yet." />
            </div>
            <div>
              <p className="text-xs font-medium text-midnight-400 mb-1.5">Type</p>
              <BreakdownRow items={data.distributions.alert_types} emptyText="No alerts raised yet." />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-display font-semibold text-midnight-900 mb-1">Community & welfare</h3>
          <p className="text-xs text-midnight-400 mb-4">How engaged the estate is beyond security events.</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-midnight-50/60 p-3 text-center">
              <MessageSquare className="h-4 w-4 text-royal mx-auto mb-1.5" />
              <p className="font-display font-semibold text-midnight-900">{data.engagement?.posts_last_30d ?? 0}</p>
              <p className="text-xs text-midnight-400">Posts (30d)</p>
            </div>
            <div className="rounded-xl bg-midnight-50/60 p-3 text-center">
              <HeartHandshake className="h-4 w-4 text-royal mx-auto mb-1.5" />
              <p className="font-display font-semibold text-midnight-900">{data.engagement?.active_campaigns ?? 0}</p>
              <p className="text-xs text-midnight-400">Active campaigns</p>
            </div>
            <div className="rounded-xl bg-midnight-50/60 p-3 text-center">
              <p className="font-display font-semibold text-midnight-900">₦{(data.engagement?.welfare_raised_total ?? 0).toLocaleString()}</p>
              <p className="text-xs text-midnight-400">Welfare raised (all-time)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 mt-6">
        <h3 className="font-display font-semibold text-midnight-900 mb-4">Recent activity log</h3>
        {data.recent_activity.length === 0 ? (
          <p className="text-sm text-midnight-400">Nothing logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-midnight-400 border-b border-midnight-50">
                  <th className="py-2 pr-4 font-semibold">Action</th>
                  <th className="py-2 pr-4 font-semibold">Entity</th>
                  <th className="py-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_activity.map((a, i) => (
                  <tr key={i} className="border-b border-midnight-50 last:border-0">
                    <td className="py-2.5 pr-4 capitalize text-midnight-800">{String(a.action)}</td>
                    <td className="py-2.5 pr-4 capitalize text-midnight-600">{String(a.entity)}</td>
                    <td className="py-2.5 text-midnight-400 text-xs">{new Date(String(a.timestamp)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
