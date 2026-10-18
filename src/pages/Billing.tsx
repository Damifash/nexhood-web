import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react'
import { getBilling, startPlanPayment, verifyPlanPayment, type BillingOverview, type PlanStatus } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

const STATUS: Record<PlanStatus, { label: string; tone: 'success' | 'royal' | 'warning' | 'alert' }> = {
  active: { label: 'Active', tone: 'success' },
  trialing: { label: 'Free trial', tone: 'royal' },
  grace: { label: 'Payment due', tone: 'warning' },
  lapsed: { label: 'Ended', tone: 'alert' },
}

export default function Billing() {
  const [data, setData] = useState<BillingOverview | null>(null)
  const [months, setMonths] = useState(3)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [params, setParams] = useSearchParams()

  async function load() {
    try {
      setData(await getBilling())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your plan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const reference = params.get('reference')
    if (!reference) {
      load()
      return
    }
    // Back from Paystack: confirm the payment, then refresh.
    verifyPlanPayment(reference)
      .then((r) => {
        if (r.status === 'paid') setNotice(r.paid_until ? `Payment received. Your plan now runs until ${day(r.paid_until)}.` : 'Payment received.')
        else setError('We could not confirm the payment yet. If money left your account, it will show here within a few minutes.')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not confirm the payment'))
      .finally(() => {
        setParams({}, { replace: true })
        load()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function pay() {
    setError('')
    setPaying(true)
    try {
      const { authorization_url } = await startPlanPayment(months)
      window.location.href = authorization_url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the payment')
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  const sub = data?.subscription
  const status = sub ? STATUS[sub.status] : null
  const chosen = data?.options.find((o) => o.months === months)

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Plan & billing" subtitle="What your estate pays NexHood. Residents' bills are under Bills & payments." />

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>{notice}</span>
        </div>
      )}

      {data && sub && status && (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-midnight-400 font-semibold">Your plan</p>
              <h3 className="font-display text-xl font-semibold text-midnight-900 mt-1">
                {data.tier ? data.tier.label : 'Large estate'} · {data.houses} {data.houses === 1 ? 'house' : 'houses'}
              </h3>
            </div>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="text-sm text-midnight-500 mt-3">
            {sub.status === 'active' && <>Paid until <b className="text-midnight-800">{day(sub.ends_at)}</b> ({sub.days_left} days left).</>}
            {sub.status === 'trialing' && <>Free trial ends <b className="text-midnight-800">{day(sub.ends_at)}</b> ({sub.days_left} days left). Pay any time; your paid months start when the trial ends.</>}
            {sub.status === 'grace' && <>Your plan ended on {day(sub.ends_at)}. Renew by <b className="text-midnight-800">{day(sub.grace_ends_at)}</b> to keep inviting people and sending bills.</>}
            {sub.status === 'lapsed' && <>Your plan has ended. Inviting people and sending bills are paused until you renew.</>}
          </p>
          <p className="text-xs text-midnight-400 mt-3 flex items-start gap-1.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" /> Panic alerts, visitor passes and incidents always keep working, even if a payment is late.
          </p>
        </div>
      )}

      {data && data.custom_quote && (
        <div className="card p-6">
          <h3 className="font-display font-semibold text-midnight-900">Your estate needs a custom price</h3>
          <p className="text-sm text-midnight-500 mt-1">
            For estates with more than 300 houses we agree a price with you. Email <a className="text-royal font-medium" href={`mailto:${data.contact}`}>{data.contact}</a>.
          </p>
        </div>
      )}

      {data && data.tier && (
        <div className="card p-6">
          <h3 className="font-display font-semibold text-midnight-900">Pay for your plan</h3>
          <p className="text-sm text-midnight-500 mt-1">
            {naira(data.tier.monthly)} a month for {data.tier.label.toLowerCase()}. Paid in advance for at least 3 months.
            {data.founding_percent > 0 && <> Your founding-estate discount of {data.founding_percent}% is included.</>}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4" role="radiogroup" aria-label="How many months">
            {data.options.map((o) => {
              const active = months === o.months
              return (
                <button
                  key={o.months}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setMonths(o.months)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${active ? 'border-royal bg-royal-50' : 'border-midnight-200 hover:bg-midnight-50'}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-midnight-900">{o.months} months</span>
                    {o.percent_off > 0 && <Badge tone="success">{o.percent_off}% off</Badge>}
                  </span>
                  <span className="block font-display text-lg font-semibold text-midnight-900 mt-1">{naira(o.total)}</span>
                  <span className="block text-xs text-midnight-400">{naira(o.per_month)} a month{o.saving > 0 ? ` · save ${naira(o.saving)}` : ''}</span>
                </button>
              )
            })}
          </div>

          {data.online ? (
            <button type="button" onClick={pay} disabled={paying || !chosen} className="btn-primary w-full sm:w-auto mt-5">
              {paying ? <Spinner className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />} Pay {chosen ? naira(chosen.total) : ''}
            </button>
          ) : null}
          <p className="text-xs text-midnight-400 mt-3">
            {data.online
              ? 'Pay by card, bank transfer or USSD on Paystack’s secure page. '
              : 'Online payment is being set up. '}
            Prefer to pay by bank transfer and get an invoice? Email <a className="text-royal font-medium" href={`mailto:${data.contact}`}>{data.contact}</a>.
          </p>
        </div>
      )}

      {data && data.history.length > 0 && (
        <div className="card p-6">
          <h3 className="font-display font-semibold text-midnight-900 mb-3">Payments</h3>
          <ul className="divide-y divide-midnight-100">
            {data.history.map((h) => (
              <li key={h.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-midnight-800">{h.months} months · {naira(h.amount)}</p>
                  <p className="text-xs text-midnight-400">
                    {day(h.period_start)} to {day(h.period_end)} · {h.method === 'paystack' ? 'Paystack' : 'Bank transfer'}
                  </p>
                </div>
                <span className="text-xs text-midnight-400 shrink-0">{day(h.paid_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
