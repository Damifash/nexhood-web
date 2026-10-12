import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Banknote, Building2, Eye, Home, Plus, Receipt, Send, Upload, Wallet } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { listUsers } from '@/lib/api'
import type { User } from '@/lib/types'
import {
  CHARGE_LABEL, confirmPayment, createCharge, createPayment, createUnit, currentMonth, getArrears, getFinanceSettings, getMyFinance,
  getPaymentProof, getStatement, importUnits, issueBills, listCharges, listInvoices, listPayments, listUnits, monthLabel, rejectPayment,
  updateCharge, updateUnit, voidInvoice,
  type ArrearsRow, type Charge, type ChargeCategory, type FinanceSettings, type Invoice, type MyFinance, type Payment, type Statement, type Unit,
} from '@/lib/finance'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Spinner, EmptyState } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { CopyText, ErrorBox, ImagePicker, Money, Stat, Tabs, formatDate } from '@/components/finance/ui'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'alert' | 'neutral' | 'steel'> = {
  paid: 'success', part_paid: 'warning', unpaid: 'alert', void: 'steel', pending: 'warning', confirmed: 'success', rejected: 'alert',
}
const STATUS_LABEL: Record<string, string> = {
  paid: 'Paid', part_paid: 'Part paid', unpaid: 'Unpaid', void: 'Cancelled', pending: 'Waiting for confirmation', confirmed: 'Confirmed', rejected: 'Not received',
}
const METHOD_LABEL: Record<string, string> = { bank_transfer: 'Bank transfer', cash: 'Cash', pos: 'POS', paystack: 'Online' }

export default function Payments() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  return isAdmin ? <AdminBills /> : <ResidentBills />
}

/* ------------------------------------------------------------------ */
/* Resident                                                            */
/* ------------------------------------------------------------------ */
function ResidentBills() {
  const [me, setMe] = useState<MyFinance | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [payOpen, setPayOpen] = useState<Invoice | 'any' | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [m, inv, pay] = await Promise.all([getMyFinance(), listInvoices(), listPayments()])
      setMe(m)
      setInvoices(inv)
      setPayments(pay)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const due = me?.units.reduce((s, u) => s + u.balance_due, 0) ?? 0
  const credit = me?.units.reduce((s, u) => s + u.credit, 0) ?? 0
  const open = invoices.filter((i) => i.status === 'unpaid' || i.status === 'part_paid')
  const closed = invoices.filter((i) => i.status === 'paid')

  if (loading) return <Loading />

  return (
    <div>
      <PageHeader title="Bills & payments" subtitle="What you owe your estate, and everything you've paid." />
      {me && me.units.length === 0 ? (
        <div className="card p-8 text-center">
          <Home className="h-8 w-8 mx-auto text-royal" />
          <p className="mt-3 font-display font-semibold text-midnight-900">Your house/flat isn't set up yet</p>
          <p className="mt-1 text-sm text-midnight-500">Ask your estate admin to add you to your unit. Your bills will show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="card p-5 sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-midnight-400">You owe</p>
                <p className={`mt-1 font-display text-4xl font-semibold ${due > 0 ? 'text-midnight-900' : 'text-emerald-700'}`}>
                  <Money value={due} />
                </p>
                <p className="text-xs text-midnight-400 mt-1">
                  {me?.units.map((u) => u.label).join(', ')}
                  {me?.pending_payments ? ` · ${me.pending_payments} payment${me.pending_payments === 1 ? '' : 's'} waiting for confirmation` : ''}
                </p>
              </div>
              <button className="btn-alert press px-6 py-3 text-base" onClick={() => setPayOpen('any')}>
                <Send className="h-4 w-4" /> I've paid
              </button>
            </div>
            <Stat label="Estate balance (credit)" hint="Overpayments are kept here and used on your next bill automatically.">
              <Money value={credit} />
            </Stat>
          </div>

          {me?.bank.account_number ? (
            <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <span className="h-10 w-10 rounded-xl bg-royal-50 text-royal flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-midnight-900">Pay your estate by bank transfer</p>
                <p className="text-midnight-600">
                  {me.bank.account_name} · {me.bank.bank_name} · <span className="font-mono font-semibold">{me.bank.account_number}</span>{' '}
                  <CopyText text={me.bank.account_number} label="account number" />
                </p>
                <p className="text-xs text-midnight-400 mt-1">Then tap "I've paid" and add the transfer reference or a screenshot. Your admin confirms it.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-midnight-500">Your estate hasn't added its bank details yet. Ask your admin how to pay.</p>
          )}

          <section className="card">
            <h3 className="font-display font-semibold text-midnight-900 px-6 pt-5 pb-3">Open bills</h3>
            {open.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-midnight-400">Nothing to pay right now.</p>
            ) : (
              <InvoiceList items={open} onPay={(i) => setPayOpen(i)} />
            )}
          </section>

          <section className="card">
            <h3 className="font-display font-semibold text-midnight-900 px-6 pt-5 pb-3">Your payments</h3>
            {payments.length === 0 ? <p className="px-6 pb-6 text-sm text-midnight-400">No payments yet.</p> : <PaymentList items={payments} />}
          </section>

          {closed.length > 0 && (
            <section className="card">
              <h3 className="font-display font-semibold text-midnight-900 px-6 pt-5 pb-3">Paid bills</h3>
              <InvoiceList items={closed} />
            </section>
          )}
        </div>
      )}

      {payOpen && (
        <PayModal
          onClose={() => setPayOpen(null)}
          invoice={payOpen === 'any' ? undefined : payOpen}
          suggested={payOpen === 'any' ? due : payOpen.balance}
          openInvoices={open}
          onDone={() => {
            setPayOpen(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function PayModal({ onClose, invoice, suggested, openInvoices, onDone }: { onClose: () => void; invoice?: Invoice; suggested: number; openInvoices: Invoice[]; onDone: () => void }) {
  const [amount, setAmount] = useState(String(suggested || ''))
  const [method, setMethod] = useState<'bank_transfer' | 'cash' | 'pos'>('bank_transfer')
  const [reference, setReference] = useState('')
  const [proof, setProof] = useState('')
  const [invoiceId, setInvoiceId] = useState(invoice?.id || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await createPayment({ amount: Number(amount), method, reference: reference || undefined, proof_image: proof || undefined, invoice_id: invoiceId || undefined })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={done ? onDone : onClose} title="Tell your estate you've paid">
      {done ? (
        <div className="text-center py-4">
          <Receipt className="h-10 w-10 mx-auto text-emerald-600" />
          <p className="mt-3 font-display font-semibold">Sent to your estate admin</p>
          <p className="text-sm text-midnight-500 mt-1">They'll check their bank and confirm it. You'll get an email when they do.</p>
          <button className="btn-primary mt-5" onClick={onDone}>Done</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <ErrorBox message={error} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="pay-amt">Amount (₦)</label>
              <input id="pay-amt" required type="number" min={1} className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="pay-m">How you paid</label>
              <select id="pay-m" className="input" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                <option value="bank_transfer">Bank transfer</option>
                <option value="pos">POS</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>
          {openInvoices.length > 0 && (
            <div>
              <label className="label" htmlFor="pay-inv">For which bill?</label>
              <select id="pay-inv" className="input" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
                <option value="">Oldest bills first (recommended)</option>
                {openInvoices.map((i) => (
                  <option key={i.id} value={i.id}>{i.title} · ₦{i.balance.toLocaleString()} left</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="pay-ref">Transfer reference / narration</label>
            <input id="pay-ref" className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 000123456789 or 'Flat 6 Oct service charge'" />
          </div>
          <ImagePicker value={proof} onChange={setProof} label="Receipt / screenshot (recommended)" />
          <p className="text-xs text-midnight-400">Paying more than you owe is fine. The extra goes to your estate balance for the next bill.</p>
          <button type="submit" disabled={busy} className="btn-primary w-full py-3">{busy ? <Spinner className="h-4 w-4" /> : 'Send to my estate admin'}</button>
        </form>
      )}
    </Modal>
  )
}

function InvoiceList({ items, onPay, onVoid, showUnit = false }: { items: Invoice[]; onPay?: (i: Invoice) => void; onVoid?: (i: Invoice) => void; showUnit?: boolean }) {
  return (
    <ul className="divide-y divide-midnight-50">
      {items.map((i) => (
        <li key={i.id} className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-midnight-900 truncate">{showUnit ? `${i.unit_label} · ` : ''}{i.title}</p>
            <p className="text-xs text-midnight-400">
              Due {formatDate(i.due_date)}
              {i.overdue && <span className="text-alert-600 font-semibold"> · Overdue</span>}
              {i.amount_paid > 0 && i.status !== 'paid' && ` · ₦${i.amount_paid.toLocaleString()} paid`}
              {i.paid_from_credit ? ` · ₦${i.paid_from_credit.toLocaleString()} from estate balance` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Money value={i.status === 'paid' ? i.amount : i.balance} className="font-semibold text-midnight-900" />
            <Badge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</Badge>
            {onPay && i.balance > 0 && <button className="btn-outline text-xs px-3 py-1.5" onClick={() => onPay(i)}>Pay</button>}
            {onVoid && i.status === 'unpaid' && i.amount_paid === 0 && (
              <button className="text-xs text-midnight-400 hover:text-alert-600" onClick={() => onVoid(i)}>Cancel</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function PaymentList({ items, admin, onConfirm, onReject }: { items: Payment[]; admin?: boolean; onConfirm?: (p: Payment) => void; onReject?: (p: Payment) => void }) {
  const [proof, setProof] = useState<string | null>(null)
  return (
    <>
      <ul className="divide-y divide-midnight-50">
        {items.map((p) => (
          <li key={p.id} className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-midnight-900">
                <Money value={p.amount} /> <span className="text-midnight-500 font-normal">· {METHOD_LABEL[p.method]}{admin ? ` · ${p.unit_label}${p.payer_name ? ` (${p.payer_name})` : ''}` : ''}</span>
              </p>
              <p className="text-xs text-midnight-400">
                {formatDate(p.created_at)}
                {p.reference ? ` · Ref ${p.reference}` : ''}
                {p.to_credit ? ` · ₦${p.to_credit.toLocaleString()} added to estate balance` : ''}
                {p.status === 'rejected' && p.reject_reason ? ` · ${p.reject_reason}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {p.has_proof && (
                <button
                  className="inline-flex items-center gap-1 text-xs font-semibold text-royal hover:underline"
                  onClick={async () => setProof((await getPaymentProof(p.id)).proof_image)}
                >
                  <Eye className="h-3.5 w-3.5" /> Receipt
                </button>
              )}
              <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
              {admin && p.status === 'pending' && (
                <>
                  <button className="btn-primary text-xs px-3 py-1.5" onClick={() => onConfirm?.(p)}>Money received</button>
                  <button className="btn-outline text-xs px-3 py-1.5" onClick={() => onReject?.(p)}>Not received</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {proof && (
        <Modal open onClose={() => setProof(null)} title="Receipt">
          <img src={proof} alt="Payment receipt" className="w-full rounded-xl" />
        </Modal>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */
type AdminTab = 'overview' | 'confirm' | 'bills' | 'units'

function AdminBills() {
  const [tab, setTab] = useState<AdminTab>('overview')
  const [pendingCount, setPendingCount] = useState(0)
  useEffect(() => {
    listPayments({ status: 'pending' }).then((p) => setPendingCount(p.length)).catch(() => {})
  }, [tab])
  return (
    <div>
      <PageHeader title="Bills & payments" subtitle="Bill your estate, confirm payments, and see who owes what." />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'confirm', label: 'Payments to confirm', count: pendingCount },
          { key: 'bills', label: 'Bills' },
          { key: 'units', label: 'Houses / units' },
        ]}
      />
      {tab === 'overview' && <AdminOverview />}
      {tab === 'confirm' && <AdminConfirm onChanged={(n) => setPendingCount(n)} />}
      {tab === 'bills' && <AdminCharges />}
      {tab === 'units' && <AdminUnits />}
    </div>
  )
}

function AdminOverview() {
  const [st, setSt] = useState<Statement | null>(null)
  const [arrears, setArrears] = useState<ArrearsRow[]>([])
  const [fin, setFin] = useState<FinanceSettings | null>(null)
  const [record, setRecord] = useState<ArrearsRow | 'any' | null>(null)
  const [loading, setLoading] = useState(true)
  async function load() {
    setLoading(true)
    try {
      const [s, a, f] = await Promise.all([getStatement(), getArrears(), getFinanceSettings()])
      setSt(s)
      setArrears(a)
      setFin(f)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])
  if (loading || !st) return <Loading />
  return (
    <div className="space-y-6">
      {!fin?.account_number && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
          Add your estate's bank account in <strong>Settings → Estate money</strong> so residents know where to pay.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={`Billed for ${monthLabel(st.month)}`}><Money value={st.billed_this_month} /></Stat>
        <Stat label="Collection rate" hint="Of this month's bills" tone={st.collection_rate_pct != null && st.collection_rate_pct >= 80 ? 'good' : 'neutral'}>
          {st.collection_rate_pct != null ? `${st.collection_rate_pct}%` : '—'}
        </Stat>
        <Stat label="Outstanding (all time)" tone={st.outstanding_total > 0 ? 'bad' : 'good'} hint={`${st.units_owing} of ${st.units_total} units owe`}>
          <Money value={st.outstanding_total} />
        </Stat>
        <Stat label="Estate balance now" hint="Collected minus approved spending"><Money value={st.closing_balance} /></Stat>
      </div>
      <section className="card">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="font-display font-semibold text-midnight-900">Who owes</h3>
          <button className="btn-outline text-xs px-3 py-1.5" onClick={() => setRecord('any')}>
            <Banknote className="h-3.5 w-3.5" /> Record a payment
          </button>
        </div>
        {arrears.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-emerald-700">Everyone is paid up.</p>
        ) : (
          <ul className="divide-y divide-midnight-50">
            {arrears.map((a) => (
              <li key={a.unit_id} className="px-6 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-midnight-900">{a.label}</p>
                  <p className="text-xs text-midnight-400">{a.bills} open bill{a.bills === 1 ? '' : 's'} · oldest due {formatDate(a.oldest_due)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Money value={a.due} className="font-semibold text-alert-700" />
                  <button className="text-xs font-semibold text-royal hover:underline" onClick={() => setRecord(a)}>Record payment</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {record && <RecordPaymentModal preset={record === 'any' ? undefined : record} onClose={() => setRecord(null)} onDone={() => { setRecord(null); load() }} />}
    </div>
  )
}

function RecordPaymentModal({ preset, onClose, onDone }: { preset?: ArrearsRow; onClose: () => void; onDone: () => void }) {
  const [units, setUnits] = useState<Unit[]>([])
  const [unitId, setUnitId] = useState(preset?.unit_id || '')
  const [amount, setAmount] = useState(preset ? String(preset.due) : '')
  const [method, setMethod] = useState<'bank_transfer' | 'cash' | 'pos'>('bank_transfer')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    listUnits().then(setUnits).catch(() => {})
  }, [])
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await createPayment({ unit_id: unitId, amount: Number(amount), method, reference: reference || undefined })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record payment')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Record a payment you received">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="rp-unit">House / unit</label>
          <select id="rp-unit" required className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Choose…</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.label}{u.balance_due ? ` · owes ₦${u.balance_due.toLocaleString()}` : ''}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="rp-amt">Amount (₦)</label>
            <input id="rp-amt" required type="number" min={1} className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="rp-m">Method</label>
            <select id="rp-m" className="input" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="pos">POS</option>
              <option value="cash">Cash</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="rp-ref">Reference (optional)</label>
          <input id="rp-ref" className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <p className="text-xs text-midnight-400">It's applied to the oldest bills first. Anything extra becomes the unit's estate balance.</p>
        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Save payment'}</button>
      </form>
    </Modal>
  )
}

function AdminConfirm({ onChanged }: { onChanged: (n: number) => void }) {
  const [items, setItems] = useState<Payment[]>([])
  const [recent, setRecent] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function load() {
    setLoading(true)
    try {
      const all = await listPayments()
      const pending = all.filter((p) => p.status === 'pending')
      setItems(pending)
      setRecent(all.filter((p) => p.status !== 'pending').slice(0, 20))
      onChanged(pending.length)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (loading) return <Loading />
  return (
    <div className="space-y-6">
      <ErrorBox message={error} />
      <section className="card">
        <h3 className="font-display font-semibold text-midnight-900 px-6 pt-5 pb-1">Waiting for you</h3>
        <p className="px-6 pb-3 text-xs text-midnight-400">Check your bank app first. Only confirm money you can see.</p>
        {items.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-midnight-400">No payments waiting.</p>
        ) : (
          <PaymentList
            items={items}
            admin
            onConfirm={async (p) => {
              if (!confirm(`Confirm you received ₦${p.amount.toLocaleString()} from ${p.unit_label}?`)) return
              try {
                await confirmPayment(p.id)
                load()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not confirm')
              }
            }}
            onReject={async (p) => {
              const reason = prompt('Why? The resident will see this.', "We couldn't find this transfer in our account.")
              if (reason === null) return
              try {
                await rejectPayment(p.id, reason)
                load()
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not update')
              }
            }}
          />
        )}
      </section>
      {recent.length > 0 && (
        <section className="card">
          <h3 className="font-display font-semibold text-midnight-900 px-6 pt-5 pb-3">Recent payments</h3>
          <PaymentList items={recent} admin />
        </section>
      )}
    </div>
  )
}

function AdminCharges() {
  const [charges, setCharges] = useState<Charge[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState<'open' | 'paid' | ''>('open')
  const [newOpen, setNewOpen] = useState(false)
  const [issueFor, setIssueFor] = useState<Charge | null>(null)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  async function load() {
    setLoading(true)
    try {
      const [c, i] = await Promise.all([listCharges(), listInvoices(filter ? { status: filter } : undefined)])
      setCharges(c)
      setInvoices(i)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])
  return (
    <div className="space-y-6">
      {msg && <div className="rounded-xl bg-emerald-50 text-emerald-800 text-sm px-4 py-3" role="status">{msg}</div>}
      <section className="card">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h3 className="font-display font-semibold text-midnight-900">Bill types</h3>
            <p className="text-xs text-midnight-400">Set each charge once, then issue it every month, quarter or year.</p>
          </div>
          <button className="btn-primary text-xs px-3 py-2" onClick={() => setNewOpen(true)}><Plus className="h-3.5 w-3.5" /> New bill type</button>
        </div>
        {charges.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-midnight-400">No bill types yet. Start with your service charge.</p>
        ) : (
          <ul className="divide-y divide-midnight-50">
            {charges.map((c) => (
              <li key={c.id} className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-midnight-900">{c.name} {!c.active && <Badge tone="steel">Paused</Badge>}</p>
                  <p className="text-xs text-midnight-400">
                    {CHARGE_LABEL[c.category]} · ₦{c.amount.toLocaleString()} per unit · {c.frequency.replace('_', '-')}
                    {c.type_amounts && Object.keys(c.type_amounts).length > 0 &&
                      ` · ${Object.entries(c.type_amounts).map(([t, a]) => `${t}: ₦${a.toLocaleString()}`).join(', ')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.active && <button className="btn-alert text-xs px-3 py-1.5" onClick={() => setIssueFor(c)}><Send className="h-3.5 w-3.5" /> Issue bills</button>}
                  <button
                    className="text-xs text-midnight-500 hover:text-midnight-900"
                    onClick={async () => {
                      await updateCharge(c.id, { active: !c.active })
                      load()
                    }}
                  >
                    {c.active ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-3">
          <h3 className="font-display font-semibold text-midnight-900">Bills issued</h3>
          <select className="input w-auto py-1.5 text-xs" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter bills">
            <option value="open">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="">All</option>
          </select>
        </div>
        {loading ? <Loading /> : invoices.length === 0 ? <p className="px-6 pb-6 text-sm text-midnight-400">No bills here.</p> : (
          <InvoiceList
            items={invoices}
            showUnit
            onVoid={async (i) => {
              if (!confirm(`Cancel "${i.title}" for ${i.unit_label}?`)) return
              await voidInvoice(i.id)
              load()
            }}
          />
        )}
      </section>

      {newOpen && <NewChargeModal onClose={() => setNewOpen(false)} onDone={() => { setNewOpen(false); load() }} />}
      {issueFor && (
        <IssueModal
          charge={issueFor}
          onClose={() => setIssueFor(null)}
          onDone={(r) => {
            setIssueFor(null)
            setMsg(`Issued ${r.issued} bill${r.issued === 1 ? '' : 's'}${r.skipped ? ` (${r.skipped} unit${r.skipped === 1 ? '' : 's'} already had this bill)` : ''}. Residents have been emailed.`)
            load()
          }}
        />
      )}
    </div>
  )
}

function NewChargeModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: 'Service charge', category: 'service_charge' as ChargeCategory, amount: '', frequency: 'monthly' as Charge['frequency'] })
  const [typeRows, setTypeRows] = useState<{ type: string; amount: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const type_amounts = Object.fromEntries(typeRows.filter((r) => r.type.trim() && Number(r.amount) > 0).map((r) => [r.type.trim(), Number(r.amount)]))
      await createCharge({ ...form, amount: Number(form.amount), type_amounts: Object.keys(type_amounts).length ? type_amounts : undefined })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="New bill type">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="ch-name">Name</label>
          <input id="ch-name" required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="ch-cat">Category</label>
            <select id="ch-cat" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ChargeCategory })}>
              {(Object.keys(CHARGE_LABEL) as ChargeCategory[]).map((c) => <option key={c} value={c}>{CHARGE_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ch-freq">How often</label>
            <select id="ch-freq" className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as Charge['frequency'] })}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="one_off">One-off (special levy)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ch-amt">Amount per unit (₦)</label>
          <input id="ch-amt" required type="number" min={1} className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div>
          <p className="label">Different price for some unit types? (optional)</p>
          {typeRows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 mb-2">
              <input className="input" placeholder="e.g. duplex" value={r.type} onChange={(e) => setTypeRows(typeRows.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} aria-label="Unit type" />
              <input className="input" type="number" placeholder="₦" value={r.amount} onChange={(e) => setTypeRows(typeRows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} aria-label="Amount for this type" />
            </div>
          ))}
          <button type="button" className="text-xs font-semibold text-royal" onClick={() => setTypeRows([...typeRows, { type: '', amount: '' }])}>+ Add a unit type price</button>
          <p className="text-xs text-midnight-400 mt-1">Matches the "type" you set on each unit (e.g. 2-bed flat, duplex).</p>
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Save bill type'}</button>
      </form>
    </Modal>
  )
}

function IssueModal({ charge, onClose, onDone }: { charge: Charge; onClose: () => void; onDone: (r: { issued: number; skipped: number }) => void }) {
  const today = new Date()
  const defaultPeriod = charge.frequency === 'yearly' ? String(today.getFullYear()) : charge.frequency === 'quarterly'
    ? `Q${Math.floor(today.getMonth() / 3) + 1} ${today.getFullYear()}` : charge.frequency === 'one_off' ? charge.name : currentMonth()
  const defaultDue = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)
  const [period, setPeriod] = useState(defaultPeriod)
  const [due, setDue] = useState(defaultDue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onDone(await issueBills(charge.id, { period, due_date: new Date(`${due}T23:59:00`).toISOString() }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue')
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={`Issue ${charge.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="is-p">Period</label>
          <input id="is-p" required className="input" value={period} onChange={(e) => setPeriod(e.target.value)} />
          <p className="text-xs text-midnight-400 mt-1">{/^\d{4}-\d{2}$/.test(period) ? monthLabel(period) : 'Shown on each bill.'} Issuing the same period twice won't double-bill anyone.</p>
        </div>
        <div>
          <label className="label" htmlFor="is-d">Due date</label>
          <input id="is-d" required type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <p className="text-sm text-midnight-600">Every active house/unit gets a bill of ₦{charge.amount.toLocaleString()} (or its unit-type price). Residents get an email, and any estate balance they have is used first.</p>
        <button type="submit" disabled={busy} className="btn-alert w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Issue bills now'}</button>
      </form>
    </Modal>
  )
}

function AdminUnits() {
  const [units, setUnits] = useState<Unit[]>([])
  const [people, setPeople] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Unit | 'new' | null>(null)
  const [msg, setMsg] = useState('')
  async function load() {
    setLoading(true)
    try {
      const [u, p] = await Promise.all([listUnits(), listUsers()])
      setUnits(u)
      setPeople(p)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])
  const unlinked = useMemo(() => {
    const linked = new Set(units.flatMap((u) => u.occupants.map((o) => o.id)))
    return people.filter((p) => p.role === 'resident' && !linked.has(p.id))
  }, [units, people])
  if (loading) return <Loading />
  return (
    <div className="space-y-4">
      {msg && <div className="rounded-xl bg-emerald-50 text-emerald-800 text-sm px-4 py-3" role="status">{msg}</div>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary text-sm" onClick={() => setEdit('new')}><Plus className="h-4 w-4" /> Add house / unit</button>
        {unlinked.length > 0 && (
          <button
            className="btn-outline text-sm"
            onClick={async () => {
              const r = await importUnits()
              setMsg(`Created ${r.created} unit${r.created === 1 ? '' : 's'} and linked ${r.linked} resident${r.linked === 1 ? '' : 's'} from their flat numbers.`)
              load()
            }}
          >
            <Upload className="h-4 w-4" /> Create units from residents' flat numbers ({unlinked.length})
          </button>
        )}
      </div>
      <div className="card">
        {units.length === 0 ? (
          <EmptyState title="No houses or units yet" subtitle="Bills are sent per house/flat. Add them here, or create them from residents' flat numbers." />
        ) : (
          <ul className="divide-y divide-midnight-50">
            {units.map((u) => (
              <li key={u.id} className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-midnight-900">{u.label} {u.unit_type && <span className="text-xs text-midnight-400">· {u.unit_type}</span>}</p>
                  <p className="text-xs text-midnight-400">
                    {u.occupants.length ? u.occupants.map((o) => o.name).join(', ') : 'No one linked yet'}
                    {u.payer ? ` · bills to ${u.payer.name}` : ''}
                    {u.owner_name ? ` · owner ${u.owner_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {u.balance_due > 0 ? <Money value={u.balance_due} className="font-semibold text-alert-700" /> : <span className="text-emerald-700 text-xs font-semibold">Paid up</span>}
                  {u.credit > 0 && <Badge tone="success"><Wallet className="h-3 w-3" /> ₦{u.credit.toLocaleString()}</Badge>}
                  <button className="text-xs font-semibold text-royal hover:underline" onClick={() => setEdit(u)}>Edit</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {edit && <UnitModal unit={edit === 'new' ? undefined : edit} people={people} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load() }} />}
    </div>
  )
}

function UnitModal({ unit, people, onClose, onDone }: { unit?: Unit; people: User[]; onClose: () => void; onDone: () => void }) {
  const [label, setLabel] = useState(unit?.label || '')
  const [type, setType] = useState(unit?.unit_type || '')
  const [owner, setOwner] = useState(unit?.owner_name || '')
  const [occ, setOcc] = useState<string[]>(unit?.occupants.map((o) => o.id) || [])
  const [payer, setPayer] = useState(unit?.payer?.id || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const residents = people.filter((p) => p.role === 'resident' || occ.includes(p.id))
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const body = { label, unit_type: type, owner_name: owner, occupant_user_ids: occ, payer_user_id: payer || occ[0] || undefined }
      if (unit) await updateUnit(unit.id, { ...body, payer_user_id: body.payer_user_id ?? null })
      else await createUnit(body)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={unit ? `Edit ${unit.label}` : 'Add house / unit'}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="u-l">Name / number</label>
            <input id="u-l" required className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Block C, Flat 6" />
          </div>
          <div>
            <label className="label" htmlFor="u-t">Type (optional)</label>
            <input id="u-t" className="input" value={type} onChange={(e) => setType(e.target.value)} placeholder="2-bed flat, duplex" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="u-o">Owner / landlord (optional)</label>
          <input id="u-o" className="input" value={owner} onChange={(e) => setOwner(e.target.value)} />
        </div>
        <fieldset>
          <legend className="label">Who lives here</legend>
          <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-midnight-100 p-3">
            {residents.length === 0 && <p className="text-xs text-midnight-400">No residents yet. Invite them from Users.</p>}
            {residents.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-royal" checked={occ.includes(p.id)} onChange={(e) => setOcc(e.target.checked ? [...occ, p.id] : occ.filter((x) => x !== p.id))} />
                {p.name} {p.apartment && <span className="text-xs text-midnight-400">({p.apartment})</span>}
              </label>
            ))}
          </div>
        </fieldset>
        {occ.length > 1 && (
          <div>
            <label className="label" htmlFor="u-p">Who gets the bills</label>
            <select id="u-p" className="input" value={payer} onChange={(e) => setPayer(e.target.value)}>
              {occ.map((id) => <option key={id} value={id}>{people.find((p) => p.id === id)?.name}</option>)}
            </select>
          </div>
        )}
        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Save'}</button>
      </form>
    </Modal>
  )
}

function Loading() {
  return (
    <div className="flex justify-center py-16 text-royal">
      <Spinner className="h-6 w-6" />
    </div>
  )
}
