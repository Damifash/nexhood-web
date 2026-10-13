// Estate money (bills, payments, expenses, statement) and repair requests.
import { api } from './api'

function errMsg(e: unknown, fallback: string) {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (!detail) return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg).replace(/^Value error, /, '') : '')).filter(Boolean).join('; ') || fallback
  }
  return fallback
}

async function call<T>(p: Promise<{ data: T }>, fallback: string): Promise<T> {
  try {
    const { data } = await p
    return data
  } catch (e) {
    throw new Error(errMsg(e, fallback))
  }
}

export type ChargeCategory = 'service_charge' | 'security' | 'power' | 'water' | 'waste' | 'special' | 'other'
export type ExpenseCategory = 'diesel_power' | 'security_salaries' | 'repairs' | 'cleaning_waste' | 'water' | 'admin' | 'other'
export type RepairCategory = 'plumbing' | 'electrical' | 'roof_building' | 'road' | 'drainage' | 'waste' | 'gate_fence' | 'water' | 'other'
export type RepairStatus = 'reported' | 'assigned' | 'in_progress' | 'fixed' | 'closed'

export const CHARGE_LABEL: Record<ChargeCategory, string> = {
  service_charge: 'Service charge', security: 'Security levy', power: 'Power / diesel', water: 'Water', waste: 'Waste', special: 'Special levy', other: 'Other',
}
export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  diesel_power: 'Diesel & power', security_salaries: 'Security salaries', repairs: 'Repairs & maintenance', cleaning_waste: 'Cleaning & waste', water: 'Water', admin: 'Admin & bank charges', other: 'Other',
}
export const REPAIR_LABEL: Record<RepairCategory, string> = {
  plumbing: 'Plumbing / pipes', electrical: 'Electrical / lights', roof_building: 'Roof / building', road: 'Road', drainage: 'Drainage', waste: 'Waste', gate_fence: 'Gate / fence', water: 'Water / borehole', other: 'Other',
}

export interface FinanceSettings {
  bank_name?: string | null
  account_name?: string | null
  account_number?: string | null
  approval_threshold: number
  approver?: { id: string; name?: string | null } | null
}
export interface Unit {
  id: string
  label: string
  unit_type?: string | null
  owner_name?: string | null
  credit: number
  balance_due: number
  occupants: { id: string; name: string; role: string }[]
  payer?: { id: string; name: string } | null
  active: boolean
}
export interface Charge {
  id: string
  name: string
  category: ChargeCategory
  amount: number
  frequency: 'one_off' | 'monthly' | 'quarterly' | 'yearly'
  type_amounts?: Record<string, number> | null
  active: boolean
}
export interface Invoice {
  id: string
  unit_id: string
  unit_label: string
  title: string
  category: ChargeCategory
  period: string
  amount: number
  amount_paid: number
  balance: number
  status: 'unpaid' | 'part_paid' | 'paid' | 'void'
  due_date: string
  overdue: boolean
  paid_from_credit?: number
}
export interface Payment {
  id: string
  unit_id: string
  unit_label: string
  invoice_id?: string | null
  payer_name?: string | null
  amount: number
  method: 'bank_transfer' | 'cash' | 'pos' | 'paystack'
  reference?: string | null
  note?: string | null
  status: 'pending' | 'confirmed' | 'rejected' | 'failed'
  fee?: number
  reject_reason?: string | null
  to_credit?: number
  created_at: string
  has_proof: boolean
}
export interface Expense {
  id: string
  category: ExpenseCategory
  amount: number
  vendor?: string | null
  description: string
  date: string
  status: 'approved' | 'pending_approval' | 'rejected' | 'void'
  self_approved?: boolean
  created_by_name?: string | null
  approved_by_name?: string | null
  void_reason?: string | null
  reject_reason?: string | null
  request_title?: string | null
  has_receipt: boolean
}
export interface Statement {
  month: string
  opening_balance: number
  collected: number
  spent: number
  closing_balance: number
  spending: { category: ExpenseCategory; label: string; total: number; count: number }[]
  billed_this_month: number
  collection_rate_pct: number | null
  outstanding_total: number
  units_total: number
  units_owing: number
  pending_approval: number | null
}
export interface ArrearsRow {
  unit_id: string
  label: string
  due: number
  bills: number
  oldest_due: string
}
export interface MyFinance {
  units: { id: string; label: string; credit: number; balance_due: number; is_payer: boolean }[]
  bank: { bank_name?: string | null; account_name?: string | null; account_number?: string | null }
  pending_payments: number
}
export interface Repair {
  id: string
  category: RepairCategory
  title: string
  description: string
  location?: string | null
  visibility: 'estate' | 'management'
  status: RepairStatus
  reporter_name?: string | null
  reporter_unit?: string | null
  assigned_to?: string | null
  me_too_count: number
  image_count?: number
  me_too_mine: boolean
  mine: boolean
  cost: number | null
  updates?: { by?: string; status?: string | null; note?: string | null; at: string }[]
  created_at: string
}

export const naira = (n: number | null | undefined) => `₦${Math.round(Number(n || 0)).toLocaleString('en-NG')}`

// settings
export const getFinanceSettings = () => call<FinanceSettings>(api.get('/api/finance/settings'), 'Could not load finance settings')
export const updateFinanceSettings = (body: Partial<{ bank_name: string; account_name: string; account_number: string; approver_user_id: string | null; approval_threshold: number }>) =>
  call<FinanceSettings>(api.patch('/api/finance/settings', body), 'Could not save finance settings')
// units
export const listUnits = () => call<Unit[]>(api.get('/api/units'), 'Could not load units')
export const createUnit = (body: { label: string; unit_type?: string; owner_name?: string; occupant_user_ids?: string[]; payer_user_id?: string }) =>
  call<Unit>(api.post('/api/units', body), 'Could not add unit')
export const updateUnit = (id: string, body: Partial<{ label: string; unit_type: string; owner_name: string; occupant_user_ids: string[]; payer_user_id: string | null; active: boolean }>) =>
  call<Unit>(api.patch(`/api/units/${id}`, body), 'Could not update unit')
export const importUnits = () => call<{ created: number; linked: number }>(api.post('/api/units/import-from-residents'), 'Could not import units')
// charges & invoices
export const listCharges = () => call<Charge[]>(api.get('/api/charges'), 'Could not load bill types')
export const createCharge = (body: { name: string; category: ChargeCategory; amount: number; frequency: Charge['frequency']; type_amounts?: Record<string, number> }) =>
  call<Charge>(api.post('/api/charges', body), 'Could not add bill type')
export const updateCharge = (id: string, body: Partial<{ name: string; amount: number; active: boolean }>) => call<Charge>(api.patch(`/api/charges/${id}`, body), 'Could not update bill type')
export const issueBills = (id: string, body: { period: string; due_date: string }) =>
  call<{ issued: number; skipped: number }>(api.post(`/api/charges/${id}/issue`, body), 'Could not issue bills')
export const listInvoices = (params?: { status?: string; unit_id?: string; period?: string }) => call<Invoice[]>(api.get('/api/invoices', { params }), 'Could not load bills')
export const voidInvoice = (id: string) => call<{ message: string }>(api.post(`/api/invoices/${id}/void`), 'Could not cancel bill')
// payments
export const createPayment = (body: { amount: number; method: Payment['method']; reference?: string; invoice_id?: string; unit_id?: string; proof_image?: string; note?: string }) =>
  call<Payment>(api.post('/api/payments', body), 'Could not record payment')
export const listPayments = (params?: { status?: string }) => call<Payment[]>(api.get('/api/payments', { params }), 'Could not load payments')
export const getPaymentProof = (id: string) => call<{ proof_image: string | null }>(api.get(`/api/payments/${id}/proof`), 'Could not load receipt')
export const confirmPayment = (id: string) => call<{ message: string; to_credit: number }>(api.post(`/api/payments/${id}/confirm`), 'Could not confirm payment')
export const rejectPayment = (id: string, reason: string) => call<{ message: string }>(api.post(`/api/payments/${id}/reject`, { reason }), 'Could not update payment')
// expenses & statement
export const createExpense = (body: { category: ExpenseCategory; amount: number; vendor?: string; description: string; date: string; receipt_image?: string; request_id?: string }) =>
  call<Expense>(api.post('/api/expenses', body), 'Could not record expense')
export const listExpenses = (params?: { month?: string; status?: string }) => call<Expense[]>(api.get('/api/expenses', { params }), 'Could not load expenses')
export const getExpenseReceipt = (id: string) => call<{ receipt_image: string | null }>(api.get(`/api/expenses/${id}/receipt`), 'Could not load receipt')
export const approveExpense = (id: string) => call<{ message: string }>(api.post(`/api/expenses/${id}/approve`), 'Could not approve')
export const rejectExpense = (id: string, reason: string) => call<{ message: string }>(api.post(`/api/expenses/${id}/reject`, { reason }), 'Could not reject')
export const voidExpense = (id: string, reason: string) => call<{ message: string }>(api.post(`/api/expenses/${id}/void`, { reason }), 'Could not void expense')
export const getStatement = (month?: string) => call<Statement>(api.get('/api/finance/statement', { params: month ? { month } : {} }), 'Could not load statement')
export const getArrears = () => call<ArrearsRow[]>(api.get('/api/finance/arrears'), 'Could not load arrears')
export const getMyFinance = () => call<MyFinance>(api.get('/api/finance/me'), 'Could not load your bills')
export interface FinanceSetup {
  bank: boolean
  units: number
  units_untyped: number
  untyped_labels: string[]
  price_types: string[]
  charges: number
  invoices: number
  paystack: boolean
  approver: boolean
}
export const getFinanceSetup = () => call<FinanceSetup>(api.get('/api/finance/setup'), 'Could not load setup')
export const sendReminders = (unit_id?: string) =>
  call<{ sent: number; skipped: number }>(api.post('/api/finance/remind', unit_id ? { unit_id } : {}), 'Could not send reminders')
// repairs
export const listRepairs = (params?: { status?: string }) => call<Repair[]>(api.get('/api/repairs', { params }), 'Could not load repair requests')
export const createRepair = (body: { category: RepairCategory; title: string; description: string; location?: string; visibility: 'estate' | 'management'; images?: string[] }) =>
  call<Repair>(api.post('/api/repairs', body), 'Could not send repair request')
export const repairMeToo = (id: string) => call<Repair>(api.post(`/api/repairs/${id}/me-too`), 'Could not update')
export const updateRepair = (id: string, body: { status?: RepairStatus; assigned_to?: string; note?: string }) =>
  call<Repair>(api.patch(`/api/repairs/${id}`, body), 'Could not update request')
export const getRepairImages = (id: string) => call<{ images: string[] }>(api.get(`/api/repairs/${id}/images`), 'Could not load photos')

/** Shrink a photo before upload (receipts don't need 12MP) — keeps the
 * free database small. Returns a JPEG data URL. */
export async function compressImage(file: File, maxDim = 1400, quality = 0.7): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('That file is not an image we can read'))
      i.src = url
    })
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** "2026-10" -> "October 2026" */
export function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  if (!y || !mo) return m
  return new Date(y, mo - 1, 1).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
}

export function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ---------------- Paystack (online payments) ----------------
export interface PaystackStatus {
  enabled: boolean
  connected: boolean
  settlement: { bank_name?: string | null; account_name?: string | null; account_number?: string | null } | null
  fee_margin: number
}
export const getPaystackStatus = () => call<PaystackStatus>(api.get('/api/finance/paystack/status'), 'Could not check online payments')
export const getPaystackBanks = () => call<{ name: string; code: string }[]>(api.get('/api/finance/paystack/banks'), 'Could not load banks')
export const connectPaystack = (bank_code: string, account_number: string) =>
  call<PaystackStatus>(api.post('/api/finance/paystack/connect', { bank_code, account_number }), 'Could not connect the account')
export const quotePaystack = (amount: number) => call<{ amount: number; fee: number; total: number }>(api.get('/api/payments/paystack/quote', { params: { amount } }), 'Could not work out the fee')
export const startPaystack = (amount: number, invoice_id?: string) =>
  call<{ authorization_url: string; reference: string; amount: number; fee: number; total: number }>(api.post('/api/payments/paystack/init', { amount, invoice_id }), 'Could not start online payment')
export const verifyPaystack = (reference: string) => call<{ status: 'confirmed' | 'pending' | 'failed' }>(api.get('/api/payments/paystack/verify', { params: { reference } }), 'Could not check the payment')
