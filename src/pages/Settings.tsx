import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Plus, Trash2, Pencil, X, Sun, Moon, Monitor } from 'lucide-react'
import { changePassword, getEstate, listUsers, updateEstateSettings, updateMyProfile, updateEstateProfile } from '@/lib/api'
import { connectPaystack, getFinanceSettings, getPaystackBanks, getPaystackStatus, updateFinanceSettings, type PaystackStatus } from '@/lib/finance'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { AlertSetupCard } from '@/components/alerts/AlertSetupCard'
import { useTheme, type ThemeChoice } from '@/context/ThemeContext'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="Settings" subtitle="Manage your profile and account security." />

      <AlertSetupCard />

      <ThemeCard />

      <ProfileCard />

      <PasswordCard />

      {(user?.role === 'admin' || user?.role === 'super_admin') && <EstateSettingsCard estateId={user.estate_id ?? undefined} />}

      {(user?.role === 'admin' || user?.role === 'super_admin') && <FinanceSettingsCard />}

      {(user?.role === 'admin' || user?.role === 'super_admin') && <PaystackCard />}
    </div>
  )
}

function ProfileCard() {
  const { user, setUser } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [email, setEmail] = useState(user?.email || '')
  const [apartment, setApartment] = useState(user?.apartment || '')
  const [estateName, setEstateName] = useState(user?.estate_name || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function startEdit() {
    setName(user?.name || '')
    setPhone(user?.phone || '')
    setEmail(user?.email || '')
    setApartment(user?.apartment || '')
    setEstateName(user?.estate_name || '')
    setCurrentPassword('')
    setError('')
    setSuccess(false)
    setEditing(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      const emailChanged = email.trim().toLowerCase() !== (user.email || '').toLowerCase()
      const updated = await updateMyProfile({
        name,
        phone,
        email,
        apartment: apartment || undefined,
        current_password: emailChanged ? currentPassword : undefined,
      })
      let mergedUser = updated

      // Estate name is a separate resource (admin-only), saved alongside
      // the profile form for convenience but hitting its own endpoint.
      if (isAdmin && user.estate_id && estateName.trim() && estateName.trim() !== user.estate_name) {
        await updateEstateProfile(user.estate_id, { name: estateName.trim() })
        mergedUser = { ...mergedUser, estate_name: estateName.trim() }
      }

      setUser(mergedUser)
      setSuccess(true)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-midnight-900">Profile</h3>
        {!editing && (
          <button onClick={startEdit} className="btn-outline text-xs px-3 py-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3 mb-4">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {success && !editing && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3 mb-4">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>Profile updated.</span>
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input required minLength={2} className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input required className="input" placeholder="08012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          {email.trim().toLowerCase() !== (user?.email || '').toLowerCase() && (
            <div>
              <label className="label">Current password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input"
                placeholder="Needed to change your email"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="label">Apartment / house number</label>
            <input className="input" placeholder="Optional" value={apartment} onChange={(e) => setApartment(e.target.value)} />
          </div>
          {isAdmin && (
            <div>
              <label className="label">Estate name</label>
              <input minLength={2} className="input" value={estateName} onChange={(e) => setEstateName(e.target.value)} />
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <Spinner className="h-4 w-4" /> : 'Save changes'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-outline">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <dt className="text-midnight-400">Name</dt>
          <dd className="text-midnight-800 font-medium">{user?.name}</dd>
          <dt className="text-midnight-400">Email</dt>
          <dd className="text-midnight-800 font-medium">{user?.email}</dd>
          <dt className="text-midnight-400">Phone</dt>
          <dd className="text-midnight-800 font-medium">{user?.phone}</dd>
          {user?.apartment && (
            <>
              <dt className="text-midnight-400">Apartment</dt>
              <dd className="text-midnight-800 font-medium">{user.apartment}</dd>
            </>
          )}
          <dt className="text-midnight-400">Role</dt>
          <dd><Badge tone="royal">{user?.role.replace('_', ' ')}</Badge></dd>
          <dt className="text-midnight-400">Estate</dt>
          <dd className="text-midnight-800 font-medium">{user?.estate_name || '—'}</dd>
        </dl>
      )}

      {!editing && user?.badges && user.badges.length > 0 && (
        <div className="mt-5 pt-5 border-t border-midnight-50">
          <p className="text-xs uppercase tracking-wide text-midnight-400 font-semibold mb-2">Badges earned</p>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(user.badges.map((b) => b.badge))).map((name) => (
              <Badge key={name} tone="alert">{name}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PasswordCard() {
  const { setSessionToken } = useAuth()
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
      const res = await changePassword(oldPassword, newPassword)
      // Other phones/computers are signed out; keep this one signed in.
      if (res?.token) setSessionToken(res.token)
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
    <div className="card p-6">
      <h3 className="font-display font-semibold text-midnight-900 mb-4">Change password</h3>
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-alert-50 text-alert-700 text-sm px-4 py-3 mb-4">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm px-4 py-3 mb-4">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> <span>Password updated. Any other phone or computer signed in to your account has been logged out.</span>
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
  )
}

interface EmergencyContact {
  name: string
  phone: string
}

function EstateSettingsCard({ estateId }: { estateId?: string }) {
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
        setPolicePhone((estate.settings?.police_phone as string) || '')
        const raw = (estate.settings?.emergencyContacts as Partial<EmergencyContact>[]) || []
        setContacts(raw.map((c) => ({ name: c.name || '', phone: c.phone || '' })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [estateId])

  function updateContact(index: number, field: keyof EmergencyContact, value: string) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  function addContact() {
    setContacts((prev) => [...prev, { name: '', phone: '' }])
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
      const cleanContacts = contacts.filter((c) => c.name.trim() || c.phone.trim())
      if (cleanContacts.some((c) => !c.phone.trim())) {
        setError('Every emergency contact needs a phone number.')
        setSaving(false)
        return
      }
      await updateEstateSettings(estateId, { police_phone: policePhone, emergencyContacts: cleanContacts })
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
        The numbers everyone can call in one tap during an emergency.
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
            <label className="label" htmlFor="police-phone">Police phone number</label>
            <p className="text-xs text-midnight-400 mb-2">
              Optional. Your nearest police division or patrol, if you have one. It becomes the “Call police” button on the Alerts page; without it, the button calls 112.
            </p>
            <input
              id="police-phone"
              type="tel"
              inputMode="tel"
              className="input"
              placeholder="0803 000 0000"
              value={policePhone}
              onChange={(e) => setPolicePhone(e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Emergency contacts</label>
              <button type="button" onClick={addContact} className="text-royal text-xs font-semibold hover:underline inline-flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Add contact
              </button>
            </div>
            <p className="text-xs text-midnight-400 mb-3">
              For example the estate chairman, facility manager or a nearby clinic. They show as one-tap call buttons on the Alerts page.
            </p>
            {contacts.length === 0 ? (
              <p className="text-sm text-midnight-400 italic">No emergency contacts yet.</p>
            ) : (
              <div className="space-y-2">
                {contacts.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input flex-1 min-w-0"
                      placeholder="Name or role"
                      aria-label="Contact name"
                      value={c.name}
                      onChange={(e) => updateContact(i, 'name', e.target.value)}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      className="input flex-1 min-w-0"
                      placeholder="0803 000 0000"
                      aria-label="Contact phone number"
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

function FinanceSettingsCard() {
  const [loaded, setLoaded] = useState(false)
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ bank_name: '', account_name: '', account_number: '', approval_threshold: '100000', approver_user_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([getFinanceSettings(), listUsers()])
      .then(([f, users]) => {
        setForm({
          bank_name: f.bank_name || '', account_name: f.account_name || '', account_number: f.account_number || '',
          approval_threshold: String(f.approval_threshold ?? 100000), approver_user_id: f.approver?.id || '',
        })
        setAdmins(users.filter((u) => u.role === 'admin').map((u) => ({ id: u.id, name: u.name })))
      })
      .catch(() => setError('Could not load estate money settings'))
      .finally(() => setLoaded(true))
  }, [])

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await updateFinanceSettings({
        bank_name: form.bank_name, account_name: form.account_name, account_number: form.account_number,
        approval_threshold: Number(form.approval_threshold) || 0, approver_user_id: form.approver_user_id || null,
      })
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="card p-6 space-y-4" aria-labelledby="fin-h">
      <div>
        <h3 id="fin-h" className="font-display font-semibold text-midnight-900">Estate money</h3>
        <p className="text-sm text-midnight-400 mt-1">Where residents pay, and who must approve big spending. Money goes straight to this account; NexHood never holds it.</p>
      </div>
      {!loaded ? <Spinner className="h-5 w-5 text-royal" /> : (
        <>
          {error && <p className="text-sm text-alert-600" role="alert">{error}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="f-bank">Bank</label>
              <input id="f-bank" className="input" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. GTBank" />
            </div>
            <div>
              <label className="label" htmlFor="f-acn">Account number</label>
              <input id="f-acn" className="input" inputMode="numeric" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="f-acname">Account name</label>
            <input id="f-acname" className="input" value={form.account_name} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="Maraba Estate Residents Association" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="f-th">Approval needed from (₦)</label>
              <input id="f-th" className="input" type="number" min={0} value={form.approval_threshold} onChange={(e) => setForm({ ...form, approval_threshold: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="f-ap">Who approves big spending</label>
              <select id="f-ap" className="input" value={form.approver_user_id} onChange={(e) => setForm({ ...form, approver_user_id: e.target.value })}>
                <option value="">Any other admin</option>
                {admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-midnight-400">
            Spending at or above the limit waits for the approver before it shows in the estate statement. If the approver records it themselves, it's marked so residents can see that too.
          </p>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? <Spinner className="h-4 w-4" /> : 'Save'}</button>
            {saved && <span className="text-sm text-emerald-700">Saved</span>}
          </div>
        </>
      )}
    </form>
  )
}

function PaystackCard() {
  const [st, setSt] = useState<PaystackStatus | null>(null)
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([])
  const [bank, setBank] = useState('')
  const [acct, setAcct] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    getPaystackStatus().then((s) => {
      setSt(s)
      if (s.enabled) getPaystackBanks().then(setBanks).catch(() => {})
    }).catch(() => {})
  }, [])

  if (!st) return null

  async function connect(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setSt(await connectPaystack(bank, acct))
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div>
        <h3 className="font-display font-semibold text-midnight-900">Online payments (Paystack)</h3>
        <p className="text-sm text-midnight-400 mt-1">
          Let residents pay by card, transfer or USSD inside NexHood. Money settles straight into the estate account below, usually the next working day, and bills update automatically.
        </p>
      </div>
      {!st.enabled ? (
        <p className="rounded-xl bg-midnight-50 text-midnight-600 text-sm px-4 py-3">Online payments are coming soon. For now residents pay by transfer and you confirm it.</p>
      ) : st.connected && !editing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3">
          <p className="text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Connected: {st.settlement?.account_name} · {st.settlement?.bank_name} · {st.settlement?.account_number}
          </p>
          <button type="button" className="text-xs font-semibold text-royal" onClick={() => setEditing(true)}>Change account</button>
        </div>
      ) : (
        <form onSubmit={connect} className="space-y-3">
          {error && <p className="text-sm text-alert-600" role="alert">{error}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ps-bank">Bank</label>
              <select id="ps-bank" required className="input" value={bank} onChange={(e) => setBank(e.target.value)}>
                <option value="">Choose bank…</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="ps-acct">Account number</label>
              <input id="ps-acct" required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} className="input" value={acct} onChange={(e) => setAcct(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          <p className="text-xs text-midnight-400">We check the account name with the bank before saving. Use the estate's own account, not a personal one.</p>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? <Spinner className="h-4 w-4" /> : 'Connect account'}</button>
        </form>
      )}
    </div>
  )
}

function ThemeCard() {
  const { choice, setChoice } = useTheme()
  const options: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Night', icon: Moon },
    { value: 'system', label: 'Same as phone', icon: Monitor },
  ]
  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-midnight-900">Appearance</h3>
      <p className="text-sm text-midnight-500 mt-1 mb-4">Night mode is easier on the eyes for guards on night shift.</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => {
          const Icon = o.icon
          const active = choice === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setChoice(o.value)}
              aria-pressed={active}
              className={`rounded-xl border px-2 py-3 text-xs font-medium flex flex-col items-center gap-1.5 transition-colors ${
                active ? 'border-royal bg-royal-50 text-royal' : 'border-midnight-200 text-midnight-600 hover:bg-midnight-50'
              }`}
            >
              <Icon className="h-5 w-5" />
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
