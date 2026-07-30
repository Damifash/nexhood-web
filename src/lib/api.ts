import axios from 'axios'
import type {
  AdminDashboard,
  Alert,
  Estate,
  Incident,
  Post,
  ResidentDashboard,
  User,
  VisitorPass,
  WelfareCampaign,
} from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexhood_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('nexhood_token')
      localStorage.removeItem('nexhood_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

function errMsg(e: unknown, fallback: string) {
  const err = e as { response?: { data?: { detail?: unknown } } }
  const detail = err?.response?.data?.detail
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  // FastAPI's automatic 422 validation errors (missing/invalid body fields)
  // return "detail" as a list of {loc, msg, type} objects, not a string.
  // Passing that straight into `new Error(...)` stringified the array of
  // objects into the literal text "[object Object]" — this pulls the
  // actual human-readable message out instead.
  if (Array.isArray(detail)) {
    const msgs = detail.map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : JSON.stringify(d)))
    return msgs.join('; ') || fallback
  }
  return fallback
}

// ---------- Auth ----------
export interface RegisterPayload {
  name: string
  email: string
  phone: string
  password: string
  role: 'resident'
  estate_id: string // estate name on register (backend auto-creates)
}

export async function registerUser(payload: RegisterPayload) {
  try {
    const { data } = await api.post('/api/auth/register', payload)
    return data as { message: string; token: string; user: User }
  } catch (e) {
    throw new Error(errMsg(e, 'Registration failed'))
  }
}

export async function loginUser(email: string, password: string) {
  try {
    const { data } = await api.post('/api/auth/login', { email, password })
    return data as { message: string; token: string; user: User }
  } catch (e) {
    throw new Error(errMsg(e, 'Invalid email or password'))
  }
}

export async function fetchMe() {
  const { data } = await api.get('/api/users/me')
  return data as User
}

export async function updateMyProfile(payload: { name?: string; phone?: string; email?: string; apartment?: string }) {
  try {
    const { data } = await api.patch('/api/users/me', payload)
    return data as User
  } catch (e) {
    throw new Error(errMsg(e, 'Could not update profile'))
  }
}

export async function updateEstateProfile(id: string, payload: { name?: string; address?: string }) {
  try {
    const { data } = await api.patch(`/api/estates/${id}`, payload)
    return data.estate as Estate
  } catch (e) {
    throw new Error(errMsg(e, 'Could not update estate'))
  }
}

export async function forgotPassword(email: string) {
  try {
    const { data } = await api.post('/api/auth/forgot-password', { email })
    return data as { message: string }
  } catch (e) {
    throw new Error(errMsg(e, 'Something went wrong'))
  }
}

export async function resetPassword(token: string, new_password: string) {
  try {
    const { data } = await api.post('/api/auth/reset-password', { token, new_password })
    return data as { message: string }
  } catch (e) {
    throw new Error(errMsg(e, 'Could not reset password'))
  }
}

export async function changePassword(old_password: string, new_password: string) {
  try {
    const { data } = await api.patch('/api/users/me/password', { old_password, new_password })
    return data
  } catch (e) {
    throw new Error(errMsg(e, 'Could not change password'))
  }
}

// ---------- Estates ----------
export async function createEstate(payload: { name: string; address: string }) {
  const { data } = await api.post('/api/estates', payload)
  return data.estate as Estate
}

export async function getEstate(id: string) {
  const { data } = await api.get(`/api/estates/${id}`)
  return data.estate as Estate
}

export async function updateEstateSettings(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`/api/estates/${id}/settings`, payload)
  return data.estate as Estate
}

// ---------- Visitor Passes ----------
export interface VisitorPassPayload {
  visitor_name: string
  visitor_phone?: string
  purpose?: string
  valid_from: string
  valid_until: string
  entry_gate?: string
}

export async function createVisitorPass(payload: VisitorPassPayload) {
  try {
    const { data } = await api.post('/api/visitor-passes', payload)
    return data.visitor_pass as VisitorPass
  } catch (e) {
    throw new Error(errMsg(e, 'Could not create visitor pass'))
  }
}

export async function listVisitorPasses(params?: { status?: string }) {
  const { data } = await api.get('/api/visitor-passes', { params })
  return data as VisitorPass[]
}

export async function validateVisitorPass(code: string) {
  try {
    const { data } = await api.post(`/api/visitor-passes/${code}/validate`, {})
    return data.visitor_pass as VisitorPass
  } catch (e) {
    throw new Error(errMsg(e, 'Invalid or expired code'))
  }
}

// ---------- Incidents ----------
export interface IncidentPayload {
  type: string
  severity: string
  title: string
  description: string
}

export async function createIncident(payload: IncidentPayload) {
  try {
    const { data } = await api.post('/api/incidents', payload)
    return data.incident as Incident
  } catch (e) {
    throw new Error(errMsg(e, 'Could not report incident'))
  }
}

export async function listIncidents(params?: { status?: string; type?: string; severity?: string }) {
  const { data } = await api.get('/api/incidents', { params })
  return data as Incident[]
}

export async function getIncident(id: string) {
  const { data } = await api.get(`/api/incidents/${id}`)
  return data as Incident
}

export async function updateIncident(id: string, params: { status?: string; response?: string }) {
  const { data } = await api.patch(`/api/incidents/${id}`, null, { params })
  return data.incident as Incident
}

export async function resolveIncident(id: string) {
  const { data } = await api.patch(`/api/incidents/${id}/resolve`)
  return data
}

// ---------- Alerts ----------
export interface AlertPayload {
  type: string
  message?: string
  priority: string
}

export async function createAlert(payload: AlertPayload) {
  try {
    const { data } = await api.post('/api/alerts', payload)
    return data.alert as Alert
  } catch (e) {
    throw new Error(errMsg(e, 'Could not send alert'))
  }
}

export async function listAlerts(params?: { status?: string; type?: string; priority?: string }) {
  const { data } = await api.get('/api/alerts', { params })
  return data as Alert[]
}

export async function acknowledgeAlert(id: string) {
  try {
    const { data } = await api.patch(`/api/alerts/${id}/acknowledge`)
    return data.alert as Alert
  } catch (e) {
    throw new Error(errMsg(e, 'Could not acknowledge alert'))
  }
}

export async function resolveAlert(id: string) {
  try {
    const { data } = await api.patch(`/api/alerts/${id}/resolve`)
    return data.alert as Alert
  } catch (e) {
    throw new Error(errMsg(e, 'Could not resolve alert'))
  }
}

export async function notifyPolice(alert_id: string) {
  try {
    const { data } = await api.post('/api/police/integration', { alert_id })
    return data as { message: string; status: string; recipients: number }
  } catch (e) {
    throw new Error(errMsg(e, 'Could not notify police'))
  }
}

// ---------- Users / Admin ----------
export async function listUsers() {
  const { data } = await api.get('/api/users')
  return data as User[]
}

export async function inviteUser(payload: { name: string; email: string; phone: string; role: string; apartment?: string }) {
  try {
    const { data } = await api.post('/api/users/invite', payload)
    return data as { message: string; email: string; temp_password: string | null; emailed: boolean }
  } catch (e) {
    throw new Error(errMsg(e, 'Could not invite user'))
  }
}

export async function bulkInviteUsers(file: File) {
  const form = new FormData()
  form.append('file', file)
  try {
    const { data } = await api.post('/api/users/bulk-invite', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data as { message: string; results: { email: string; status: string; reason?: string; temp_password?: string | null }[] }
  } catch (e) {
    throw new Error(errMsg(e, 'Bulk invite failed'))
  }
}

export async function changeUserRole(id: string, new_role: string) {
  try {
    const { data } = await api.patch(`/api/users/${id}/role`, null, { params: { new_role } })
    return data
  } catch (e) {
    throw new Error(errMsg(e, 'Could not change role'))
  }
}

export async function updateUser(id: string, params: { is_active?: boolean; apartment?: string; role?: string }) {
  const { data } = await api.patch(`/api/users/${id}`, null, { params })
  return data
}

export async function deleteUser(id: string) {
  try {
    const { data } = await api.delete(`/api/users/${id}`)
    return data
  } catch (e) {
    throw new Error(errMsg(e, 'Could not delete user'))
  }
}

// ---------- Analytics ----------
export async function getDashboard() {
  const { data } = await api.get('/api/analytics/dashboard')
  return data as AdminDashboard | ResidentDashboard
}

// ---------- Community ----------
export async function listPosts() {
  const { data } = await api.get('/api/community/posts')
  return data as Post[]
}

export async function createPost(payload: { content: string; type: string; images?: string[] }) {
  try {
    const { data } = await api.post('/api/community/posts', payload)
    return data.post as Post
  } catch (e) {
    throw new Error(errMsg(e, 'Could not post'))
  }
}

export async function uploadImage(file: File) {
  const form = new FormData()
  form.append('file', file)
  try {
    const { data } = await api.post('/api/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data as { image_url: string }
  } catch (e) {
    throw new Error(errMsg(e, 'Could not upload image'))
  }
}

export async function replyToPost(postId: string, content: string) {
  const { data } = await api.post(`/api/community/posts/${postId}/reply`, { content })
  return data
}

export async function likePost(postId: string) {
  const { data } = await api.patch(`/api/community/posts/${postId}/like`)
  return data as { message: string; likes: number }
}

// ---------- Welfare ----------
export async function listCampaigns() {
  const { data } = await api.get('/api/welfare/campaigns')
  return data as WelfareCampaign[]
}

export async function createCampaign(payload: { title: string; description?: string; for_role: 'guards' | 'police' | 'general'; goal_amount?: number }) {
  try {
    const { data } = await api.post('/api/welfare/campaigns', payload)
    return data.campaign as WelfareCampaign
  } catch (e) {
    throw new Error(errMsg(e, 'Could not create campaign'))
  }
}

export async function donate(amount: number, for_role: 'guards' | 'police', campaign_id?: string) {
  try {
    const { data } = await api.post('/api/welfare/donate', { amount, for_role, campaign_id })
    return data as { paystack_link: string; donation_id: string; status: string }
  } catch (e) {
    throw new Error(errMsg(e, 'Could not start donation'))
  }
}

export interface PendingDonation {
  id: string
  amount: number
  for_role: 'guards' | 'police'
  donor_name?: string
  campaign_id?: string | null
  timestamp: string
  status: string
}

export async function listPendingDonations() {
  const { data } = await api.get('/api/welfare/donations/pending')
  return data as PendingDonation[]
}

export async function verifyDonation(id: string) {
  try {
    const { data } = await api.patch(`/api/welfare/donations/${id}/verify`)
    return data
  } catch (e) {
    throw new Error(errMsg(e, 'Could not verify donation'))
  }
}

export { API_URL }
