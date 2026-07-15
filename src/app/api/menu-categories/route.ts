import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantId } from '@/lib/restaurant'
import { requireStaff } from '@/lib/auth'

// Public: customers browse the menu.
export async function GET(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const db = createAdminClient()
  const { data, error } = await db
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('display_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}

export async function POST(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  let body: { name?: string; description?: string; display_order?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await ctx.db
    .from('menu_categories')
    .insert({
      name: body.name.trim().slice(0, 100),
      description: typeof body.description === 'string' ? body.description.slice(0, 500) : null,
      display_order: Number.isInteger(Number(body.display_order)) ? Number(body.display_order) : 0,
      restaurant_id: ctx.restaurantId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
