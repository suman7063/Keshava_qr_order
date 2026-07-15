import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin, auditLog } from '@/lib/auth'
import { TRIAL_DAYS } from '@/lib/plans'
import { RESERVED_SUBDOMAINS } from '@/lib/validation'

// GET /api/restaurants — list all (superadmin only)
export async function GET() {
  const ctx = await requireSuperadmin()
  if (ctx instanceof NextResponse) return ctx

  const { data, error } = await ctx.db
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/restaurants — self-serve onboarding.
// The auth user is created client-side (signUp) and is unverified at this
// point, so there is no cookie session yet. We bind the restaurant strictly
// to that freshly created user instead of trusting the body blindly.
export async function POST(request: Request) {
  const db = createAdminClient()
  let body: {
    name?: string; subdomain?: string; owner_email?: string
    phone?: string; plan?: string; user_id?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { name, subdomain, owner_email, phone, plan = 'free', user_id } = body

  if (!name?.trim() || !subdomain || !user_id || !owner_email) {
    return NextResponse.json({ error: 'name, subdomain, owner_email and user_id are required' }, { status: 400 })
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(subdomain) || subdomain.length < 2) {
    return NextResponse.json(
      { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' },
      { status: 400 }
    )
  }
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return NextResponse.json({ error: 'This subdomain is reserved' }, { status: 409 })
  }
  if (!['free', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // The user must be a real, freshly signed-up account with this email…
  const { data: userData, error: userError } = await db.auth.admin.getUserById(user_id)
  const user = userData?.user
  if (userError || !user || user.email?.toLowerCase() !== owner_email.toLowerCase()) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 })
  }
  const ageMs = Date.now() - new Date(user.created_at).getTime()
  if (ageMs > 60 * 60 * 1000) {
    return NextResponse.json({ error: 'Signup session expired. Please register again.' }, { status: 400 })
  }
  // …that doesn't already own a restaurant.
  const { data: existingRoles } = await db
    .from('user_roles')
    .select('id')
    .eq('user_id', user_id)
    .limit(1)
  if (existingRoles?.length) {
    return NextResponse.json({ error: 'This account already has a restaurant' }, { status: 409 })
  }

  const trial_ends_at =
    plan === 'pro' ? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString() : null

  const { data: restaurant, error } = await db
    .from('restaurants')
    .insert({
      name: name.trim().slice(0, 200),
      subdomain,
      owner_email,
      phone: phone || null,
      plan,
      trial_ends_at,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This subdomain is already taken' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await db
    .from('restaurant_settings')
    .insert({ restaurant_id: restaurant.id, show_menu_images: true })

  const { error: roleError } = await db
    .from('user_roles')
    .insert({ user_id, role: 'admin', restaurant_id: restaurant.id })
  if (roleError) {
    // Don't leave an ownerless tenant behind.
    await db.from('restaurants').delete().eq('id', restaurant.id)
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }

  await auditLog({
    restaurant_id: restaurant.id,
    actor_id: user_id,
    action: 'restaurant.created',
    entity: 'restaurant',
    entity_id: restaurant.id,
    details: { subdomain, plan },
  })

  return NextResponse.json(restaurant, { status: 201 })
}
