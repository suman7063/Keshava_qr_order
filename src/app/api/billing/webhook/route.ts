import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { auditLog } from '@/lib/auth'

interface SubscriptionEntity {
  id: string
  status: string
  current_end?: number | null
  notes?: { restaurant_id?: string }
}

// Razorpay subscription status → our subscriptions.status
const STATUS_MAP: Record<string, string> = {
  authenticated: 'authenticated',
  active: 'active',
  pending: 'past_due',
  halted: 'halted',
  cancelled: 'cancelled',
  completed: 'completed',
}

const DOWNGRADE_STATUSES = ['halted', 'cancelled', 'completed']

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })

  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') || ''
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')

  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { event: string; payload?: { subscription?: { entity?: SubscriptionEntity } } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const sub = event.payload?.subscription?.entity
  if (!event.event?.startsWith('subscription.') || !sub?.id) {
    // Not a subscription event — acknowledge so Razorpay doesn't retry.
    return NextResponse.json({ received: true })
  }

  const db = createAdminClient()

  // Resolve the tenant: prefer our own record, fall back to the notes.
  const { data: record } = await db
    .from('subscriptions')
    .select('id, restaurant_id, current_period_end, plan')
    .eq('provider_subscription_id', sub.id)
    .maybeSingle()
  const restaurantId = record?.restaurant_id ?? sub.notes?.restaurant_id
  if (!restaurantId) return NextResponse.json({ received: true })

  const status = STATUS_MAP[sub.status] ?? sub.status
  const plan = (record?.plan as string) || 'pro'
  const current_period_end = sub.current_end
    ? new Date(sub.current_end * 1000).toISOString()
    : null

  // Ordering guard: Razorpay retries and can deliver out of order. Ignore an
  // event whose billing period is OLDER than what we've already stored, so a
  // late "cancelled" can't knock a renewed (later-period) subscription offline.
  const isStale =
    !!record?.current_period_end &&
    !!current_period_end &&
    new Date(current_period_end) < new Date(record.current_period_end)
  if (isStale) return NextResponse.json({ received: true, ignored: 'stale' })

  if (record) {
    await db
      .from('subscriptions')
      .update({ status, current_period_end, updated_at: new Date().toISOString() })
      .eq('id', record.id)
  } else {
    // First delivery — tolerate a concurrent duplicate via the unique index.
    const { error: insErr } = await db.from('subscriptions').insert({
      restaurant_id: restaurantId,
      plan,
      status,
      provider: 'razorpay',
      provider_subscription_id: sub.id,
      current_period_end,
    })
    if (insErr && insErr.code !== '23505') {
      return NextResponse.json({ error: 'Could not record subscription' }, { status: 500 })
    }
  }

  // Paid subscription live → apply the plan (onboarding trial no longer applies).
  if (status === 'active') {
    await db
      .from('restaurants')
      .update({ plan, trial_ends_at: null })
      .eq('id', restaurantId)
  }

  // Subscription dead → back to the Free plan.
  if (DOWNGRADE_STATUSES.includes(status)) {
    await db
      .from('restaurants')
      .update({ plan: 'free', trial_ends_at: null })
      .eq('id', restaurantId)
  }

  await auditLog({
    restaurant_id: restaurantId,
    action: `billing.${event.event}`,
    entity: 'subscription',
    entity_id: sub.id,
    details: { status },
  })

  return NextResponse.json({ received: true })
}
