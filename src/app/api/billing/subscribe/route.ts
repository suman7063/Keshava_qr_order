import { NextResponse } from 'next/server'
import { requireStaff, auditLog } from '@/lib/auth'
import { createRazorpay, razorpayConfigured } from '@/lib/razorpay'

// Start a Pro subscription for the current restaurant (admin only).
// Returns the Razorpay subscription id for the client-side Checkout.
export async function POST(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  if (!razorpayConfigured()) {
    return NextResponse.json(
      { error: 'Payments are not configured yet. Contact support to upgrade.' },
      { status: 503 }
    )
  }

  const { data: restaurant } = await ctx.db
    .from('restaurants')
    .select('id, name, plan, owner_email')
    .eq('id', ctx.restaurantId)
    .single()
  if (!restaurant) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  // Reuse a still-payable subscription instead of creating duplicates.
  const { data: existing } = await ctx.db
    .from('subscriptions')
    .select('provider_subscription_id, status')
    .eq('restaurant_id', ctx.restaurantId)
    .in('status', ['created', 'authenticated', 'active'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.status === 'active') {
    return NextResponse.json({ error: 'You already have an active subscription' }, { status: 409 })
  }

  const razorpay = createRazorpay()

  if (existing?.provider_subscription_id && existing.status === 'created') {
    return NextResponse.json({
      subscription_id: existing.provider_subscription_id,
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })
  }

  let subscription: { id: string }
  try {
    subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID_PRO!,
      total_count: 120, // 10 years of monthly cycles; cancel anytime
      customer_notify: 1,
      notes: { restaurant_id: ctx.restaurantId, restaurant_name: restaurant.name },
    })
  } catch {
    return NextResponse.json({ error: 'Could not start the subscription. Try again.' }, { status: 502 })
  }

  const { error: insertError } = await ctx.db.from('subscriptions').insert({
    restaurant_id: ctx.restaurantId,
    plan: 'pro',
    status: 'created',
    provider: 'razorpay',
    provider_subscription_id: subscription.id,
  })
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  await auditLog({
    restaurant_id: ctx.restaurantId,
    actor_id: ctx.user.id,
    action: 'billing.subscription_created',
    entity: 'subscription',
    entity_id: subscription.id,
  })

  return NextResponse.json({
    subscription_id: subscription.id,
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    email: restaurant.owner_email,
  })
}
