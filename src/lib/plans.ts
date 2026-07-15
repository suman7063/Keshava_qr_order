import type { Restaurant } from '@/types'

export type PlanId = 'free' | 'pro' | 'enterprise'

export interface PlanConfig {
  id: PlanId
  label: string
  priceMonthly: number // INR
  maxTables: number // Infinity = unlimited
  maxMenuItems: number
  perks: string[]
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    label: 'Starter',
    priceMonthly: 0,
    maxTables: 10,
    maxMenuItems: 50,
    perks: ['Up to 10 tables', 'Up to 50 menu items', 'Digital QR menu', 'QR code download'],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    priceMonthly: 499,
    maxTables: Infinity,
    maxMenuItems: Infinity,
    perks: ['Unlimited tables', 'Unlimited menu items', 'Kitchen display', 'Priority support'],
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    priceMonthly: 2499,
    maxTables: Infinity,
    maxMenuItems: Infinity,
    perks: ['Everything in Pro', 'Multiple outlets', 'Dedicated support'],
  },
}

export const TRIAL_DAYS = 14

/**
 * The plan whose limits actually apply right now.
 * A self-serve paid plan downgrades to free once its trial expires
 * (no payment gateway yet — superadmin-granted plans have no trial_ends_at).
 */
export function effectivePlan(restaurant: Pick<Restaurant, 'plan' | 'trial_ends_at'>): PlanConfig {
  const plan = PLANS[restaurant.plan as PlanId] ?? PLANS.free
  if (plan.id !== 'free' && restaurant.trial_ends_at && new Date(restaurant.trial_ends_at) < new Date()) {
    return PLANS.free
  }
  return plan
}
