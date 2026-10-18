import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Banknote, BellRing, Building2, Check, CreditCard, Eye, FilePlus2, Home, Plus, Receipt, Search, Send, Tags, Upload, Wallet } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { listUsers } from '@/lib/api'
import type { User } from '@/lib/types'
import {
  CHARGE_LABEL, confirmPayment, createCharge, createPayment, createUnit, currentMonth, getArrears, getFinanceSettings, getMyFinance,
  getPaymentProof, getStatement, importUnits, issueBills, listCharges, listInvoices, listPayments, listUnits, monthLabel, rejectPayment,
  updateCharge, updateUnit, voidInvoice, createSingleBill, getPaystackStatus, quotePaystack, startPaystack, verifyPaystack, getFinanceSetup, sendReminders, updateFinanceSettings,
  type FinanceSetup,
  type PaystackStatus, type ArrearsRow, type Charge, type ChargeCategory, type Invoice, type MyFinance, type Payment, type Statement, type Unit,
} from '@/lib/finance'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Spinner, EmptyState } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { CopyText, ErrorBox, ImagePicker, Money, Stat, Tabs, formatDate } from '@/components/finance/ui'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'alert' | 'neutral' | 'steel'> = {
  paid: 'success', part_paid: 'warning', unpaid: 'alert', void: 'steel', pending: 'warning', confirmed: 'success', rejected: 'alert', failed: 'steel',
}
const STATUS_LABEL: Record<string, string> = {
  paid: 'Paid', part_paid: 'Part paid', unpaid: 'Unpaid', void: 'Cancelled', pending: 'Waiting for confirmation', confirmed: 'Confirmed', rejected: 'Not received', failed: 'Did not go through',
}
const METHOD_LABEL: Record<string, string> = { bank_transfer: 'Bank transfer', cash: 'Cash', pos: 'POS', paystack: 'Online (Paystack)' }

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
  const [onlineOpen, setOnlineOpen] = useState<Invoice | 'any' | null>(null)
  const [ps, setPs] = useState<PaystackStatus | null>(null)
  const [banner, setBanner] = useState<{ tone: 'good' | 'bad' | 'wait'; text: string } | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [m, inv, pay, st] = await Promise.all([getMyFinance(), listInvoices(), listPayments(), getPaystackStatus().catch(() => null)])
      setMe(m)
      setInvoices(inv)
      setPayments(pay)
      setPs(st)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    // Back from Paystack's checkout: ?reference=NXH-... — confirm it, then reload.
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('reference') || params.get('trxref')
    if (ref) {
      setBanner({ tone: 'wait', text: 'Checking your payment with Paystack…' })
      window.history.replaceState({}, '', window.location.pathname)
      verifyPaystack(ref)
        .then((r) =>
          setBanner(
            r.status === 'confirmed'
              ? { tone: 'good', text: 'Payment received. Your bill has been updated and a receipt is on its way to your email.' }
              : r.status === 'pending'
                ? { tone: 'wait', text: "Paystack is still processing your payment. It'll update here automatically in a few minutes." }
                : { tone: 'bad', text: "That payment didn't go through. No money was taken for this bill. You can try again." },
          ),
        )
        .catch(() => setBanner({ tone: 'wait', text: "We'll update your bill as soon as Paystack confirms the payment." }))
        .finally(load)
    } else {
      load()
    }
  }, [])
  const canPayOnline = !!ps?.enabled && !!ps?.connected

  const due = me?.units.reduce((s, u) => s + u.balance_due, 0) ?? 0
  const credit = me?.units.reduce((s, u) => s + u.credit, 0) ?? 0
  const open = invoices.filter((i) => i.status === 'unpaid' || i.status === 'part_paid')
  const closed = invoices.filter((i) => i.status === 'paid')

  if (loading) return <Loading />

  return (
    <div>
      <PageHeader title="Bills & payments" subtitle="What you owe your estate, and everything you've paid." />
      {banner && (
        <div role="status" className={`mb-5 rounded-xl px-4 py-3 text-sm ${banner.tone === 'good' ? 'bg-emerald-50 text-emerald-800' : banner.tone === 'bad' ? 'bg-alert-50 text-alert-700' : 'bg-amber-50 text-amber-800'}`}>
          {banner.text}
        </div>
      )}
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
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {canPayOnline && due > 0 && (
                  <button className="btn-alert press px-6 py-3 text-base w-full sm:w-auto" onClick={() => setOnlineOpen('any')}>
                    <CreditCard className="h-4 w-4" /> Pay now
                  </button>
                )}
                <button className={`${canPayOnline && due > 0 ? 'btn-outline' : 'btn-alert'} press px-6 py-3 text-base w-full sm:w-auto`} onClick={() => setPayOpen('any')}>
                  <Send className="h-4 w-4" /> {canPayOnline && due > 0 ? 'I paid by transfer' : 'Pay by transfer'}
                </button>
              </div>
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
              <InvoiceList items={open} onPay={(i) => (canPayOnline ? setOnlineOpen(i) : setPayOpen(i))} />
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

      {onlineOpen && (
        <OnlinePayModal
          invoice={onlineOpen === 'any' ? undefined : onlineOpen}
          suggested={onlineOpen === 'any' ? due : onlineOpen.balance}
          onClose={() => setOnlineOpen(null)}
          onTransfer={() => {
            setPayOpen(onlineOpen)
            setOnlineOpen(null)
          }}
        />
      )}
      {payOpen && (
        <PayModal
          onClose={() => setPayOpen(null)}
          invoice={payOpen === 'any' ? undefined : payOpen}
          suggested={payOpen === 'any' ? due : payOpen.balance}
          openInvoices={open}
          bank={me?.bank}
          onDone={() => {
            setPayOpen(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function OnlinePayModal({ invoice, suggested, onClose, onTransfer }: { invoice?: Invoice; suggested: number; onClose: () => void; onTransfer: () => void }) {
  const [amount, setAmount] = useState(String(suggested || ''))
  const [quote, setQuote] = useState<{ fee: number; total: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const n = Number(amount)
    if (!n || n < 100) {
      setQuote(null)
      return
    }
    const t = setTimeout(() => quotePaystack(n).then(setQuote).catch(() => setQuote(null)), 300)
    return () => clearTimeout(t)
  }, [amount])
  async function go(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await startPaystack(Number(amount), invoice?.id)
      window.location.href = r.authorization_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment')
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={invoice ? `Pay: ${invoice.title}` : 'Pay online'}>
      <form onSubmit={go} className="space-y-4">
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="op-amt">Amount for your bills (₦)</label>
          <input id="op-amt" required type="number" min={100} className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        {quote && (
          <dl className="rounded-xl bg-midnight-50/70 p-4 text-sm space-y-1.5">
            <div className="flex justify-between"><dt className="text-midnight-500">Goes to your estate</dt><dd><Money value={Number(amount)} /></dd></div>
            <div className="flex justify-between"><dt className="text-midnight-500">Card / transfer fee</dt><dd><Money value={quote.fee} /></dd></div>
            <div className="flex justify-between font-semibold text-midnight-900 border-t border-midnight-100 pt-1.5"><dt>You pay</dt><dd><Money value={quote.total} /></dd></div>
          </dl>
        )}
        <p className="text-xs text-midnight-400">You'll pay on Paystack's secure page by card, bank transfer or USSD. The money goes straight to your estate's bank account and your bill updates automatically.</p>
        <button type="submit" disabled={busy || !quote} className="btn-alert w-full py-3">{busy ? <Spinner className="h-4 w-4" /> : <>Continue to Paystack</>}</button>
        <button type="button" className="w-full text-xs font-semibold text-royal hover:underline" onClick={onTransfer}>I'd rather pay by bank transfer (no fee)</button>
      </form>
    </Modal>
  )
}

function PayModal({ onClose, invoice, suggested, openInvoices, onDone, bank }: { onClose: () => void; invoice?: Invoice; suggested: number; openInvoices: Invoice[]; onDone: () => void; bank?: MyFinance['bank'] }) {
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
          {bank?.account_number ? (
            <div className="rounded-xl bg-midnight-50/70 px-4 py-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-midnight-400">1 · Transfer to</p>
              <p className="mt-1 font-semibold text-midnight-900">{bank.account_name}</p>
              <p className="text-midnight-600 flex flex-wrap items-center gap-x-2">
                {bank.bank_name} · <span className="font-mono font-semibold text-midnight-900">{bank.account_number}</span>
                <CopyText text={bank.account_number} label="account number" />
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-midnight-400">2 · Then tell your admin below</p>
            </div>
          ) : (
            <p className="rounded-xl bg-amber-50 text-amber-800 text-xs px-3 py-2">Your estate hasn't added its bank details in NexHood yet. Pay the way your admin told you, then fill this in.</p>
          )}
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
        <li key={i.id} className="px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="font-medium text-midnight-900 truncate">{showUnit ? `${i.unit_label} · ` : ''}{i.title}</p>
            <p className="text-xs text-midnight-400">
              Due {formatDate(i.due_date)}
              {i.overdue && <span className="text-alert-600 font-semibold"> · Overdue</span>}
              {i.amount_paid > 0 && i.status !== 'paid' && ` · ₦${i.amount_paid.toLocaleString()} paid`}
              {i.paid_from_credit ? ` · ₦${i.paid_from_credit.toLocaleString()} from estate balance` : ''}
            </p>
            {i.note && <p className="text-xs text-midnight-500 mt-0.5">{i.note}</p>}
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
          <li key={p.id} className="px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
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
            <div className="flex flex-wrap items-center gap-2">
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
type Go = (tab: AdminTab, action?: 'new-charge' | 'new-unit') => void

function AdminBills() {
  const [tab, setTab] = useState<AdminTab>('overview')
  const [action, setAction] = useState<'new-charge' | 'new-unit' | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  useEffect(() => {
    listPayments({ status: 'pending' }).then((p) => setPendingCount(p.length)).catch(() => {})
  }, [tab])
  const go: Go = (t, a) => {
    setAction(a ?? null)
    setTab(t)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <div>
      <PageHeader title="Bills & payments" subtitle="Bill every house, collect payments and see who owes." />
      <Tabs
        value={tab}
        onChange={(t) => go(t)}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'confirm', label: 'To confirm', count: pendingCount },
          { key: 'bills', label: 'Bills' },
          { key: 'units', label: 'Houses' },
        ]}
      />
      {tab === 'overview' && <AdminOverview go={go} />}
      {tab === 'confirm' && <AdminConfirm onChanged={(n) => setPendingCount(n)} />}
      {tab === 'bills' && <AdminCharges autoNew={action === 'new-charge'} />}
      {tab === 'units' && <AdminUnits autoNew={action === 'new-unit'} />}
    </div>
  )
}

function SetupGuide({ setup, go, onBank, onTypes }: { setup: FinanceSetup; go: Go; onBank: () => void; onTypes: () => void }) {
  const steps: { done: boolean; title: string; body: string; action: string; run: () => void; optional?: boolean }[] = [
    { done: setup.bank, title: 'Add the estate bank account', body: 'Residents see it when they pay by transfer.', action: 'Add bank details', run: onBank },
    { done: setup.units > 0, title: 'Add the houses', body: 'Bills go to each house, not each person.', action: 'Add houses', run: () => go('units', 'new-unit') },
    { done: setup.charges > 0, title: 'Create a bill type', body: 'For example service charge, ₦600,000 a year.', action: 'Create bill type', run: () => go('bills', 'new-charge') },
    ...(setup.units_untyped > 0
      ? [{ done: false, title: `Set the type of ${setup.units_untyped} house${setup.units_untyped === 1 ? '' : 's'}`, body: `You have prices for ${setup.price_types.join(', ')}. Houses without a type are charged the standard price.`, action: 'Set house types', run: onTypes }]
      : []),
    { done: setup.invoices > 0, title: 'Send the first bills', body: 'Every house gets its bill by email and in the app.', action: 'Send bills', run: () => go('bills') },
  ]
  const left = steps.filter((s) => !s.done).length
  if (left === 0) return null
  const next = steps.findIndex((s) => !s.done)
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="setup-h">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="setup-h" className="font-display font-semibold text-midnight-900">Get ready to collect</h3>
          <p className="text-xs text-midnight-400 mt-0.5">{steps.length - left} of {steps.length} done</p>
        </div>
        <div className="h-2 w-24 rounded-full bg-midnight-50 overflow-hidden mt-2" aria-hidden="true">
          <div className="h-full bg-royal rounded-full" style={{ width: `${((steps.length - left) / steps.length) * 100}%` }} />
        </div>
      </div>
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => (
          <li key={s.title} className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${i === next ? 'border-royal-200 bg-royal-50/40' : 'border-midnight-100'}`}>
            <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${s.done ? 'bg-emerald-500 text-white' : i === next ? 'bg-royal text-warm' : 'bg-midnight-100 text-midnight-500'}`}>
              {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${s.done ? 'text-midnight-400 line-through' : 'text-midnight-900'}`}>{s.title}</p>
              {!s.done && <p className="text-xs text-midnight-500">{s.body}</p>}
            </div>
            {!s.done && (
              <button type="button" onClick={s.run} className={`${i === next ? 'btn-primary' : 'btn-outline'} text-xs px-3 py-2 whitespace-nowrap self-start sm:self-auto`}>
                {s.action} <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function AdminOverview({ go }: { go: Go }) {
  const [st, setSt] = useState<Statement | null>(null)
  const [arrears, setArrears] = useState<ArrearsRow[]>([])
  const [setup, setSetup] = useState<FinanceSetup | null>(null)
  const [record, setRecord] = useState<ArrearsRow | 'any' | null>(null)
  const [bankOpen, setBankOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)
  const [reminding, setReminding] = useState<string | null>(null)
  async function load() {
    setLoading(true)
    try {
      const [s, a, su] = await Promise.all([getStatement(), getArrears(), getFinanceSetup().catch(() => null)])
      setSt(s)
      setArrears(a)
      setSetup(su)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])
  async function remind(unitId?: string) {
    setReminding(unitId || 'all')
    setMsg(null)
    try {
      const r = await sendReminders(unitId)
      setMsg({
        tone: 'good',
        text: r.sent
          ? `Reminder sent to ${r.sent} house${r.sent === 1 ? '' : 's'}.${r.skipped ? ` ${r.skipped} skipped (reminded in the last day or no email on file).` : ''}`
          : 'Nothing sent. Those houses were reminded in the last day, or no one linked to them has an email.',
      })
    } catch (e) {
      setMsg({ tone: 'bad', text: e instanceof Error ? e.message : 'Could not send reminders' })
    } finally {
      setReminding(null)
    }
  }
  if (loading || !st) return <Loading />
  return (
    <div className="space-y-6">
      {setup && <SetupGuide setup={setup} go={go} onBank={() => setBankOpen(true)} onTypes={() => setTypesOpen(true)} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label={`Billed · ${monthLabel(st.month)}`}><Money value={st.billed_this_month} /></Stat>
        <Stat label="Collected" hint="Of this month's bills" tone={st.collection_rate_pct != null && st.collection_rate_pct >= 80 ? 'good' : 'neutral'}>
          {st.collection_rate_pct != null ? `${st.collection_rate_pct}%` : '—'}
        </Stat>
        <Stat label="Still owed" tone={st.outstanding_total > 0 ? 'bad' : 'good'} hint={`${st.units_owing} of ${st.units_total} houses`}>
          <Money value={st.outstanding_total} />
        </Stat>
        <Stat label="Estate balance" hint="Collected minus spending"><Money value={st.closing_balance} /></Stat>
      </div>
      {msg && <div role="status" className={`rounded-xl px-4 py-3 text-sm ${msg.tone === 'good' ? 'bg-emerald-50 text-emerald-800' : 'bg-alert-50 text-alert-700'}`}>{msg.text}</div>}
      <section className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3">
          <h3 className="font-display font-semibold text-midnight-900">Who owes</h3>
          <div className="flex gap-2">
            {arrears.length > 0 && (
              <button className="btn-outline text-xs px-3 py-2 whitespace-nowrap" disabled={!!reminding} onClick={() => remind()}>
                {reminding === 'all' ? <Spinner className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5" />} Remind everyone
              </button>
            )}
            <button className="btn-outline text-xs px-3 py-2 whitespace-nowrap" onClick={() => setRecord('any')}>
              <Banknote className="h-3.5 w-3.5" /> Record payment
            </button>
          </div>
        </div>
        {arrears.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-emerald-700">Everyone is paid up.</p>
        ) : (
          <ul className="divide-y divide-midnight-50">
            {arrears.map((a) => (
              <li key={a.unit_id} className="px-5 sm:px-6 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-midnight-900 truncate">{a.label}</p>
                    <p className="text-xs text-midnight-400">{a.bills} open bill{a.bills === 1 ? '' : 's'} · oldest due {formatDate(a.oldest_due)}</p>
                  </div>
                  <Money value={a.due} className="font-semibold text-alert-700 shrink-0" />
                </div>
                <div className="mt-2 flex gap-4">
                  <button className="text-xs font-semibold text-royal hover:underline" onClick={() => setRecord(a)}>Record payment</button>
                  <button className="text-xs font-semibold text-midnight-500 hover:text-midnight-900 inline-flex items-center gap-1" disabled={!!reminding} onClick={() => remind(a.unit_id)}>
                    {reminding === a.unit_id ? <Spinner className="h-3 w-3" /> : null} Send reminder
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {record && <RecordPaymentModal preset={record === 'any' ? undefined : record} onClose={() => setRecord(null)} onDone={() => { setRecord(null); load() }} />}
      {bankOpen && <BankModal onClose={() => setBankOpen(false)} onDone={() => { setBankOpen(false); load() }} />}
      {typesOpen && <UnitTypesModal onClose={() => setTypesOpen(false)} onDone={() => { setTypesOpen(false); load() }} />}
    </div>
  )
}

function BankModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ bank_name: '', account_name: '', account_number: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    getFinanceSettings()
      .then((f) => setForm({ bank_name: f.bank_name || '', account_name: f.account_name || '', account_number: f.account_number || '' }))
      .catch(() => {})
  }, [])
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!/^\d{10}$/.test(form.account_number.trim())) {
      setError('Account numbers in Nigeria are 10 digits (NUBAN).')
      return
    }
    setBusy(true)
    setError('')
    try {
      await updateFinanceSettings({ bank_name: form.bank_name.trim(), account_name: form.account_name.trim(), account_number: form.account_number.trim() })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Estate bank account">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <p className="text-sm text-midnight-500">Use the estate's own account (association or facility manager), not a personal one, so residents trust where the money goes.</p>
        <div>
          <label className="label" htmlFor="bk-acn">Account name</label>
          <input id="bk-acn" required className="input" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="Maraba Estate Residents Association" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="bk-b">Bank</label>
            <input id="bk-b" required className="input" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="GTBank" />
          </div>
          <div>
            <label className="label" htmlFor="bk-n">Account number</label>
            <input id="bk-n" required inputMode="numeric" maxLength={10} className="input font-mono" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value.replace(/\D/g, '') })} placeholder="0123456789" />
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Save bank account'}</button>
      </form>
    </Modal>
  )
}

/** Set every house's type in one place, so the right price is charged. */
function UnitTypesModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [types, setTypes] = useState<string[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    Promise.all([listUnits(), listCharges()])
      .then(([u, cs]) => {
        const active = u.filter((x) => x.active)
        setUnits(active)
        const p: Record<string, number> = {}
        cs.filter((c) => c.active).forEach((c) => Object.entries(c.type_amounts || {}).forEach(([t, a]) => { if (!(t in p)) p[t] = a }))
        setPrices(p)
        setTypes(Object.keys(p))
        setChoice(Object.fromEntries(active.map((x) => [x.id, x.unit_type || ''])))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load houses'))
  }, [])
  async function save() {
    if (!units) return
    setBusy(true)
    setError('')
    try {
      const changed = units.filter((u) => (u.unit_type || '') !== (choice[u.id] || ''))
      for (const u of changed) await updateUnit(u.id, { unit_type: choice[u.id] || '' })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Set house types">
      <div className="space-y-4">
        <ErrorBox message={error} />
        <p className="text-sm text-midnight-500">Pick the type for each house so it gets the right price. “Standard” uses the bill’s normal amount.</p>
        {!units ? <Loading /> : units.length === 0 ? <p className="text-sm text-midnight-400">No houses yet.</p> : (
          <ul className="max-h-[50dvh] overflow-y-auto divide-y divide-midnight-50 rounded-xl border border-midnight-100">
            {units.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="text-sm font-medium text-midnight-900 min-w-0 truncate">{u.label}</span>
                <select className="input w-44 py-2" value={choice[u.id] || ''} onChange={(e) => setChoice({ ...choice, [u.id]: e.target.value })} aria-label={`Type for ${u.label}`}>
                  <option value="">Standard</option>
                  {types.map((t) => <option key={t} value={t}>{t} · ₦{(prices[t] || 0).toLocaleString()}</option>)}
                  {u.unit_type && !types.includes(u.unit_type) && <option value={u.unit_type}>{u.unit_type}</option>}
                </select>
              </li>
            ))}
          </ul>
        )}
        <button type="button" disabled={busy || !units} onClick={save} className="btn-primary w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Save types'}</button>
      </div>
    </Modal>
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
  const [rejecting, setRejecting] = useState<Payment | null>(null)
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
            onReject={(p) => setRejecting(p)}
          />
        )}
      </section>
      {recent.length > 0 && (
        <section className="card">
          <h3 className="font-display font-semibold text-midnight-900 px-6 pt-5 pb-3">Recent payments</h3>
          <PaymentList items={recent} admin />
        </section>
      )}
      {rejecting && (
        <RejectPaymentModal
          payment={rejecting}
          onClose={() => setRejecting(null)}
          onDone={() => {
            setRejecting(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function RejectPaymentModal({ payment, onClose, onDone }: { payment: Payment; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("We couldn't find this transfer in the estate account.")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await rejectPayment(payment.id, reason.trim())
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update')
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Money not received">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <p className="text-sm text-midnight-600">
          <Money value={payment.amount} className="font-semibold" /> from {payment.unit_label}{payment.payer_name ? ` (${payment.payer_name})` : ''}. The bill stays unpaid and they get an email with your reason.
        </p>
        <div>
          <label className="label" htmlFor="rj-r">Reason</label>
          <textarea id="rj-r" required rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <button type="submit" disabled={busy || !reason.trim()} className="btn-alert w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Mark as not received'}</button>
      </form>
    </Modal>
  )
}

function AdminCharges({ autoNew = false }: { autoNew?: boolean }) {
  const [charges, setCharges] = useState<Charge[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filter, setFilter] = useState<'open' | 'paid' | ''>('open')
  const [newOpen, setNewOpen] = useState(autoNew)
  const [issueFor, setIssueFor] = useState<Charge | null>(null)
  const [singleOpen, setSingleOpen] = useState(false)
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3">
          <div>
            <h3 className="font-display font-semibold text-midnight-900">Bill types</h3>
            <p className="text-xs text-midnight-400">Set each charge once, then send it to every house or only the houses you pick. For a one-off charge to one house (a fine, a gate remote), use “Bill one house”.</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <button className="btn-outline text-xs px-3 py-2 whitespace-nowrap" onClick={() => setSingleOpen(true)}><FilePlus2 className="h-3.5 w-3.5" /> Bill one house</button>
            <button className="btn-primary text-xs px-3 py-2 whitespace-nowrap" onClick={() => setNewOpen(true)}><Plus className="h-3.5 w-3.5" /> New bill type</button>
          </div>
        </div>
        {charges.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-midnight-400">No bill types yet. Start with your service charge.</p>
        ) : (
          <ul className="divide-y divide-midnight-50">
            {charges.map((c) => (
              <li key={c.id} className="px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-midnight-900">{c.name} {!c.active && <Badge tone="steel">Paused</Badge>}</p>
                  <p className="text-xs text-midnight-400">
                    {CHARGE_LABEL[c.category]} · ₦{c.amount.toLocaleString()} per unit · {c.frequency.replace('_', '-')}
                    {c.type_amounts && Object.keys(c.type_amounts).length > 0 &&
                      ` · ${Object.entries(c.type_amounts).map(([t, a]) => `${t}: ₦${a.toLocaleString()}`).join(', ')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {c.active && <button className="btn-alert text-xs px-3 py-2 whitespace-nowrap" onClick={() => setIssueFor(c)}><Send className="h-3.5 w-3.5" /> Send bills</button>}
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
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3">
          <h3 className="font-display font-semibold text-midnight-900">Bills sent</h3>
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
      {singleOpen && (
        <SingleBillModal
          onClose={() => setSingleOpen(false)}
          onDone={(m) => {
            setSingleOpen(false)
            setMsg(m)
            load()
          }}
        />
      )}
      {issueFor && (
        <IssueModal
          charge={issueFor}
          onClose={() => setIssueFor(null)}
          onDone={(r) => {
            setIssueFor(null)
            setMsg(`Sent ${r.issued} bill${r.issued === 1 ? '' : 's'}${r.skipped ? ` (${r.skipped} house${r.skipped === 1 ? '' : 's'} already had this bill)` : ''}. Residents have been emailed.`)
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
  const [units, setUnits] = useState<Unit[] | null>(null)
  const [typesOpen, setTypesOpen] = useState(false)
  const loadUnits = () => listUnits().then(setUnits).catch(() => {})
  useEffect(() => {
    loadUnits()
  }, [])
  const typePrices = charge.type_amounts || {}
  const [who, setWho] = useState<'all' | 'some'>('all')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const activeUnits = (units || []).filter((u) => u.active)
  const targets = who === 'all' ? activeUnits : activeUnits.filter((u) => picked.has(u.id))
  const priceOf = (u: Unit) => (u.unit_type && u.unit_type in typePrices ? typePrices[u.unit_type] : charge.amount)
  const preview = targets.reduce((sum, u) => sum + priceOf(u), 0)
  const activeCount = targets.length
  const untyped = Object.keys(typePrices).length && units ? targets.filter((u) => !(u.unit_type && u.unit_type in typePrices)) : []
  const shown = activeUnits.filter((u) => {
    const t = q.trim().toLowerCase()
    return !t || u.label.toLowerCase().includes(t) || u.occupants.some((o) => o.name.toLowerCase().includes(t))
  })
  const toggle = (id: string) =>
    setPicked((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onDone(await issueBills(charge.id, {
        period,
        due_date: new Date(`${due}T23:59:00`).toISOString(),
        ...(who === 'some' ? { unit_ids: Array.from(picked) } : {}),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not issue')
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={`Send ${charge.name}`}>
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
        <fieldset>
          <legend className="label">Who gets this bill</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['all', 'some'] as const).map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={who === w}
                onClick={() => setWho(w)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${who === w ? 'border-royal bg-royal-50 text-royal' : 'border-midnight-200 text-midnight-600 hover:bg-midnight-50'}`}
              >
                {w === 'all' ? 'Every house' : 'Choose houses'}
              </button>
            ))}
          </div>
          {who === 'some' && units && (
            <div className="mt-3 rounded-xl border border-midnight-100">
              <div className="relative border-b border-midnight-100">
                <Search className="h-4 w-4 text-midnight-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input className="w-full bg-transparent pl-9 pr-3 py-2.5 text-base sm:text-sm outline-none text-midnight-900" placeholder="Search house or resident" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search houses" />
              </div>
              <ul className="max-h-56 overflow-y-auto divide-y divide-midnight-50">
                {shown.map((u) => (
                  <li key={u.id}>
                    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                      <input type="checkbox" className="h-4 w-4 accent-royal shrink-0" checked={picked.has(u.id)} onChange={() => toggle(u.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-midnight-900 truncate">{u.label}</span>
                        <span className="block text-xs text-midnight-400 truncate">{u.occupants.length ? u.occupants.map((o) => o.name).join(', ') : 'No one linked'}</span>
                      </span>
                      <span className="text-xs text-midnight-500 tabular-nums shrink-0">₦{priceOf(u).toLocaleString()}</span>
                    </label>
                  </li>
                ))}
                {shown.length === 0 && <li className="px-3 py-3 text-sm text-midnight-400">No house matches.</li>}
              </ul>
              <p className="px-3 py-2 text-xs text-midnight-400 border-t border-midnight-100">{picked.size} chosen</p>
            </div>
          )}
        </fieldset>
        {untyped.length > 0 && (
          <div className="rounded-xl bg-amber-50 text-amber-800 text-xs px-3 py-2.5">
            <p>
              {untyped.length} house{untyped.length === 1 ? '' : 's'} ({untyped.slice(0, 4).map((u) => u.label).join(', ')}{untyped.length > 4 ? '…' : ''}) {untyped.length === 1 ? "has" : "have"} no type, so {untyped.length === 1 ? 'it' : 'they'} will be charged the standard ₦{charge.amount.toLocaleString()}.
            </p>
            <button type="button" className="mt-1.5 font-semibold underline" onClick={() => setTypesOpen(true)}>Set house types now</button>
          </div>
        )}
        {units && (
          <div className="rounded-xl bg-midnight-50/70 px-4 py-3 text-sm">
            <p className="text-midnight-600">{activeCount} house{activeCount === 1 ? '' : 's'} will get this bill</p>
            <p className="font-display text-xl font-semibold text-midnight-900 tabular-nums">Total <Money value={preview} /></p>
            <p className="text-xs text-midnight-400 mt-0.5">Only {who === 'all' ? 'these houses' : 'the houses you chose'} get an email. Any estate balance they have is used first.</p>
          </div>
        )}
        <button type="submit" disabled={busy || activeCount === 0} className="btn-alert w-full">{busy ? <Spinner className="h-4 w-4" /> : activeCount === 1 ? 'Send 1 bill now' : `Send ${activeCount} bills now`}</button>
      </form>
      {typesOpen && <UnitTypesModal onClose={() => setTypesOpen(false)} onDone={() => { setTypesOpen(false); loadUnits() }} />}
    </Modal>
  )
}

/** A one-off bill for ONE house: a fine, a damaged gate, a new gate remote,
 *  a past balance. It behaves like any other bill once sent. */
function SingleBillModal({ preset, onClose, onDone }: { preset?: Unit; onClose: () => void; onDone: (msg: string) => void }) {
  const [units, setUnits] = useState<Unit[] | null>(preset ? [preset] : null)
  const [unitId, setUnitId] = useState(preset?.id || '')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ChargeCategory>('other')
  const [note, setNote] = useState('')
  const today = new Date()
  const [due, setDue] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14).toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!preset) listUnits().then((u) => setUnits(u.filter((x) => x.active))).catch(() => setUnits([]))
  }, [preset])
  const unit = (units || []).find((u) => u.id === unitId)
  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = Math.round(Number(amount.replace(/[^\d.]/g, '')))
    if (!unitId) return setError('Choose the house to bill.')
    if (!n || n <= 0) return setError('Enter the amount in naira.')
    setBusy(true)
    setError('')
    try {
      const r = await createSingleBill({ unit_id: unitId, title: title.trim(), amount: n, category, note: note.trim() || undefined, due_date: new Date(`${due}T23:59:00`).toISOString() })
      onDone(`Sent “${r.title}” (₦${n.toLocaleString()}) to ${r.unit_label}.${r.emailed ? ' They have been emailed.' : ' No one is linked to this house yet, so no email went out.'}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the bill')
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={preset ? `Send a bill to ${preset.label}` : 'Bill one house'}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        {!preset && (
          <div>
            <label className="label" htmlFor="sb-u">House</label>
            <select id="sb-u" required className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              <option value="">{units ? 'Choose a house' : 'Loading…'}</option>
              {(units || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                  {u.occupants.length ? ` · ${u.occupants.map((o) => o.name).join(', ')}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        {unit && <p className="text-xs text-midnight-400 -mt-2">{unit.payer ? `Bill goes to ${unit.payer.name}.` : unit.occupants.length ? `Bill goes to ${unit.occupants.map((o) => o.name).join(', ')}.` : 'No one is linked to this house yet. Link a resident under Houses so they can see and pay it.'}</p>}
        <div>
          <label className="label" htmlFor="sb-t">What is it for?</label>
          <input id="sb-t" required minLength={2} maxLength={80} className="input" placeholder="e.g. Replacement gate remote" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sb-a">Amount (₦)</label>
            <input id="sb-a" required inputMode="numeric" className="input" placeholder="15000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="sb-d">Due date</label>
            <input id="sb-d" required type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="sb-c">Type</label>
          <select id="sb-c" className="input" value={category} onChange={(e) => setCategory(e.target.value as ChargeCategory)}>
            {(Object.keys(CHARGE_LABEL) as ChargeCategory[]).map((c) => (
              <option key={c} value={c}>{CHARGE_LABEL[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sb-n">Note for the resident (optional)</label>
          <textarea id="sb-n" rows={2} maxLength={300} className="input" placeholder="e.g. As agreed at the residents' meeting" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button type="submit" disabled={busy} className="btn-alert w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Send this bill'}</button>
      </form>
    </Modal>
  )
}

function AdminUnits({ autoNew = false }: { autoNew?: boolean }) {
  const [units, setUnits] = useState<Unit[]>([])
  const [people, setPeople] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Unit | 'new' | null>(autoNew ? 'new' : null)
  const [billFor, setBillFor] = useState<Unit | null>(null)
  const [typesOpen, setTypesOpen] = useState(false)
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
        <button className="btn-primary text-sm" onClick={() => setEdit('new')}><Plus className="h-4 w-4" /> Add house</button>
        {units.length > 0 && <button className="btn-outline text-sm" onClick={() => setTypesOpen(true)}><Tags className="h-4 w-4" /> Set house types</button>}
        {unlinked.length > 0 && (
          <button
            className="btn-outline text-sm"
            onClick={async () => {
              const r = await importUnits()
              setMsg(`Created ${r.created} unit${r.created === 1 ? '' : 's'} and linked ${r.linked} resident${r.linked === 1 ? '' : 's'} from their flat numbers.`)
              load()
            }}
          >
            <Upload className="h-4 w-4" /> Add houses from residents' flat numbers ({unlinked.length})
          </button>
        )}
      </div>
      <div className="card">
        {units.length === 0 ? (
          <EmptyState title="No houses yet" subtitle="Bills are sent per house or flat. Add them here, or create them from residents' flat numbers." />
        ) : (
          <ul className="divide-y divide-midnight-50">
            {units.map((u) => (
              <li key={u.id} className="px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-midnight-900">{u.label} {u.unit_type ? <span className="text-xs text-midnight-400">· {u.unit_type}</span> : <span className="text-xs text-amber-700">· no type</span>}</p>
                  <p className="text-xs text-midnight-400">
                    {u.occupants.length ? u.occupants.map((o) => o.name).join(', ') : 'No one linked yet'}
                    {u.payer ? ` · bills to ${u.payer.name}` : ''}
                    {u.owner_name ? ` · owner ${u.owner_name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {u.balance_due > 0 ? <Money value={u.balance_due} className="font-semibold text-alert-700" /> : <span className="text-emerald-700 text-xs font-semibold">Paid up</span>}
                  {u.credit > 0 && <Badge tone="success"><Wallet className="h-3 w-3" /> ₦{u.credit.toLocaleString()}</Badge>}
                  <button className="text-xs font-semibold text-royal hover:underline" onClick={() => setBillFor(u)}>Send bill</button>
                  <button className="text-xs font-semibold text-royal hover:underline" onClick={() => setEdit(u)}>Edit</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {edit && <UnitModal unit={edit === 'new' ? undefined : edit} people={people} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load() }} />}
      {typesOpen && <UnitTypesModal onClose={() => setTypesOpen(false)} onDone={() => { setTypesOpen(false); setMsg('House types saved.'); load() }} />}
      {billFor && <SingleBillModal preset={billFor} onClose={() => setBillFor(null)} onDone={(m) => { setBillFor(null); setMsg(m); load() }} />}
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
  const [typeOptions, setTypeOptions] = useState<string[]>([])
  useEffect(() => {
    listCharges().then((cs) => setTypeOptions(Array.from(new Set(cs.flatMap((c) => Object.keys(c.type_amounts || {})))))).catch(() => {})
  }, [])
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
    <Modal open onClose={onClose} title={unit ? `Edit ${unit.label}` : 'Add a house'}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="u-l">Name / number</label>
            <input id="u-l" required className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Block C, Flat 6" />
          </div>
          <div>
            <label className="label" htmlFor="u-t">Type (optional)</label>
            <input id="u-t" className="input" list="unit-types" value={type} onChange={(e) => setType(e.target.value)} placeholder="2-bed flat, duplex" />
            <datalist id="unit-types">{typeOptions.map((t) => <option key={t} value={t} />)}</datalist>
            {typeOptions.length > 0 && <p className="text-[11px] text-midnight-400 mt-1">Pick one of your bill price types so the right amount is charged.</p>}
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
