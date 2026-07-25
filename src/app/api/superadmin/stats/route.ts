import { NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/auth'
import { PLANS, type PlanId } from '@/lib/plans'

type Billing =
  | { status: 'paying'; plan: string }
  | { status: 'trial'; plan: string; trialDaysLeft: number }
  | { status: 'comp'; plan: string }
  | { status: 'free' }

interface Activity {
  orders: number
  tables: number
  lastActive: string | null
  gmv: number
}

const DAY = 24 * 60 * 60 * 1000
const price = (plan: string) => PLANS[plan as PlanId]?.priceMonthly ?? 0

// Revenue + activity metrics for the platform owner (superadmin only).
export async function GET() {
  const ctx = await requireSuperadmin()
  if (ctx instanceof NextResponse) return ctx
  const db = ctx.db

  const [{ data: restaurants }, { data: subs }, { data: orders }, { data: tables }] = await Promise.all([
    db.from('restaurants').select('id, plan, trial_ends_at, status, created_at'),
    db.from('subscriptions').select('restaurant_id, plan, status'),
    db.from('orders').select('restaurant_id, created_at, total_amount, status'),
    db.from('restaurant_tables').select('restaurant_id'),
  ])

  // ── Billing / revenue ──────────────────────────────────────
  const activeSub = new Map<string, { plan: string }>()
  for (const s of subs ?? []) {
    if (s.status === 'active') activeSub.set(s.restaurant_id, { plan: s.plan })
  }
  const churned = (subs ?? []).filter(s => ['cancelled', 'halted', 'completed'].includes(s.status)).length

  let mrr = 0, paying = 0, onTrial = 0, trialsEndingSoon = 0, comped = 0
  const billing: Record<string, Billing> = {}
  const nowMs = Date.now()

  for (const r of restaurants ?? []) {
    const sub = activeSub.get(r.id)
    if (sub) {
      paying++; mrr += price(sub.plan || r.plan)
      billing[r.id] = { status: 'paying', plan: sub.plan || r.plan }; continue
    }
    const trialMs = r.trial_ends_at ? new Date(r.trial_ends_at).getTime() : 0
    if (r.plan !== 'free' && trialMs > nowMs) {
      onTrial++
      const daysLeft = Math.ceil((trialMs - nowMs) / DAY)
      if (daysLeft <= 3) trialsEndingSoon++
      billing[r.id] = { status: 'trial', plan: r.plan, trialDaysLeft: daysLeft }; continue
    }
    if (r.plan !== 'free') { comped++; billing[r.id] = { status: 'comp', plan: r.plan }; continue }
    billing[r.id] = { status: 'free' }
  }

  // ── Per-restaurant activity (Phase 2) + platform totals (Phase 4) ──
  const activity: Record<string, Activity> = {}
  for (const r of restaurants ?? []) activity[r.id] = { orders: 0, tables: 0, lastActive: null, gmv: 0 }
  for (const t of tables ?? []) {
    if (activity[t.restaurant_id]) activity[t.restaurant_id].tables++
  }
  let totalOrders = 0, gmv = 0
  for (const o of orders ?? []) {
    const a = activity[o.restaurant_id]
    if (!a) continue
    a.orders++
    totalOrders++
    if (o.status !== 'cancelled') { a.gmv += Number(o.total_amount) || 0; gmv += Number(o.total_amount) || 0 }
    if (!a.lastActive || o.created_at > a.lastActive) a.lastActive = o.created_at
  }

  // ── Signups over the last 6 months (Phase 4) ──
  const months: { month: string; label: string; count: number }[] = []
  const base = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    months.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      count: 0,
    })
  }
  const monthIndex = new Map(months.map((m, i) => [m.month, i]))
  for (const r of restaurants ?? []) {
    if (!r.created_at) continue
    const d = new Date(r.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const idx = monthIndex.get(key)
    if (idx !== undefined) months[idx].count++
  }

  const total = (restaurants ?? []).length
  const active = (restaurants ?? []).filter(r => r.status === 'active').length

  return NextResponse.json({
    mrr, paying, onTrial, trialsEndingSoon, comped, churned,
    total, active, totalOrders, gmv,
    signups: months,
    billing,
    activity,
  })
}
