import { NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/auth'
import { PLANS, type PlanId } from '@/lib/plans'

type Billing =
  | { status: 'paying'; plan: string }
  | { status: 'trial'; plan: string; trialDaysLeft: number }
  | { status: 'comp'; plan: string }
  | { status: 'free' }

const DAY = 24 * 60 * 60 * 1000
const price = (plan: string) => PLANS[plan as PlanId]?.priceMonthly ?? 0

// Revenue/business metrics for the platform owner (superadmin only).
export async function GET() {
  const ctx = await requireSuperadmin()
  if (ctx instanceof NextResponse) return ctx
  const db = ctx.db

  const [{ data: restaurants }, { data: subs }] = await Promise.all([
    db.from('restaurants').select('id, plan, trial_ends_at, status'),
    db.from('subscriptions').select('restaurant_id, plan, status'),
  ])

  // The active paying subscription per restaurant (if any).
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
      paying++
      mrr += price(sub.plan || r.plan)
      billing[r.id] = { status: 'paying', plan: sub.plan || r.plan }
      continue
    }
    const trialMs = r.trial_ends_at ? new Date(r.trial_ends_at).getTime() : 0
    if (r.plan !== 'free' && trialMs > nowMs) {
      onTrial++
      const daysLeft = Math.ceil((trialMs - nowMs) / DAY)
      if (daysLeft <= 3) trialsEndingSoon++
      billing[r.id] = { status: 'trial', plan: r.plan, trialDaysLeft: daysLeft }
      continue
    }
    if (r.plan !== 'free') {
      // Paid plan, no active subscription, no live trial → superadmin-granted (comp).
      comped++
      billing[r.id] = { status: 'comp', plan: r.plan }
      continue
    }
    billing[r.id] = { status: 'free' }
  }

  return NextResponse.json({
    mrr,          // ₹ / month from actually-paying subscriptions
    paying,       // restaurants with an active Razorpay subscription
    onTrial,      // restaurants inside their free trial
    trialsEndingSoon, // trials ending within 3 days
    comped,       // paid plan granted by superadmin, not paying
    churned,      // cancelled/halted/completed subscriptions
    billing,      // per-restaurant status for the table badges
  })
}
