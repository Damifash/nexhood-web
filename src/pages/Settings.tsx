import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { changePassword, getEstate, updateEstateSettings } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'

export default function Settings() {
  const { user } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      await changePassword(oldPassword, newPassword)
      setSuccess(true)
      setOldPassword('')
      setNewPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="Settings" subtitle="Manage your profile and account security." />

      <div className="card p-6">
        <h3 className="font-display font-semibold text-midnight-900 mb-4">Profile</h3>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-midnight-400">Name</dt>
          <dd className="text-midnight-800 font-medium">{user?.name}</dd>
          <dt className="text-midnight-400">Email</dt>
          <dd className="text-midnight-800 font-medium">{user?.email}</dd>
          <dt className="text-midnight-400">Phone</dt>
          <dd className="text-midnight-800 font-medium">{user?.phone}</dd>
          <dt className="text-midnight-400">Role</dt>
          <dd><Badge tone="royal">{user?.role.replace('_', ' ')}</Badge></dd>
          <dt className="text-midnight-400">Estate</dt>
          <dd className="text-midnight-800 font-medium">{user?.estate_name || '—'}</dd>
        </dl>
        {user?.badges && user.badges.length > 0 && (
          <div className="mt-5 pt-5 border-t border-midnight-50">
            <p className="text-xs uppercase tracking-wide text-midnight-400 font-semibold mb-2">Badges earned</p>
            <div className="flex flex-wrap gap-2">
              {user.badges.map((b, i) => (
                <Badge key={i} tone="alert">{b.badge}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-display font-semibold text-midnight-900 mb-4">Change password</h3>
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3 mb-4">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3 mb-4">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>Password updated.</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input type="password" required className="input" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">New password</label>
            <input type="password" required minLength={6} className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Spinner className="h-4 w-4" /> : 'Update password'}
          </button>
        </form>
      </div>

      {(user?.role === 'admin' || user?.role === 'super_admin') && <EstateSettingsCard estateId={user.estate_id ?? undefined} />}
    </div>
  )
}

interface EmergencyContact {
  name: string
  email: string
  phone: string
}

function EstateSettingsCard({ estateId }: { estateId?: string }) {
  const [policeEmail, setPoliceEmail] = useState('')
  const [policePhone, setPolicePhone] = useState('')
  const [contacts, setContacts] = useState<EmergencyContact[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!estateId) return
    setLoading(true)
    getEstate(estateId)
      .then((estate) => {
        setPoliceEmail((estate.settings?.police_email as string) || '')
        setPolicePhone((estate.settings?.police_phone as string) || '')
        const raw = (estate.settings?.emergencyContacts as EmergencyContact[]) || []
        setContacts(raw.length ? raw : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [estateId])

  function updateContact(index: number, field: keyof EmergencyContact, value: string) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  function addContact() {
    setContacts((prev) => [...prev, { name: '', email: '', phone: '' }])
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!estateId) return
    setError('')
    setSuccess(false)
    setSaving(true)
    try {
      // Drop blank rows (e.g. an "Add contact" row left empty) before saving.
      const cleanContacts = contacts.filter((c) => c.name.trim() || c.email.trim() || c.phone.trim())
      await updateEstateSettings(estateId, { police_email: policeEmail, police_phone: policePhone, emergencyContacts: cleanContacts })
      setContacts(cleanContacts)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-midnight-900 mb-1">Estate settings</h3>
      <p className="text-sm text-midnight-400 mb-4">
        Who your admins and guards can reach when something urgent happens — email for a record, phone for a one-tap call.
      </p>
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3 mb-4">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3 mb-4">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>Saved.</span>
        </div>
      )}
      {loading ? (
        <Spinner className="h-5 w-5 text-royal" />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">Police contact</label>
            <p className="text-xs text-midnight-400 mb-2">
              The email is for "Notify police" on a high/critical alert; the phone number powers a one-tap "Call police" button on the Alerts page.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="email"
                className="input"
                placeholder="police@example.com"
                value={policeEmail}
                onChange={(e) => setPoliceEmail(e.target.value)}
              />
              <input
                className="input"
                placeholder="+234... (for calling)"
                value={policePhone}
                onChange={(e) => setPolicePhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Emergency contacts</label>
              <button type="button" onClick={addContact} className="text-royal text-xs font-semibold hover:underline inline-flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Add contact
              </button>
            </div>
            <p className="text-xs text-midnight-400 mb-3">
              Emailed when a high/critical alert (panic, fire, medical, security breach) is raised — separate from incidents, which already notify your admins and guards automatically.
            </p>
            {contacts.length === 0 ? (
              <p className="text-sm text-midnight-400 italic">No emergency contacts yet.</p>
            ) : (
              <div className="space-y-2">
                {contacts.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Name"
                      value={c.name}
                      onChange={(e) => updateContact(i, 'name', e.target.value)}
                    />
                    <input
                      type="email"
                      className="input flex-1"
                      placeholder="email@example.com"
                      value={c.email}
                      onChange={(e) => updateContact(i, 'email', e.target.value)}
                    />
                    <input
                      className="input flex-1"
                      placeholder="+234... (optional)"
                      value={c.phone}
                      onChange={(e) => updateContact(i, 'phone', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      className="shrink-0 text-alert-600 hover:text-alert-700 px-2"
                      aria-label="Remove contact"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Spinner className="h-4 w-4" /> : 'Save'}
          </button>
        </form>
      )}
    </div>
  )
}
