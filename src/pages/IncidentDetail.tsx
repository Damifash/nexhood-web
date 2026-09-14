import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Phone, Send, Pencil, X } from 'lucide-react'
import { getIncident, updateIncident, resolveIncident } from '@/lib/api'
import type { Incident } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { Spinner, FullPageSpinner } from '@/components/ui/Spinner'
import { Badge, statusTone } from '@/components/ui/Badge'

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingContent, setEditingContent] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingContent, setSavingContent] = useState(false)
  const canManage = user?.role === 'guard' || user?.role === 'admin' || user?.role === 'super_admin'
  // Editing the reported title/description is moderation power (e.g.
  // redacting a report that names someone's ethnicity as "suspicious"
  // instead of describing actual conduct) — admin-only, not guards.
  const canEditContent = user?.role === 'admin' || user?.role === 'super_admin'

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const data = await getIncident(id)
      setIncident(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleStatusChange(status: string) {
    if (!id) return
    const updated = await updateIncident(id, { status })
    setIncident(updated)
  }

  async function handleResolve() {
    if (!id) return
    await resolveIncident(id)
    load()
  }

  async function handleRespond(e: FormEvent) {
    e.preventDefault()
    if (!id || !response.trim()) return
    setSubmitting(true)
    try {
      const updated = await updateIncident(id, { response })
      setIncident(updated)
      setResponse('')
    } finally {
      setSubmitting(false)
    }
  }

  function startEditingContent() {
    if (!incident) return
    setEditTitle(incident.title)
    setEditDescription(incident.description)
    setEditingContent(true)
  }

  async function handleSaveContent(e: FormEvent) {
    e.preventDefault()
    if (!id) return
    setSavingContent(true)
    try {
      const updated = await updateIncident(id, { title: editTitle.trim(), description: editDescription.trim() })
      setIncident(updated)
      setEditingContent(false)
    } finally {
      setSavingContent(false)
    }
  }

  if (loading) return <FullPageSpinner />
  if (!incident) return <p className="text-midnight-400">Incident not found.</p>

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-midnight-500 hover:text-midnight-800 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to incidents
      </button>

      <div className="card p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-display text-xl font-semibold text-midnight-900">{incident.title}</h2>
              <Badge tone={incident.severity === 'critical' || incident.severity === 'high' ? 'alert' : 'neutral'}>{incident.severity}</Badge>
            </div>
            <p className="text-xs text-midnight-400 mt-1 capitalize">
              {incident.type.replace('_', ' ')} · Reported by {incident.reporter_name || 'a resident'} · {new Date(incident.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={statusTone(incident.status)}>{incident.status || 'reported'}</Badge>
            {canEditContent && !editingContent && (
              <button
                onClick={startEditingContent}
                className="text-midnight-400 hover:text-midnight-800 p-1.5 rounded-lg hover:bg-midnight-50"
                title="Edit title/description"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {editingContent ? (
          <form onSubmit={handleSaveContent} className="mt-6 space-y-3">
            <p className="text-xs text-midnight-400">
              Edit the reported title or description — for example, to remove content that names someone's
              tribe, ethnicity or religion instead of describing what they actually did. This is logged.
            </p>
            <input
              className="input w-full"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              minLength={3}
              required
            />
            <textarea
              className="input w-full min-h-[100px]"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              minLength={10}
              required
            />
            <div className="flex gap-2">
              <button className="btn-primary" disabled={savingContent}>
                {savingContent ? <Spinner className="h-4 w-4" /> : 'Save changes'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setEditingContent(false)}>
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-midnight-700 leading-relaxed mt-6">{incident.description}</p>
        )}

        {canManage && !editingContent && (
          <div className="flex flex-wrap gap-2 mt-6">
            {incident.reporter_phone && (
              <a href={`tel:${incident.reporter_phone}`} className="btn-outline">
                <Phone className="h-4 w-4" /> Call {incident.reporter_name || 'reporter'}
              </a>
            )}
            {incident.status !== 'resolved' && incident.status !== 'closed' && (
              <>
                <button className="btn-outline" onClick={() => handleStatusChange('in_progress')}>Mark in progress</button>
                <button className="btn-primary" onClick={handleResolve}>
                  <CheckCircle2 className="h-4 w-4" /> Resolve
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-8 border-t border-midnight-50 pt-6">
          <h3 className="font-display font-semibold text-midnight-900 mb-4">Responses</h3>
          {!incident.responses || incident.responses.length === 0 ? (
            <p className="text-sm text-midnight-400">No responses yet.</p>
          ) : (
            <ul className="space-y-4 mb-4">
              {incident.responses.map((r, i) => (
                <li key={i} className="bg-midnight-50/60 rounded-xl px-4 py-3">
                  <p className="text-sm text-midnight-800">{r.message}</p>
                  <p className="text-xs text-midnight-400 mt-1">{new Date(r.timestamp).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
          {canManage && (
            <form onSubmit={handleRespond} className="flex gap-2">
              <input className="input flex-1" placeholder="Add a response..." value={response} onChange={(e) => setResponse(e.target.value)} />
              <button className="btn-primary" disabled={submitting}>
                {submitting ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
