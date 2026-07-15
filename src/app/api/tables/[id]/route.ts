import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantId } from '@/lib/restaurant'
import { requireStaff } from '@/lib/auth'

const UPDATABLE_FIELDS = [
  'table_number', 'capacity', 'status', 'qr_code_url', 'card_image',
  'card_template', 'card_bg_color', 'card_bg_image', 'card_text_color',
  'card_heading', 'card_subtext', 'card_label',
] as const

// Public: the customer QR landing page shows the table number.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const { id } = await params
  const db = createAdminClient()
  const { data, error } = await db
    .from('restaurant_tables')
    .select('id, table_number, capacity, status')
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .single()
  if (error) return NextResponse.json({ error: 'Table not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request)
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const key of UPDATABLE_FIELDS) {
    if (key in body) updates[key] = body[key]
  }
  if (updates.status && !['available', 'occupied', 'reserved'].includes(String(updates.status))) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await ctx.db
    .from('restaurant_tables')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If table marked available, close any active session
  if (updates.status === 'available') {
    await ctx.db
      .from('table_sessions')
      .update({ status: 'closed', ended_at: new Date().toISOString() })
      .eq('table_id', id)
      .eq('restaurant_id', ctx.restaurantId)
      .eq('status', 'active')
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  const { error } = await ctx.db
    .from('restaurant_tables')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
