import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  let body: { name?: string; display_order?: number; default_station_id?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim().slice(0, 100)
  if (Number.isInteger(Number(body.display_order))) updates.display_order = Number(body.display_order)
  if ('default_station_id' in body) {
    if (body.default_station_id === null || body.default_station_id === '') {
      updates.default_station_id = null
    } else if (typeof body.default_station_id === 'string') {
      // The station must belong to this restaurant.
      const { data: station } = await ctx.db
        .from('kitchen_stations')
        .select('id')
        .eq('id', body.default_station_id)
        .eq('restaurant_id', ctx.restaurantId)
        .single()
      if (!station) return NextResponse.json({ error: 'Kitchen not found' }, { status: 400 })
      updates.default_station_id = body.default_station_id
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await ctx.db
    .from('menu_categories')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params

  // The category must belong to this restaurant.
  const { data: cat } = await ctx.db
    .from('menu_categories')
    .select('id')
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .single()
  if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  // Refuse to delete a category that still has items (would cascade-delete them).
  const { count } = await ctx.db
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .eq('restaurant_id', ctx.restaurantId)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Move or delete this category’s items before deleting it.' },
      { status: 409 }
    )
  }

  const { error } = await ctx.db
    .from('menu_categories')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
