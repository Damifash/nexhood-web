import { useEffect, useState, type FormEvent } from 'react'
import { HeartHandshake, ExternalLink, AlertCircle, Plus, Users2, Shield, CheckCircle2, Clock } from 'lucide-react'
import { createCampaign, donate, listCampaigns, listPendingDonations, verifyDonation, type PendingDonation } from '@/lib/api'
import type { WelfareCampaign } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Spinner, EmptyState } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'

const PRESETS = [1000, 2500, 5000, 10000]

export default function Welfare() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<WelfareCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [donateTarget, setDonateTarget] = useState<WelfareCampaign | 'general' | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  async function load() {
    setLoading(true)
    try {
      setCampaigns(await listCampaigns())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Welfare Fund"
        subtitle="Support the guards and police who protect your estate."
        action={
          isAdmin ? (
            <button className="btn-outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New campaign
            </button>
          ) : undefined
        }
      />

      <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 mb-6">
        Payments aren't wired up to a real processor yet — donating here records a pledge, not a real charge.
        Pledges only count toward a campaign's total once {isAdmin ? 'you confirm' : 'your admin confirms'} the money actually arrived.
      </div>

      {isAdmin && <PendingDonationsCard />}

      {loading ? (
        <div className="flex justify-center py-16 text-royal"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="space-y-4 mb-6">
          {campaigns.length === 0 ? (
            <EmptyState title="No active campaigns" subtitle={isAdmin ? 'Start one — new uniforms, a patrol vehicle, fuel, anything specific.' : 'Your admin hasn\'t started one yet.'} />
          ) : (
            campaigns.map((c) => <CampaignCard key={c.id} campaign={c} onDonate={() => setDonateTarget(c)} />)
          )}
        </div>
      )}

      <div className="card p-6 flex items-center justify-between gap-4">
        <div>
          <p className="font-display font-semibold text-midnight-900">General support</p>
          <p className="text-sm text-midnight-400">No specific cause in mind? Give directly to guards or police welfare.</p>
        </div>
        <button className="btn-alert shrink-0" onClick={() => setDonateTarget('general')}>
          <HeartHandshake className="h-4 w-4" /> Donate
        </button>
      </div>

      {donateTarget && (
        <DonateModal
          target={donateTarget}
          onClose={() => setDonateTarget(null)}
        />
      )}

      {isAdmin && (
        <CreateCampaignModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => { setCampaigns((prev) => [{ total_raised: 0, donor_count: 0, ...c }, ...prev]); setCreateOpen(false) }}
        />
      )}
    </div>
  )
}

function CampaignCard({ campaign, onDonate }: { campaign: WelfareCampaign; onDonate: () => void }) {
  // A freshly created campaign comes back without the computed
  // total_raised / donor_count fields (they're added by the list
  // aggregation) — calling .toLocaleString() on undefined crashed the
  // whole page to blank right after "Create campaign". Default to 0.
  const raised = campaign.total_raised ?? 0
  const donors = campaign.donor_count ?? 0
  const pct = campaign.goal_amount ? Math.min(100, Math.round((raised / campaign.goal_amount) * 100)) : null
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-midnight-900">{campaign.title}</h3>
            <Badge tone={campaign.for_role === 'police' ? 'royal' : campaign.for_role === 'guards' ? 'alert' : 'neutral'}>
              {campaign.for_role === 'police' ? <Shield className="h-3 w-3" /> : <Users2 className="h-3 w-3" />}
              {campaign.for_role}
            </Badge>
          </div>
          {campaign.description && <p className="text-sm text-midnight-500 mt-1">{campaign.description}</p>}
        </div>
        <button className="btn-primary shrink-0" onClick={onDonate}>Donate</button>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="font-semibold text-midnight-800">₦{raised.toLocaleString()} raised</span>
          {campaign.goal_amount && <span className="text-midnight-400">of ₦{campaign.goal_amount.toLocaleString()} goal</span>}
        </div>
        {pct !== null && (
          <div className="h-2 rounded-full bg-midnight-50 overflow-hidden">
            <div className="h-full bg-royal rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        <p className="text-xs text-midnight-400 mt-1">
          {donors} {donors === 1 ? 'donor' : 'donors'} so far
        </p>
      </div>
    </div>
  )
}

function DonateModal({ target, onClose }: { target: WelfareCampaign | 'general'; onClose: () => void }) {
  const isGeneral = target === 'general'
  const [amount, setAmount] = useState(2500)
  const [forRole, setForRole] = useState<'guards' | 'police'>(
    !isGeneral && target.for_role !== 'general' ? target.for_role : 'guards'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { paystack_link } = await donate(amount, forRole, isGeneral ? undefined : target.id)
      setLink(paystack_link)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start donation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={isGeneral ? 'General donation' : target.title}>
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3 mb-4">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {link ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-sm text-emerald-800 mb-1">Your pledge has been recorded.</p>
          <p className="text-xs text-emerald-700 mb-3">It won't show up in the campaign total until your admin confirms the money's actually in.</p>
          <a href={link} target="_blank" rel="noreferrer" className="btn-primary">
            Continue to checkout <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Amount (₦)</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setAmount(p)}
                  className={`rounded-xl border py-2 text-sm font-semibold transition-colors ${
                    amount === p ? 'border-royal bg-royal-50 text-royal-700' : 'border-midnight-200 text-midnight-600 hover:bg-midnight-50'
                  }`}
                >
                  {p.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={100}
              step={100}
              className="input"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          {(isGeneral || target.for_role === 'general') && (
            <div>
              <label className="label">Support</label>
              <div className="grid grid-cols-2 gap-2">
                {(['guards', 'police'] as const).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setForRole(r)}
                    className={`rounded-xl border py-2.5 text-sm font-semibold capitalize transition-colors ${
                      forRole === r ? 'border-royal bg-royal-50 text-royal-700' : 'border-midnight-200 text-midnight-600 hover:bg-midnight-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading || amount <= 0} className="btn-alert w-full">
            {loading ? <Spinner className="h-4 w-4" /> : `Donate ₦${amount.toLocaleString()}`}
          </button>
        </form>
      )}
    </Modal>
  )
}

function CreateCampaignModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: WelfareCampaign) => void }) {
  const [form, setForm] = useState({ title: '', description: '', for_role: 'guards' as 'guards' | 'police' | 'general', goal_amount: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const campaign = await createCampaign({
        title: form.title,
        description: form.description || undefined,
        for_role: form.for_role,
        goal_amount: form.goal_amount ? Number(form.goal_amount) : undefined,
      })
      onCreated(campaign)
      setForm({ title: '', description: '', for_role: 'guards', goal_amount: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New welfare campaign">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        <div>
          <label className="label">Title</label>
          <input required minLength={3} className="input" placeholder="New patrol vehicle" value={form.title} onChange={(e) => update('title', e.target.value)} />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input" rows={2} placeholder="What this is for, and why it matters" value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Support</label>
            <select className="input" value={form.for_role} onChange={(e) => update('for_role', e.target.value as typeof form.for_role)}>
              <option value="guards">Guards</option>
              <option value="police">Police</option>
              <option value="general">Either</option>
            </select>
          </div>
          <div>
            <label className="label">Goal (₦, optional)</label>
            <input type="number" min={100} step={100} className="input" placeholder="No goal" value={form.goal_amount} onChange={(e) => update('goal_amount', e.target.value)} />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner className="h-4 w-4" /> : 'Create campaign'}
        </button>
      </form>
    </Modal>
  )
}

function PendingDonationsCard() {
  const [pending, setPending] = useState<PendingDonation[]>([])
  const [loading, setLoading] = useState(true)
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      setPending(await listPendingDonations())
    } catch {
      // Non-critical — the rest of the page still works without this card.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleVerify(id: string) {
    setError('')
    setVerifyingId(id)
    try {
      await verifyDonation(id)
      setPending((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify donation')
    } finally {
      setVerifyingId(null)
    }
  }

  if (loading || pending.length === 0) return null

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4 text-amber-500" />
        <h3 className="font-display font-semibold text-midnight-900">Pending donations</h3>
      </div>
      <p className="text-sm text-midnight-400 mb-4">
        Pledges waiting on confirmation — mark as received once the money's actually in, and it'll count toward the campaign total.
      </p>
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3 mb-4">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      <ul className="divide-y divide-midnight-50">
        {pending.map((d) => (
          <li key={d.id} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-midnight-900">₦{d.amount.toLocaleString()} · {d.donor_name || 'A resident'}</p>
              <p className="text-xs text-midnight-400 capitalize">{d.for_role} · {new Date(d.timestamp).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => handleVerify(d.id)}
              disabled={verifyingId === d.id}
              className="btn-outline text-xs px-3 py-1.5 shrink-0"
            >
              {verifyingId === d.id ? <Spinner className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Mark received
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
