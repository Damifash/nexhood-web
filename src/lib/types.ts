export type Role = 'resident' | 'guard' | 'admin' | 'super_admin' | 'police'

export interface Badge {
  badge: string
  awarded_at: string
}

export interface User {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  estate_id?: string | null
  estate_name?: string
  apartment?: string | null
  is_active: boolean
  last_seen: string
  created_at: string
  badges: Badge[]
}

export interface Estate {
  id: string
  name: string
  address: string
  settings?: Record<string, unknown>
  subscription?: Record<string, unknown>
  admin_id?: string
}

export interface VisitorPass {
  id: string
  visitor_name: string
  visitor_phone?: string
  vehicle_details?: Record<string, unknown>
  purpose?: string
  valid_from: string
  valid_until: string
  entry_gate?: string
  code: string
  qr_code: string
  host_id: string
  host_name: string
  host_apartment: string
  estate_id: string
  status: 'active' | 'used' | 'expired'
  created_at: string
  used_at?: string
  used_by?: string
}

export interface Incident {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  location?: Record<string, unknown>
  images?: string[]
  // The backend doesn't set a default status at creation time — treat a
  // missing status as "reported" throughout the UI.
  status?: string
  reporter_id: string
  reporter_name?: string
  reporter_phone?: string
  estate_id: string
  created_at: string
  resolved_at?: string
  assigned_to?: string
  responses?: { user_id: string; message: string; timestamp: string }[]
}

export interface Alert {
  id: string
  type: string
  message?: string
  location?: Record<string, unknown>
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: string
  sender_id: string
  sender_name?: string
  sender_phone?: string
  sender_role: string
  estate_id: string
  created_at: string
  acknowledged_by: { user_id: string; role: string; timestamp: string }[]
  police_status?: string
}

export interface Post {
  id: string
  content: string
  type: 'event' | 'appreciation' | 'general'
  author_id: string
  author_name?: string
  author_apartment?: string | null
  author_role: string
  estate_id: string
  created_at: string
  images?: string[]
  likes: number
  liked_by: string[]
  replies: {
    author_id: string
    author_name?: string
    author_apartment?: string | null
    author_role: string
    content: string
    created_at: string
  }[]
}

export interface WelfareCampaign {
  id: string
  title: string
  description?: string
  for_role: 'guards' | 'police' | 'general'
  goal_amount?: number
  total_raised: number
  donor_count: number
  status: string
  created_at: string
}

export interface DashboardSummary {
  total_visitors: number
  active_incidents: number
  total_alerts: number
  active_alerts: number
  total_users: number
}

// Note: the backend's serialize_doc() renames ANY dict key literally named
// "_id" to "id" (it assumes "_id" always means a Mongo ObjectId). That also
// catches the "_id" produced by $group aggregations here, even though those
// are just date strings / incident type names, not ObjectIds. So despite
// what main.py's aggregation pipeline looks like, the JSON that actually
// reaches the browser has "id", not "_id". Keep these in sync with that.
export interface AdminDashboard {
  summary: DashboardSummary
  trends: {
    incidents: { id: string; count: number }[]
    visitors: { id: string; count: number }[]
  }
  distributions: {
    incident_types: { id: string; count: number }[]
    incident_severity_open: { id: string; count: number }[]
    users_by_role: { id: string; count: number }[]
    pass_status: { id: string; count: number }[]
    alert_status: { id: string; count: number }[]
    alert_types: { id: string; count: number }[]
  }
  engagement: {
    posts_last_30d: number
    welfare_raised_total: number
    active_campaigns: number
  }
  recent_activity: Record<string, unknown>[]
}

export interface ResidentDashboard {
  summary: DashboardSummary
  recentIncidents: Incident[]
}
