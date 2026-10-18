import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users2, QrCode, Siren, Bell, ArrowRight, Timer, Wallet, Wrench, DoorOpen, ScanLine, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getDashboard } from '@/lib/api'
import type { AdminDashboard, ResidentDashboard } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { AlertSetupCard } from '@/components/alerts/AlertSetupCard'
import { InstallAppCard } from '@/components/onboarding/InstallAppCard'
import { Spinner } from '@/components/ui/Spinner'
import { Badge, statusTone } from '@/components/ui/Badge'
import { ActivityFeed, AttentionList, KpiTile, SetupChecklist } from '@/components/analytics/Widgets'
import { changeLabel, clockTime, formatDuration, timeAgo } from '@/components/analytics/format'
import type { VisitorPass } from '@/lib/types'

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

      <InstallAppCard />

      {loading && (
        <div className="flex justify-center py-20 text-royal">
          <Spinner className="h-6 w-6" />
        </div>
      )}

      {error && <div className="card p-6 text-alert-600 text-sm">{error}</div>}

      {data && (
        <div className="space-y-8">
          {/* Guards and admins must get emergencies on their phone. */}
          {(user?.role === 'guard' || isAdmin) && <AlertSetupCard hideWhenOn />}

          {isAdminDashboard(data) ? (
            <AdminOverview data={data} />
          ) : user?.role === 'guard' || user?.role === 'police' ? (
            <GateView data={data} />
          ) : (
            <ResidentView data={data} />
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

function QuickAction({ to, icon: Icon, label, tone = 'royal' }: { to: string; icon: typeof Bell; label: string; tone?: 'royal' | 'alert' }) {
  return (
    <Link
      to={to}
      className={`card p-4 flex flex-col items-start gap-3 hover:shadow-lg transition press ${tone === 'alert' ? 'bg-alert-50 border-alert-100' : ''}`}
    >
      <span className={`h-10 w-10 rounded-xl flex items-center justify-center ${tone === 'alert' ? 'bg-alert text-warm' : 'bg-royal-50 text-royal-600'}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-semibold text-midnight-900">{label}</span>
    </Link>
  )
}

function OpenAlertsCard({ data }: { data: ResidentDashboard }) {
  const alerts = data.estate_open_alerts ?? []
  if (alerts.length === 0) return null
  return (
    <section className="card p-5 sm:p-6 border-alert-100" aria-labelledby="oa-h">
      <div className="flex items-center justify-between mb-3">
        <h3 id="oa-h" className="font-display font-semibold text-midnight-900 flex items-center gap-2"><Bell className="h-4 w-4 text-alert" /> Open alerts in the estate</h3>
        <Link to="/app/alerts" className="text-xs font-semibold text-royal hover:underline">View</Link>
      </div>
      <ul className="divide-y divide-midnight-50">
        {alerts.slice(0, 4).map((a) => (
          <li key={a.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate"><span className="font-semibold capitalize">{a.type.replace('_', ' ')}</span>{a.sender_name ? ` · ${a.sender_name}` : ''}</span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-midnight-400">{timeAgo(a.created_at)}</span>
              <Badge tone={a.status === 'active' ? 'alert' : 'warning'}>{a.status === 'active' ? 'No response yet' : 'Responded'}</Badge>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ResidentView({ data }: { data: ResidentDashboard }) {
  const bills = data.bills
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction to="/app/alerts" icon={Bell} label="Raise an alert" tone="alert" />
        <QuickAction to="/app/visitor-passes" icon={QrCode} label="Visitor pass" />
        <QuickAction to="/app/payments" icon={Wallet} label="Pay bills" />
        <QuickAction to="/app/repairs" icon={Wrench} label="Report a repair" />
      </div>

      <OpenAlertsCard data={data} />

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5 sm:p-6" aria-labelledby="bills-h">
          <h3 id="bills-h" className="font-display font-semibold text-midnight-900 flex items-center gap-2"><Wallet className="h-4 w-4 text-royal" /> Your bills</h3>
          {!bills?.has_unit ? (
            <p className="mt-3 text-sm text-midnight-500">Your house/flat isn't set up for bills yet. Your estate admin will add it.</p>
          ) : bills.balance_due > 0 ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-3xl font-semibold text-midnight-900">₦{bills.balance_due.toLocaleString()}</p>
                <p className="text-xs text-midnight-500">{bills.overdue_bills ? <span className="text-alert-600 font-semibold">{bills.overdue_bills} overdue</span> : 'to pay'}</p>
              </div>
              <Link to="/app/payments" className="btn-alert">Pay now</Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> You're all paid up{bills.credit ? `, with ₦${bills.credit.toLocaleString()} estate balance` : ''}.</p>
          )}
          <Link to="/app/finances" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-royal hover:underline">See how the estate spends its money <ArrowRight className="h-3 w-3" /></Link>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="vis-h">
          <div className="flex items-center justify-between">
            <h3 id="vis-h" className="font-display font-semibold text-midnight-900 flex items-center gap-2"><QrCode className="h-4 w-4 text-royal" /> Your upcoming visitors</h3>
            <Link to="/app/visitor-passes" className="text-xs font-semibold text-royal hover:underline">New pass</Link>
          </div>
          <PassList items={data.my_passes ?? []} empty="No visitors expected. Create a pass before someone comes over." />
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-midnight-900">Your incident reports</h3>
            <Link to="/app/incidents" className="text-xs font-semibold text-royal flex items-center gap-1 hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {data.recentIncidents.length === 0 ? (
            <p className="text-sm text-midnight-400">You haven't reported any incidents.</p>
          ) : (
            <ul className="divide-y divide-midnight-50">
              {data.recentIncidents.map((inc) => (
                <li key={inc.id} className="py-2.5 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-midnight-900 truncate">{inc.title}</p>
                  <Badge tone={statusTone(inc.status)}>{inc.status || 'reported'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-semibold text-midnight-900 flex items-center gap-2"><Wrench className="h-4 w-4 text-royal" /> Repairs in the estate</h3>
            <p className="mt-2 text-sm text-midnight-600">{data.open_repairs ? `${data.open_repairs} problem${data.open_repairs === 1 ? '' : 's'} waiting to be fixed.` : 'Nothing waiting to be fixed.'}</p>
          </div>
          <Link to="/app/repairs" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-royal hover:underline">See repairs or report one <ArrowRight className="h-3 w-3" /></Link>
        </section>
      </div>
    </div>
  )
}

function PassList({ items, empty, arrived = false }: { items: VisitorPass[]; empty: string; arrived?: boolean }) {
  if (items.length === 0) return <p className="mt-3 text-sm text-midnight-400">{empty}</p>
  return (
    <ul className="mt-2 divide-y divide-midnight-50">
      {items.map((p) => (
        <li key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0">
            <span className="font-semibold text-midnight-900">{p.visitor_name}</span>
            <span className="block text-xs text-midnight-400 truncate">
              {arrived ? `Visiting ${p.host_name}${p.host_apartment && p.host_apartment !== 'N/A' ? `, ${p.host_apartment}` : ''}` : p.purpose || `Visiting ${p.host_name || 'you'}`}
            </span>
          </span>
          <span className="text-xs text-midnight-500 shrink-0 text-right tabular-nums">
            {arrived ? `Arrived ${clockTime(p.used_at)}` : `${clockTime(p.valid_from)} – ${clockTime(p.valid_until)}`}
            {!arrived && <span className="block font-mono font-semibold text-midnight-900">{p.code}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function GateView({ data }: { data: ResidentDashboard }) {
  const expected = data.gate?.expected ?? []
  const arrived = data.gate?.arrived ?? []
  return (
    <div className="space-y-6">
      <Link to="/app/visitor-passes" className="card p-5 flex items-center gap-4 bg-midnight-900 text-warm hover:shadow-lg press">
        <span className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center"><ScanLine className="h-6 w-6" /></span>
        <span className="flex-1">
          <span className="block font-display text-lg font-semibold">Check in a visitor</span>
          <span className="block text-sm text-steel-200">Scan their QR code or type the 4-character code</span>
        </span>
        <ArrowRight className="h-5 w-5" />
      </Link>

      <OpenAlertsCard data={data} />

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center"><p className="font-display text-2xl font-semibold">{expected.length}</p><p className="text-xs text-midnight-500">Expected today</p></div>
        <div className="card p-4 text-center"><p className="font-display text-2xl font-semibold">{arrived.length}</p><p className="text-xs text-midnight-500">Checked in today</p></div>
        <div className="card p-4 text-center"><p className="font-display text-2xl font-semibold">{data.summary.active_incidents}</p><p className="text-xs text-midnight-500">Open incidents</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="card p-5 sm:p-6" aria-labelledby="exp-h">
          <h3 id="exp-h" className="font-display font-semibold text-midnight-900 flex items-center gap-2"><Timer className="h-4 w-4 text-royal" /> Expected today</h3>
          <PassList items={expected} empty="No visitors expected for the rest of today." />
        </section>
        <section className="card p-5 sm:p-6" aria-labelledby="arr-h">
          <h3 id="arr-h" className="font-display font-semibold text-midnight-900 flex items-center gap-2"><DoorOpen className="h-4 w-4 text-emerald-600" /> Checked in today</h3>
          <PassList items={arrived} arrived empty="No one has checked in yet today." />
        </section>
      </div>
    </div>
  )
}
