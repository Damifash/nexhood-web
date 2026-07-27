import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, AlertCircle, ChevronRight } from 'lucide-react'
import { createIncident, listIncidents } from '@/lib/api'
import type { Incident } from '@/lib/types'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Spinner, EmptyState } from '@/components/ui/Spinner'
import { Badge, statusTone } from '@/components/ui/Badge'

const TYPES = ['emergency', 'theft', 'vandalism', 'dispute', 'suspicious_activity', 'maintenance', 'other']
const SEVERITIES = ['low', 'medium', 'high', 'critical']

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [filter, setFilter] = useState<{ status?: string; severity?: string }>({})

  async function load() {
    setLoading(true)
    try {
      const data = await listIncidents(filter)
      setIncidents(data)
    } catch {
      // empty state covers failure
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.status, filter.severity])

  return (
    <div>
      <PageHeader
        title="Incidents"
        subtitle="Report and track security incidents from open to resolved."
        action={
          <button className="btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Report incident
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <select className="input w-auto" value={filter.status || ''} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value || undefined }))}>
          <option value="">All statuses</option>
          <option value="reported">Reported</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select className="input w-auto" value={filter.severity || ''} onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value || undefined }))}>
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-16 text-royal"><Spinner className="h-6 w-6" /></div>
        ) : incidents.length === 0 ? (
          <EmptyState title="No incidents found" subtitle="Nothing reported for this filter — good news." />
        ) : (
          <ul className="divide-y divide-midnight-50">
            {incidents.map((inc) => (
              <li key={inc.id}>
                <Link to={`/app/incidents/${inc.id}`} className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-midnight-50/40 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-midnight-900 truncate">{inc.title}</p>
                      <Badge tone={inc.severity === 'critical' || inc.severity === 'high' ? 'alert' : 'neutral'}>{inc.severity}</Badge>
                    </div>
                    <p className="text-xs text-midnight-400 mt-1 truncate capitalize">
                      {inc.type.replace('_', ' ')} · {new Date(inc.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge tone={statusTone(inc.status)}>{inc.status || 'reported'}</Badge>
                    <ChevronRight className="h-4 w-4 text-midnight-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CreateIncidentModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(i) => setIncidents((prev) => [i, ...prev])} />
    </div>
  )
}

function CreateIncidentModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (i: Incident) => void }) {
  const [form, setForm] = useState({ type: 'suspicious_activity', severity: 'medium', title: '', description: '' })
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
      const incident = await createIncident(form)
      onCreated(incident)
      onClose()
      setForm({ type: 'suspicious_activity', severity: 'medium', title: '', description: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report incident')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Report an incident">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        <div>
          <label className="label">Title</label>
          <input required minLength={3} className="input" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Suspicious vehicle near Block C" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => update('type', e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Severity</label>
            <select className="input" value={form.severity} onChange={(e) => update('severity', e.target.value)}>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea required minLength={10} rows={4} className="input" value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="What happened, when, and where..." />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Spinner className="h-4 w-4" /> : 'Submit report'}
        </button>
      </form>
    </Modal>
  )
}
