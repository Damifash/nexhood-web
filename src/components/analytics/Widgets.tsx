import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle, ArrowRight, Bell, Check, CheckCircle2, CircleAlert, DoorOpen, HeartHandshake, Info, MessageSquare, Minus,
  PencilLine, QrCode, Settings2, ShieldAlert, ShieldCheck, Siren, TrendingDown, TrendingUp, UserCog, UserMinus, UserPlus,
} from 'lucide-react'
import type { ActivityItem, AttentionItem, MemberActivity, SetupStep } from '@/lib/types'
import { clockTime, dayHeading, parseDate, timeAgo } from './format'

export function KpiTile({
  label,
  value,
  icon: Icon,
  change,
  changePct,
  hint,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  change?: string | null
  changePct?: number | null
  hint?: string
}) {
  const Trend = changePct === null || changePct === undefined || changePct === 0 ? Minus : changePct > 0 ? TrendingUp : TrendingDown
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-midnight-400">{label}</p>
        <span className="h-8 w-8 rounded-lg bg-royal-50 text-royal-600 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-midnight-900 tabular-nums">{value}</p>
      {change ? (
        <p className="mt-1 text-xs text-midnight-500 flex items-center gap-1">
          <Trend className="h-3.5 w-3.5" aria-hidden="true" /> {change}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-midnight-400">{hint}</p>
      ) : null}
    </div>
  )
}

const LEVEL_STYLE: Record<AttentionItem['level'], { icon: LucideIcon; cls: string; label: string }> = {
  critical: { icon: AlertTriangle, cls: 'bg-alert-50 text-alert-700 border-alert-100', label: 'Urgent' },
  warning: { icon: CircleAlert, cls: 'bg-amber-50 text-amber-800 border-amber-100', label: 'Needs a look' },
  info: { icon: Info, cls: 'bg-royal-50 text-royal-700 border-royal-100', label: 'Tip' },
}

export function AttentionList({ items, limit }: { items: AttentionItem[]; limit?: number }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">
        <Check className="h-4 w-4 shrink-0" /> All clear. Nothing needs your attention right now.
      </div>
    )
  }
  const shown = limit ? items.slice(0, limit) : items
  return (
    <ul className="space-y-2.5">
      {shown.map((it) => {
        const s = LEVEL_STYLE[it.level]
        return (
          <li key={it.key}>
            <Link to={it.link} className={`group flex items-start gap-3 rounded-xl border px-4 py-3 transition hover:shadow-card ${s.cls}`}>
              <s.icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  <span className="sr-only">{s.label}: </span>
                  {it.title}
                </span>
                <span className="block text-xs opacity-90 mt-0.5">{it.detail}</span>
              </span>
              <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 opacity-60 group-hover:translate-x-0.5 transition" aria-hidden="true" />
            </Link>
          </li>
        )
      })}
      {limit && items.length > limit && (
        <li className="text-xs text-midnight-400 pl-1">+{items.length - limit} more on the Analytics page</li>
      )}
    </ul>
  )
}

export function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-midnight-900">Estate setup</span>
        <span className="text-midnight-500 tabular-nums">{done} of {steps.length} done</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-midnight-50 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Estate setup progress">
        <div className="h-full rounded-full bg-royal" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.key} className="flex items-center gap-2.5 text-sm">
            <span className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-emerald-500 text-white' : 'border-2 border-midnight-200'}`}>
              {s.done && <Check className="h-3 w-3" />}
            </span>
            <span className={s.done ? 'text-midnight-400 line-through' : 'text-midnight-700'}>{s.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const KIND_ICON: Record<string, { icon: LucideIcon; cls: string }> = {
  pass_created: { icon: QrCode, cls: 'bg-royal-50 text-royal-600' },
  pass_used: { icon: DoorOpen, cls: 'bg-emerald-50 text-emerald-600' },
  incident: { icon: Siren, cls: 'bg-amber-50 text-amber-700' },
  incident_resolved: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' },
  alert: { icon: Bell, cls: 'bg-alert-50 text-alert-600' },
  alert_ack: { icon: ShieldCheck, cls: 'bg-royal-50 text-royal-600' },
  alert_resolved: { icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' },
  police: { icon: ShieldAlert, cls: 'bg-alert-50 text-alert-600' },
  post: { icon: MessageSquare, cls: 'bg-steel-100 text-steel-700' },
  joined: { icon: UserPlus, cls: 'bg-royal-50 text-royal-600' },
  user_invite: { icon: UserPlus, cls: 'bg-royal-50 text-royal-600' },
  user_delete: { icon: UserMinus, cls: 'bg-midnight-50 text-midnight-600' },
  user_role_change: { icon: UserCog, cls: 'bg-midnight-50 text-midnight-600' },
  user_update: { icon: UserCog, cls: 'bg-midnight-50 text-midnight-600' },
  estate_update_settings: { icon: Settings2, cls: 'bg-midnight-50 text-midnight-600' },
  donation_verify: { icon: HeartHandshake, cls: 'bg-emerald-50 text-emerald-600' },
  incident_edit_content: { icon: PencilLine, cls: 'bg-midnight-50 text-midnight-600' },
}

export function ActivityFeed({ items, limit = 8, empty = 'Nothing happened in this period.' }: { items: ActivityItem[]; limit?: number; empty?: string }) {
  if (items.length === 0) return <p className="text-sm text-midnight-400 py-4">{empty}</p>
  const shown = items.slice(0, limit)
  const groups: { day: string; rows: ActivityItem[] }[] = []
  shown.forEach((it) => {
    const day = dayHeading(it.at)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.rows.push(it)
    else groups.push({ day, rows: [it] })
  })
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.day}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-midnight-400 mb-1.5">{g.day}</p>
          <ul className="space-y-1">
            {g.rows.map((it, i) => {
              const k = KIND_ICON[it.kind] || { icon: Info, cls: 'bg-midnight-50 text-midnight-600' }
              const body = (
                <>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${k.cls}`}>
                    <k.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-midnight-700 leading-snug">
                    {it.actor && <span className="font-semibold text-midnight-900">{it.actor} </span>}
                    {it.text}
                  </span>
                  <span className="text-xs text-midnight-400 shrink-0 tabular-nums pt-0.5">{clockTime(it.at)}</span>
                </>
              )
              return (
                <li key={`${it.at}-${i}`}>
                  {it.link ? (
                    <Link to={it.link} className="flex items-start gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-midnight-50/70 transition">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 px-2 py-1.5 -mx-2">{body}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function MemberList({ members, limit = 8 }: { members: MemberActivity[]; limit?: number }) {
  if (members.length === 0) return null
  return (
    <ul className="divide-y divide-midnight-50">
      {members.slice(0, limit).map((m, i) => {
        const d = parseDate(m.last_seen)
        const fresh = d && Date.now() - d.getTime() < 7 * 86400000
        return (
          <li key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-medium text-midnight-900">{m.name}</span>{' '}
              <span className="text-xs text-midnight-400 capitalize">{m.role}{m.unit ? ` · ${m.unit}` : ''}</span>
            </span>
            <span className={`text-xs shrink-0 flex items-center gap-1.5 ${fresh ? 'text-emerald-700' : 'text-midnight-400'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${fresh ? 'bg-emerald-500' : 'bg-midnight-200'}`} aria-hidden="true" />
              {m.last_seen ? `Active ${timeAgo(m.last_seen)}` : 'Never active'}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function PeriodPicker({ value, onChange }: { value: number; onChange: (d: 7 | 30 | 90 | 365) => void }) {
  const opts: { d: 7 | 30 | 90 | 365; label: string }[] = [
    { d: 7, label: '7 days' },
    { d: 30, label: '30 days' },
    { d: 90, label: '90 days' },
    { d: 365, label: '12 months' },
  ]
  return (
    <div role="group" aria-label="Time period" className="inline-flex rounded-full border border-midnight-200 bg-white p-1">
      {opts.map((o) => (
        <button
          key={o.d}
          type="button"
          onClick={() => onChange(o.d)}
          aria-pressed={value === o.d}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-royal-400 ${
            value === o.d ? 'bg-midnight-900 text-warm' : 'text-midnight-600 hover:bg-midnight-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
