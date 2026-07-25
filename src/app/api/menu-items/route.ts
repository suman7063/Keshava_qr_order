import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getReadRestaurantId } from '@/lib/restaurant'
import { requireStaff } from '@/lib/auth'
import { effectivePlan } from '@/lib/plans'
import { ITEM_FIELDS, validateMenuItemFields } from '@/lib/validation'

// Customers pass ?restaurant_id; staff get their own restaurant.
export async function GET(request: Request) {
  const restaurantId = await getReadRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('menu_items')
    .select('*, category:menu_categories(*)')
    .eq('restaurant_id', restaurantId)
    .order('display_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Only CDN-cache the customer path (keyed by ?restaurant_id in the URL).
  // Staff requests vary per-user, so they must never be shared-cached.
  const isCustomer = new URL(request.url).searchParams.has('restaurant_id')
  const headers = isCustomer
    ? { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' }
    : { 'Cache-Control': 'private, no-store' }
  return NextResponse.json(data, { headers })
}

export async function POST(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const insert: Record<string, unknown> = {}
  for (const key of ITEM_FIELDS) {
    if (key in body) insert[key] = body[key]
  }
  if (!insert.name || !insert.category_id || insert.price === undefined) {
    return NextResponse.json({ error: 'name, category_id and price are required' }, { status: 400 })
  }
  const invalid = validateMenuItemFields(insert)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  // The category must belong to this restaurant.
  const { data: category } = await ctx.db
    .from('menu_categories')
    .select('id')
    .eq('id', insert.category_id as string)
    .eq('restaurant_id', ctx.restaurantId)
    .single()
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 400 })

  // Plan limit enforcement
  const { data: restaurant } = await ctx.db
    .from('restaurants')
    .select('plan, trial_ends_at')
    .eq('id', ctx.restaurantId)
    .single()
  const plan = effectivePlan(restaurant ?? { plan: 'free', trial_ends_at: null })
  const { count } = await ctx.db
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', ctx.restaurantId)
  if ((count ?? 0) >= plan.maxMenuItems) {
    return NextResponse.json(
      { error: `Your ${plan.label} plan allows up to ${plan.maxMenuItems} menu items. Upgrade to add more.` },
      { status: 403 }
    )
  }

  const { data, error } = await ctx.db
    .from('menu_items')
    .insert({ ...insert, restaurant_id: ctx.restaurantId })
    .select('*, category:menu_categories(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
