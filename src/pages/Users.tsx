import { useEffect, useRef, useState, type FormEvent } from 'react'
import { UserPlus, Upload, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { bulkInviteUsers, changeUserRole, deleteUser, inviteUser, listUsers, updateUser } from '@/lib/api'
import type { Role, User } from '@/lib/types'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/ui/Modal'
import { Spinner, EmptyState } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'

// Order matters here: this drives both the invite dropdown and the
// per-user role-change dropdown. Resident/guard/police are the roles an
// estate should be inviting day-to-day; admin is a limited, high-trust
// role (capped at 3 per estate on the backend) so it's listed last and
// called out separately in the invite form.
const ROLES: Role[] = ['resident', 'guard', 'police', 'admin']

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setUsers(await listUsers())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleRoleChange(id: string, role: string) {
    await changeUserRole(id, role)
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: role as Role } : u)))
  }

  async function handleToggleActive(id: string, active: boolean) {
    await updateUser(id, { is_active: active })
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: active } : u)))
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this user from the estate?')) return
    await deleteUser(id)
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage residents, guards, admins and police in your estate."
        action={
          <div className="flex gap-2 flex-wrap">
            <button className="btn-outline" onClick={() => setBulkOpen(true)}>
              <Upload className="h-4 w-4" /> Bulk invite
            </button>
            <button className="btn-primary" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite user
            </button>
          </div>
        }
      />

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-16 text-royal"><Spinner className="h-6 w-6" /></div>
        ) : users.length === 0 ? (
          <EmptyState title="No users yet" subtitle="Invite your first guard or admin to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-midnight-400 border-b border-midnight-50">
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Contact</th>
                  <th className="px-6 py-3 font-semibold">Role</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-midnight-50 last:border-0 hover:bg-midnight-50/40">
                    <td className="px-6 py-3">
                      <p className="font-medium text-midnight-900">{u.name}</p>
                      {u.apartment && <p className="text-xs text-midnight-400">{u.apartment}</p>}
                    </td>
                    <td className="px-6 py-3 text-midnight-600 text-xs">
                      <p>{u.email}</p>
                      <p>{u.phone}</p>
                    </td>
                    <td className="px-6 py-3">
                      <select
                        className="input py-1.5 text-xs w-auto"
                        value={u.role}
                        disabled={u.id === me?.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        {u.role === 'super_admin' && <option value="super_admin">super_admin</option>}
                      </select>
                    </td>
                    <td className="px-6 py-3">
                      <button onClick={() => handleToggleActive(u.id, !u.is_active)}>
                        <Badge tone={u.is_active ? 'success' : 'neutral'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                      </button>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {u.id !== me?.id && (
                        <button onClick={() => handleDelete(u.id)} className="text-midnight-300 hover:text-alert-600 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={load} />
      <BulkInviteModal open={bulkOpen} onClose={() => setBulkOpen(false)} onInvited={load} />
    </div>
  )
}

function InviteModal({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'resident', apartment: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await inviteUser(form)
      setSuccess(
        res.temp_password
          ? `Invited ${res.email}. Temp password: ${res.temp_password} (email delivery isn't set up yet, so share this with them directly.)`
          : `Invited ${res.email}. Their login details were emailed to them.`
      )
      onInvited()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not invite user')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setForm({ name: '', email: '', phone: '', role: 'resident', apartment: '' })
    setSuccess('')
    setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Invite a user">
      {success ? (
        <div className="text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm text-midnight-700">{success}</p>
          <button className="btn-primary mt-5" onClick={handleClose}>Done</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
            </div>
          )}
          <div>
            <label className="label">Full name</label>
            <input required className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input required className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => update('role', e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Apartment</label>
              <input className="input" value={form.apartment} onChange={(e) => update('apartment', e.target.value)} placeholder="Optional" />
            </div>
          </div>
          {form.role === 'admin' && (
            <p className="text-xs text-midnight-400 -mt-2">
              Admin access is limited to 3 people per estate. Most invites should be residents, guards or police.
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner className="h-4 w-4" /> : 'Send invite'}
          </button>
        </form>
      )}
    </Modal>
  )
}

function BulkInviteModal({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<{ email: string; status: string; reason?: string }[] | null>(null)

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const res = await bulkInviteUsers(file)
      setResults(res.results)
      onInvited()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk invite failed')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setResults(null)
    setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Bulk invite via CSV">
      {results ? (
        <div>
          <p className="text-sm text-midnight-600 mb-3">Processed {results.length} rows.</p>
          <ul className="max-h-64 overflow-y-auto space-y-1.5">
            {results.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-xs bg-midnight-50/60 rounded-lg px-3 py-2">
                <span className="truncate">
                  {r.email}
                  {r.reason && <span className="block text-midnight-400">{r.reason}</span>}
                </span>
                <Badge tone={r.status === 'created' ? 'success' : r.status === 'skipped' ? 'neutral' : 'alert'}>{r.status}</Badge>
              </li>
            ))}
          </ul>
          <button className="btn-primary w-full mt-4" onClick={handleClose}>Done</button>
        </div>
      ) : (
        <form onSubmit={handleUpload} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
            </div>
          )}
          <p className="text-sm text-midnight-500">
            CSV columns: <code className="text-xs bg-midnight-50 px-1.5 py-0.5 rounded">name, email, phone, role, apartment</code>
          </p>
          <input ref={fileRef} type="file" accept=".csv" required className="input" />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Spinner className="h-4 w-4" /> : 'Upload & invite'}
          </button>
        </form>
      )}
    </Modal>
  )
}
