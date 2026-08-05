import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  let body: { name?: string; display_order?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim().slice(0, 100)
  if (Number.isInteger(Number(body.display_order))) updates.display_order = Number(body.display_order)
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await ctx.db
    .from('kitchen_stations')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .select('id, name, display_order, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A kitchen with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  // FK is ON DELETE SET NULL: mapped categories/items simply fall back
  // to "Main Kitchen", so deleting never blocks or breaks orders.
  const { error } = await ctx.db
    .from('kitchen_stations')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
