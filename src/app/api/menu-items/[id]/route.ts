import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'
import { ITEM_FIELDS, validateMenuItemFields } from '@/lib/validation'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const key of ITEM_FIELDS) {
    if (key in body) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }
  const invalid = validateMenuItemFields(updates)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })
  if ('category_id' in updates) {
    const { data: category } = await ctx.db
      .from('menu_categories')
      .select('id')
      .eq('id', updates.category_id as string)
      .eq('restaurant_id', ctx.restaurantId)
      .single()
    if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 400 })
  }
  if (updates.station_id) {
    const { data: station } = await ctx.db
      .from('kitchen_stations')
      .select('id')
      .eq('id', updates.station_id as string)
      .eq('restaurant_id', ctx.restaurantId)
      .single()
    if (!station) return NextResponse.json({ error: 'Kitchen not found' }, { status: 400 })
  }

  const { data, error } = await ctx.db
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .select('*, category:menu_categories(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  const { error } = await ctx.db
    .from('menu_items')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
  if (error) {
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'This item has past orders. Mark it unavailable instead of deleting.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
