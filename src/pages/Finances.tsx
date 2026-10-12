import { useEffect, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Eye, Plus, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  EXPENSE_LABEL, approveExpense, createExpense, currentMonth, getExpenseReceipt, getFinanceSettings, getStatement, listExpenses, listRepairs,
  monthLabel, rejectExpense, voidExpense,
  type Expense, type ExpenseCategory, type FinanceSettings, type Repair, type Statement,
} from '@/lib/finance'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { ErrorBox, ImagePicker, Money, Stat, formatDate } from '@/components/finance/ui'

// Validated categorical palette, fixed order per category (never by rank).
const CAT_COLOR: Record<ExpenseCategory, string> = {
  diesel_power: '#2a78d6',
  security_salaries: '#eb6834',
  repairs: '#1baf7a',
  cleaning_waste: '#eda100',
  water: '#e87ba4',
  admin: '#008300',
  other: '#6250d6',
}

function shiftMonth(m: string, by: number) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Finances() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const [month, setMonth] = useState(currentMonth())
  const [st, setSt] = useState<Statement | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [pending, setPending] = useState<Expense[]>([])
  const [fin, setFin] = useState<FinanceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [receipt, setReceipt] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [s, e, f, p] = await Promise.all([
        getStatement(month),
        listExpenses({ month }),
        getFinanceSettings(),
        isAdmin ? listExpenses({ status: 'pending_approval' }) : Promise.resolve([] as Expense[]),
      ])
      setSt(s)
      setExpenses(e.filter((x) => x.status !== 'pending_approval'))
      setFin(f)
      setPending(p)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const isApprover = !!fin?.approver && fin.approver.id === user?.id
  const canDecide = (e: Expense) => (fin?.approver ? isApprover : isAdmin && e.created_by_name !== user?.name)
  const isFuture = month >= currentMonth()

  return (
    <div>
      <PageHeader
        title="Estate finances"
        subtitle="Money in, money out, and what it was spent on. Every resident can see this."
        action={isAdmin ? <button className="btn-primary" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Record expense</button> : undefined}
      />

      <div className="flex items-center gap-2 mb-5">
        <button className="btn-outline px-2.5 py-2" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
        <p className="font-display font-semibold text-lg text-midnight-900 min-w-[10rem] text-center">{monthLabel(month)}</p>
        <button className="btn-outline px-2.5 py-2" onClick={() => setMonth(shiftMonth(month, 1))} disabled={isFuture} aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
      </div>

      <ErrorBox message={error} />

      {isAdmin && pending.length > 0 && (
        <section className="card p-5 mb-6 border-amber-200">
          <h3 className="font-display font-semibold text-midnight-900 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-600" /> Waiting for approval</h3>
          <p className="text-xs text-midnight-400 mb-3">
            Spending of ₦{(fin?.approval_threshold ?? 100000).toLocaleString()} or more needs {fin?.approver?.name ? `${fin.approver.name}'s` : "another admin's"} approval before it counts.
          </p>
          <ul className="divide-y divide-midnight-50">
            {pending.map((e) => (
              <li key={e.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-midnight-900"><Money value={e.amount} /> · {EXPENSE_LABEL[e.category]}</p>
                  <p className="text-xs text-midnight-500">{e.description}{e.vendor ? ` · ${e.vendor}` : ''} · by {e.created_by_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {e.has_receipt && <ReceiptButton id={e.id} onShow={setReceipt} />}
                  {canDecide(e) ? (
                    <>
                      <button className="btn-primary text-xs px-3 py-1.5" onClick={async () => { await approveExpense(e.id); load() }}>Approve</button>
                      <button className="btn-outline text-xs px-3 py-1.5" onClick={async () => {
                        const r = prompt('Why are you rejecting this?')
                        if (r === null) return
                        await rejectExpense(e.id, r)
                        load()
                      }}>Reject</button>
                    </>
                  ) : (
                    <Badge tone="warning">Waiting for {fin?.approver?.name || 'another admin'}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {loading || !st ? (
        <div className="flex justify-center py-16 text-royal"><Spinner className="h-6 w-6" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Start of month"><Money value={st.opening_balance} /></Stat>
            <Stat label="Collected" tone="good"><Money value={st.collected} /></Stat>
            <Stat label="Spent"><Money value={st.spent} /></Stat>
            <Stat label="End of month" tone={st.closing_balance < 0 ? 'bad' : 'neutral'}><Money value={st.closing_balance} /></Stat>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <section className="card p-5 sm:p-6 lg:col-span-2" aria-labelledby="where-h">
              <h3 id="where-h" className="font-display font-semibold text-midnight-900">Where the money went</h3>
              <p className="text-xs text-midnight-400 mb-4">Approved spending in {monthLabel(st.month)}</p>
              {st.spending.length === 0 ? (
                <p className="text-sm text-midnight-400">Nothing spent this month.</p>
              ) : (
                <>
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-4" aria-hidden="true">
                    {st.spending.map((s) => (
                      <div key={s.category} style={{ width: `${(s.total / st.spent) * 100}%`, background: CAT_COLOR[s.category] }} />
                    ))}
                  </div>
                  <ul className="space-y-2.5">
                    {st.spending.map((s) => (
                      <li key={s.category} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2 text-midnight-700">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLOR[s.category] }} aria-hidden="true" />
                          {s.label} <span className="text-xs text-midnight-400">({s.count})</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-xs text-midnight-400 tabular-nums">{Math.round((s.total / st.spent) * 100)}%</span>
                          <Money value={s.total} className="font-semibold text-midnight-900" />
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
            <section className="card p-5 sm:p-6" aria-labelledby="coll-h">
              <h3 id="coll-h" className="font-display font-semibold text-midnight-900">Collections</h3>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-midnight-500">Billed this month</dt><dd><Money value={st.billed_this_month} /></dd></div>
                <div className="flex justify-between"><dt className="text-midnight-500">Paid so far</dt><dd>{st.collection_rate_pct != null ? `${st.collection_rate_pct}%` : '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-midnight-500">Still owed (all time)</dt><dd><Money value={st.outstanding_total} /></dd></div>
                <div className="flex justify-between"><dt className="text-midnight-500">Units owing</dt><dd>{st.units_owing} of {st.units_total}</dd></div>
              </dl>
            </section>
          </div>

          <section className="card" aria-labelledby="exp-h">
            <h3 id="exp-h" className="font-display font-semibold text-midnight-900 px-6 pt-5 pb-3">Every expense in {monthLabel(st.month)}</h3>
            {expenses.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-midnight-400">No expenses recorded.</p>
            ) : (
              <ul className="divide-y divide-midnight-50">
                {expenses.map((e) => (
                  <li key={e.id} className={`px-6 py-3.5 flex flex-wrap items-start justify-between gap-3 ${e.status === 'void' ? 'opacity-60' : ''}`}>
                    <div className="min-w-0">
                      <p className={`font-medium text-midnight-900 ${e.status === 'void' ? 'line-through' : ''}`}>{e.description}</p>
                      <p className="text-xs text-midnight-400">
                        {formatDate(e.date)} · {EXPENSE_LABEL[e.category]}{e.vendor ? ` · ${e.vendor}` : ''}
                        {e.request_title ? ` · for "${e.request_title}"` : ''}
                        {e.self_approved ? ' · approved by the approver who spent it' : e.approved_by_name ? ` · approved by ${e.approved_by_name}` : ''}
                      </p>
                      {e.status === 'void' && <p className="text-xs text-alert-600 mt-0.5">Voided: {e.void_reason}</p>}
                      {e.status === 'rejected' && <p className="text-xs text-alert-600 mt-0.5">Rejected: {e.reject_reason}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {e.has_receipt && <ReceiptButton id={e.id} onShow={setReceipt} />}
                      <Money value={e.amount} className="font-semibold text-midnight-900" />
                      {isAdmin && e.status === 'approved' && (
                        <button className="text-xs text-midnight-400 hover:text-alert-600" onClick={async () => {
                          const r = prompt('Why void this expense? Residents will see the reason.')
                          if (!r) return
                          await voidExpense(e.id, r)
                          load()
                        }}>Void</button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {isAdmin && (
            <p className="text-xs text-midnight-400">
              Bank details, the approval limit and who approves big spending are in Settings → Estate money. Expenses can't be deleted, only voided with a reason, so the record stays honest.
            </p>
          )}
        </div>
      )}

      {addOpen && <ExpenseModal threshold={fin?.approval_threshold ?? 100000} approver={fin?.approver?.name} onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load() }} />}
      {receipt && (
        <Modal open onClose={() => setReceipt(null)} title="Receipt">
          <img src={receipt} alt="Expense receipt" className="w-full rounded-xl" />
        </Modal>
      )}
    </div>
  )
}

function ReceiptButton({ id, onShow }: { id: string; onShow: (src: string) => void }) {
  return (
    <button className="inline-flex items-center gap-1 text-xs font-semibold text-royal hover:underline" onClick={async () => {
      const r = await getExpenseReceipt(id)
      if (r.receipt_image) onShow(r.receipt_image)
    }}>
      <Eye className="h-3.5 w-3.5" /> Receipt
    </button>
  )
}

function ExpenseModal({ threshold, approver, onClose, onDone }: { threshold: number; approver?: string | null; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ category: 'diesel_power' as ExpenseCategory, amount: '', vendor: '', description: '', date: new Date().toISOString().slice(0, 10), request_id: '' })
  const [receipt, setReceipt] = useState('')
  const [repairs, setRepairs] = useState<Repair[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    listRepairs().then((r) => setRepairs(r.filter((x) => x.status !== 'closed'))).catch(() => {})
  }, [])
  const big = Number(form.amount) >= threshold
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await createExpense({
        category: form.category, amount: Number(form.amount), vendor: form.vendor || undefined, description: form.description,
        date: new Date(`${form.date}T12:00:00`).toISOString(), receipt_image: receipt || undefined, request_id: form.request_id || undefined,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Record an expense">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ex-c">Category</label>
            <select id="ex-c" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}>
              {(Object.keys(EXPENSE_LABEL) as ExpenseCategory[]).map((c) => <option key={c} value={c}>{EXPENSE_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ex-a">Amount (₦)</label>
            <input id="ex-a" required type="number" min={1} className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ex-d">What was it for?</label>
          <input id="ex-d" required minLength={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="200 litres of diesel for the estate generator" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ex-v">Paid to (optional)</label>
            <input id="ex-v" className="input" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Vendor / person" />
          </div>
          <div>
            <label className="label" htmlFor="ex-dt">Date</label>
            <input id="ex-dt" required type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>
        {repairs.length > 0 && (
          <div>
            <label className="label" htmlFor="ex-r">Paid for a repair request? (optional)</label>
            <select id="ex-r" className="input" value={form.request_id} onChange={(e) => setForm({ ...form, request_id: e.target.value })}>
              <option value="">No</option>
              {repairs.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </div>
        )}
        <ImagePicker value={receipt} onChange={setReceipt} label="Receipt photo (residents can see it)" />
        {big && (
          <p className="rounded-xl bg-amber-50 text-amber-800 text-xs px-3 py-2">
            This is ₦{threshold.toLocaleString()} or more, so it needs {approver ? `${approver}'s` : "another admin's"} approval before it shows in the statement.
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Save expense'}</button>
      </form>
    </Modal>
  )
}
