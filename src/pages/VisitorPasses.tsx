import { useEffect, useState, type FormEvent } from 'react'
import { Plus, QrCode, ScanLine, X as XIcon, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { createVisitorPass, listVisitorPasses, validateVisitorPass } from '@/lib/api'
import type { VisitorPass } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Spinner, EmptyState } from '@/components/ui/Spinner'
import { Badge, statusTone } from '@/components/ui/Badge'

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function VisitorPasses() {
  const { user } = useAuth()
  const [passes, setPasses] = useState<VisitorPass[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [viewPass, setViewPass] = useState<VisitorPass | null>(null)
  const canValidate = user?.role === 'guard' || user?.role === 'admin' || user?.role === 'super_admin'
  // Guards scan/validate codes at the gate — they don't issue them. Only
  // the host (resident) or an admin can generate a new visitor pass.
  const canCreate = user?.role === 'resident' || user?.role === 'admin' || user?.role === 'super_admin'

  async function load() {
    setLoading(true)
    try {
      const data = await listVisitorPasses()
      setPasses(data)
    } catch {
      // handled inline below via empty state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <PageHeader
        title="Visitor Passes"
        subtitle="Create expiring QR passes and validate visitors at the gate."
        action={
          canCreate ? (
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New pass
            </button>
          ) : undefined
        }
      />

      {canValidate && <ValidatePanel onValidated={load} />}

      <div className="card">
        <div className="px-6 py-4 border-b border-midnight-50 flex items-center justify-between">
          <h3 className="font-display font-semibold text-midnight-900">
            {user?.role === 'admin' || user?.role === 'super_admin' ? 'All passes' : 'Your passes'}
          </h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-16 text-royal"><Spinner className="h-6 w-6" /></div>
        ) : passes.length === 0 ? (
          <EmptyState title="No visitor passes yet" subtitle="Create one to let your guest in smoothly." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-midnight-400 border-b border-midnight-50">
                  <th className="px-6 py-3 font-semibold">Visitor</th>
                  <th className="px-6 py-3 font-semibold">Host</th>
                  <th className="px-6 py-3 font-semibold">Valid window</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {passes.map((p) => (
                  <tr key={p.id} className="border-b border-midnight-50 last:border-0 hover:bg-midnight-50/40">
                    <td className="px-6 py-3">
                      <p className="font-medium text-midnight-900">{p.visitor_name}</p>
                      <p className="text-xs text-midnight-400">{p.purpose || '—'}</p>
                    </td>
                    <td className="px-6 py-3 text-midnight-600">{p.host_name}</td>
                    <td className="px-6 py-3 text-midnight-600 text-xs">
                      {new Date(p.valid_from).toLocaleString()} &rarr; {new Date(p.valid_until).toLocaleString()}
                    </td>
                    <td className="px-6 py-3"><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => setViewPass(p)} className="text-royal text-xs font-semibold hover:underline inline-flex items-center gap-1">
                        <QrCode className="h-3.5 w-3.5" /> View QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canCreate && (
        <CreatePassModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(p) => { setPasses((prev) => [p, ...prev]); setViewPass(p) }} />
      )}

      <Modal open={!!viewPass} onClose={() => setViewPass(null)} title="Visitor pass">
        {viewPass && (
          <div className="text-center">
            <img
              src={`data:image/png;base64,${viewPass.qr_code}`}
              alt={`QR code for ${viewPass.visitor_name}`}
              className="mx-auto w-48 h-48 rounded-xl border border-midnight-100"
            />
            <p className="mt-4 font-display text-lg font-semibold text-midnight-900">{viewPass.visitor_name}</p>
            <p className="text-2xl font-mono tracking-widest text-royal mt-1">{viewPass.code}</p>
            <Badge tone={statusTone(viewPass.status)}>{viewPass.status}</Badge>
            <p className="text-xs text-midnight-400 mt-4">
              Valid {new Date(viewPass.valid_from).toLocaleString()} to {new Date(viewPass.valid_until).toLocaleString()}
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

function CreatePassModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (p: VisitorPass) => void }) {
  const [form, setForm] = useState({
    visitor_name: '',
    visitor_phone: '',
    purpose: '',
    valid_from: toLocalInput(new Date()),
    valid_until: toLocalInput(new Date(Date.now() + 4 * 60 * 60 * 1000)),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const pass = await createVisitorPass({
        visitor_name: form.visitor_name,
        visitor_phone: form.visitor_phone || undefined,
        purpose: form.purpose || undefined,
        valid_from: new Date(form.valid_from).toISOString(),
        valid_until: new Date(form.valid_until).toISOString(),
      })
      onCreated(pass)
      onClose()
      setForm((f) => ({ ...f, visitor_name: '', visitor_phone: '', purpose: '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create pass')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New visitor pass">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        <div>
          <label className="label">Visitor name</label>
          <input required className="input" value={form.visitor_name} onChange={(e) => update('visitor_name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" value={form.visitor_phone} onChange={(e) => update('visitor_phone', e.target.value)} placeholder="+234..." />
          </div>
          <div>
            <label className="label">Purpose</label>
            <input className="input" value={form.purpose} onChange={(e) => update('purpose', e.target.value)} placeholder="Family visit" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valid from</label>
            <input type="datetime-local" required className="input" value={form.valid_from} onChange={(e) => update('valid_from', e.target.value)} />
          </div>
          <div>
            <label className="label">Valid until</label>
            <input type="datetime-local" required className="input" value={form.valid_until} onChange={(e) => update('valid_until', e.target.value)} />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner className="h-4 w-4" /> : 'Generate pass'}
        </button>
      </form>
    </Modal>
  )
}

function ValidatePanel({ onValidated }: { onValidated: () => void }) {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    try {
      const pass = await validateVisitorPass(code.trim().toUpperCase())
      // Which gate this happened at isn't useful to show back to the guard —
      // they're standing there, they know. What they actually need is where
      // the visitor is headed, so the destination flat/house leads here.
      const destination = pass.host_apartment ? `Visiting ${pass.host_apartment}` : 'No apartment on file'
      setResult({ type: 'success', message: `${pass.visitor_name} let in. ${destination} (host: ${pass.host_name}).` })
      setCode('')
      onValidated()
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Validation failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6 mb-6 bg-midnight-900 text-warm">
      <div className="flex items-center gap-2 mb-4">
        <ScanLine className="h-5 w-5 text-alert" />
        <h3 className="font-display font-semibold">Validate visitor code</h3>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1 bg-white/5 border-white/10 text-warm placeholder:text-steel-400"
          placeholder="Enter visitor code (e.g. A1B2)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <button className="btn-alert" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : 'Validate'}
        </button>
      </form>
      {result && (
        <div className={`flex items-center gap-2 mt-4 text-sm ${result.type === 'success' ? 'text-emerald-300' : 'text-alert-300'}`}>
          {result.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XIcon className="h-4 w-4" />}
          {result.message}
        </div>
      )}
    </div>
  )
}
