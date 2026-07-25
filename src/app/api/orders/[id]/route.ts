import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'

const ORDER_SELECT = `*, table:restaurant_tables(*), session:table_sessions(id, table_id, customer_name, bill_requested, status, started_at), items:order_items(*, menu_item:menu_items(*))`

const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'cancelled']

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request)
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  let body: { status?: string; remove_item_ids?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { status, remove_item_ids } = body

  // The order must belong to this restaurant.
  const { data: order } = await ctx.db
    .from('orders')
    .select('id')
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .single()
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Remove specific items and recalculate total
  if (Array.isArray(remove_item_ids) && remove_item_ids.length) {
    const ids = remove_item_ids.filter(x => typeof x === 'string').slice(0, 100)
    if (!ids.length) return NextResponse.json({ error: 'Invalid item ids' }, { status: 400 })
    await ctx.db.from('order_items').delete().in('id', ids).eq('order_id', id)
    const { data: remaining } = await ctx.db.from('order_items').select('total_price').eq('order_id', id)
    const newTotal = (remaining || []).reduce((sum, i) => sum + i.total_price, 0)
    await ctx.db.from('orders').update({ total_amount: newTotal }).eq('id', id)
  }

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    const { data, error } = await ctx.db
      .from('orders')
      .update({ status })
      .eq('id', id)
      .eq('restaurant_id', ctx.restaurantId)
      .select(ORDER_SELECT)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ success: true })
}
