import { useEffect, useState, type FormEvent } from 'react'
import { Hand, Image as ImageIcon, Lock, MapPin, Plus, Wrench } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  REPAIR_LABEL, compressImage, createRepair, getRepairImages, listRepairs, repairMeToo, updateRepair,
  type Repair, type RepairCategory, type RepairStatus,
} from '@/lib/finance'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Spinner, EmptyState } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { ErrorBox, Money, Tabs, formatDate } from '@/components/finance/ui'

const STATUS_LABEL: Record<RepairStatus, string> = { reported: 'Reported', assigned: 'Assigned', in_progress: 'Being fixed', fixed: 'Fixed', closed: 'Closed' }
const STATUS_TONE: Record<RepairStatus, 'alert' | 'warning' | 'royal' | 'success' | 'steel'> = {
  reported: 'alert', assigned: 'warning', in_progress: 'royal', fixed: 'success', closed: 'steel',
}

export default function Repairs() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const [tab, setTab] = useState<'open' | 'fixed' | 'all'>('open')
  const [items, setItems] = useState<Repair[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [manage, setManage] = useState<Repair | null>(null)
  const [photos, setPhotos] = useState<string[] | null>(null)

  async function load() {
    setLoading(true)
    try {
      setItems(await listRepairs(tab === 'open' ? { status: 'open' } : tab === 'fixed' ? { status: 'fixed' } : undefined))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <div>
      <PageHeader
        title="Repairs"
        subtitle="Leaks, lights, roads, drains: report it, see it fixed, see what it cost."
        action={<button className="btn-primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> Report a problem</button>}
      />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'open', label: 'Open' }, { key: 'fixed', label: 'Fixed' }, { key: 'all', label: 'All' }]} />
      {loading ? (
        <div className="flex justify-center py-16 text-royal"><Spinner className="h-6 w-6" /></div>
      ) : items.length === 0 ? (
        <div className="card"><EmptyState title={tab === 'open' ? 'Nothing waiting to be fixed' : 'Nothing here yet'} subtitle="Spotted a problem in the estate? Report it so management can fix it." /></div>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    <span className="text-xs text-midnight-400">{REPAIR_LABEL[r.category]}</span>
                    {r.visibility === 'management' && <span className="inline-flex items-center gap-1 text-xs text-midnight-400"><Lock className="h-3 w-3" /> Only management can see this</span>}
                  </div>
                  <h3 className="mt-2 font-display font-semibold text-midnight-900">{r.title}</h3>
                  <p className="text-sm text-midnight-600 mt-1 whitespace-pre-wrap">{r.description}</p>
                  <p className="text-xs text-midnight-400 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {r.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.location}</span>}
                    <span>{r.mine ? 'You reported this' : `${r.reporter_name || 'A resident'}${r.reporter_unit ? `, ${r.reporter_unit}` : ''}`} · {formatDate(r.created_at)}</span>
                    {r.assigned_to && <span><Wrench className="inline h-3 w-3" /> {r.assigned_to}</span>}
                    {r.cost != null && <span>Cost: <Money value={r.cost} /> from estate funds</span>}
                  </p>
                  {r.updates && r.updates.length > 0 && (
                    <ul className="mt-3 space-y-1 border-l-2 border-midnight-100 pl-3">
                      {r.updates.slice(-3).map((u, i) => (
                        <li key={i} className="text-xs text-midnight-500">
                          <span className="font-semibold text-midnight-700">{u.by}</span>{u.status ? ` marked it ${STATUS_LABEL[u.status as RepairStatus]?.toLowerCase()}` : ''}{u.note ? `: ${u.note}` : ''} · {formatDate(u.at)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {r.visibility === 'estate' && !r.mine && (
                    <button
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${r.me_too_mine ? 'border-royal bg-royal-50 text-royal-700' : 'border-midnight-200 text-midnight-600 hover:border-midnight-300'}`}
                      aria-pressed={r.me_too_mine}
                      onClick={async () => {
                        const updated = await repairMeToo(r.id)
                        setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...updated } : x)))
                      }}
                    >
                      <Hand className="h-3.5 w-3.5" /> Me too{r.me_too_count ? ` · ${r.me_too_count}` : ''}
                    </button>
                  )}
                  {r.visibility === 'estate' && r.mine && r.me_too_count > 0 && <span className="text-xs text-midnight-500">{r.me_too_count} neighbour{r.me_too_count === 1 ? '' : 's'} said "me too"</span>}
                  {!!r.image_count && (
                    <button className="inline-flex items-center gap-1 text-xs font-semibold text-royal hover:underline" onClick={async () => setPhotos((await getRepairImages(r.id)).images)}>
                      <ImageIcon className="h-3.5 w-3.5" /> {r.image_count} photo{r.image_count === 1 ? '' : 's'}
                    </button>
                  )}
                  {isAdmin && <button className="btn-outline text-xs px-3 py-1.5" onClick={() => setManage(r)}>Update</button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {newOpen && <NewRepairModal onClose={() => setNewOpen(false)} onDone={() => { setNewOpen(false); setTab('open'); load() }} />}
      {manage && <ManageModal repair={manage} onClose={() => setManage(null)} onDone={() => { setManage(null); load() }} />}
      {photos && (
        <Modal open onClose={() => setPhotos(null)} title="Photos">
          {photos.length === 0 ? <p className="text-sm text-midnight-400">No photos were added.</p> : (
            <div className="space-y-3">{photos.map((p, i) => <img key={i} src={p} alt={`Photo ${i + 1}`} className="w-full rounded-xl" />)}</div>
          )}
        </Modal>
      )}
    </div>
  )
}

function NewRepairModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ category: 'electrical' as RepairCategory, title: '', description: '', location: '', visibility: 'estate' as 'estate' | 'management' })
  const [images, setImages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await createRepair({ ...form, location: form.location || undefined, images: images.length ? images : undefined })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Report a problem">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="rq-c">What kind?</label>
            <select id="rq-c" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as RepairCategory })}>
              {(Object.keys(REPAIR_LABEL) as RepairCategory[]).map((c) => <option key={c} value={c}>{REPAIR_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="rq-l">Where?</label>
            <input id="rq-l" className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Block C, by the gate" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="rq-t">Short title</label>
          <input id="rq-t" required minLength={3} className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Street light off on Close 3" />
        </div>
        <div>
          <label className="label" htmlFor="rq-d">What's wrong?</label>
          <textarea id="rq-d" required minLength={5} rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <fieldset>
          <legend className="label">Who can see it?</legend>
          <div className="grid gap-2">
            {([
              ['estate', 'Everyone in the estate', 'For shared areas: lights, roads, drains, borehole. Neighbours can say "me too".'],
              ['management', 'Only management', 'For problems inside your home, or anything sensitive.'],
            ] as const).map(([v, t, d]) => (
              <label key={v} className={`flex gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer ${form.visibility === v ? 'border-royal bg-royal-50' : 'border-midnight-200'}`}>
                <input type="radio" name="vis" className="accent-royal mt-1" checked={form.visibility === v} onChange={() => setForm({ ...form, visibility: v })} />
                <span><span className="block text-sm font-semibold text-midnight-900">{t}</span><span className="block text-xs text-midnight-500">{d}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <span className="label">Photos (up to 3)</span>
          <div className="flex flex-wrap gap-2">
            {images.map((src, i) => (
              <button key={i} type="button" onClick={() => setImages(images.filter((_, j) => j !== i))} aria-label="Remove photo" className="relative">
                <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover border border-midnight-100" />
              </button>
            ))}
            {images.length < 3 && (
              <label className="h-16 w-16 rounded-lg border-2 border-dashed border-midnight-200 flex items-center justify-center text-midnight-400 cursor-pointer hover:border-royal-300">
                <Plus className="h-5 w-5" />
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (f) setImages([...images, await compressImage(f, 1200, 0.65)])
                }} aria-label="Add photo" />
              </label>
            )}
          </div>
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Send report'}</button>
      </form>
    </Modal>
  )
}

function ManageModal({ repair, onClose, onDone }: { repair: Repair; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<RepairStatus>(repair.status)
  const [assigned, setAssigned] = useState(repair.assigned_to || '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await updateRepair(repair.id, { status: status !== repair.status ? status : undefined, assigned_to: assigned, note: note || undefined })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={`Update: ${repair.title}`}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox message={error} />
        <div>
          <label className="label" htmlFor="mg-s">Status</label>
          <select id="mg-s" className="input" value={status} onChange={(e) => setStatus(e.target.value as RepairStatus)}>
            {(Object.keys(STATUS_LABEL) as RepairStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="mg-a">Assigned to (artisan / vendor)</label>
          <input id="mg-a" className="input" value={assigned} onChange={(e) => setAssigned(e.target.value)} placeholder="Sunday the electrician" />
        </div>
        <div>
          <label className="label" htmlFor="mg-n">Note for residents (optional)</label>
          <input id="mg-n" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Electrician coming Saturday morning" />
        </div>
        <p className="text-xs text-midnight-400">To show what the fix cost, record the expense in Estate finances and pick this request.</p>
        <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? <Spinner className="h-4 w-4" /> : 'Save update'}</button>
      </form>
    </Modal>
  )
}
