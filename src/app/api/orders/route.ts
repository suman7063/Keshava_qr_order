import { NextResponse } from 'next/server'
import { requireStaff, requireSessionAccess } from '@/lib/auth'

const ORDER_SELECT = `*, table:restaurant_tables(*), session:table_sessions(id, table_id, customer_name, bill_requested, status, started_at), items:order_items(*, menu_item:menu_items(*))`

const MAX_ITEMS_PER_ORDER = 50
const MAX_QTY_PER_ITEM = 50

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const session_id = searchParams.get('session_id')
  const today = searchParams.get('today')

  // Session-scoped orders: staff can read any of their restaurant's
  // sessions; customers must prove membership via the session code.
  if (session_id) {
    const staff = await requireStaff(request)
    if (staff instanceof NextResponse) {
      const access = await requireSessionAccess(request, session_id)
      if (access instanceof NextResponse) return access

      const { data, error } = await access.db
        .from('orders')
        .select(ORDER_SELECT)
        .eq('restaurant_id', access.session.restaurant_id)
        .eq('session_id', session_id)
        .order('created_at', { ascending: false })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }

    const { data, error } = await staff.db
      .from('orders')
      .select(ORDER_SELECT)
      .eq('restaurant_id', staff.restaurantId)
      .eq('session_id', session_id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Staff path: all orders of their restaurant.
  const ctx = await requireStaff(request)
  if (ctx instanceof NextResponse) return ctx

  let query = ctx.db
    .from('orders')
    .select(ORDER_SELECT)
    .eq('restaurant_id', ctx.restaurantId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (today === 'true') {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    query = query.gte('created_at', start.toISOString())
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  let body: {
    session_id?: string
    session_code?: string
    items?: { menu_item_id?: string; quantity?: number; notes?: string }[]
    notes?: string
    customer_name?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { session_id, session_code, items, notes, customer_name } = body
  if (!session_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'session_id and items are required' }, { status: 400 })
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    return NextResponse.json({ error: 'Too many items in one order' }, { status: 400 })
  }

  // Customer must prove they belong to the session via the join code.
  const access = await requireSessionAccess(request, session_id, session_code)
  if (access instanceof NextResponse) return access
  const { session, db } = access
  // Tenant comes from the verified session, not the request.
  const restaurantId = session.restaurant_id

  // Prices come from the menu, never from the client.
  const itemIds = [...new Set(items.map(i => i.menu_item_id).filter(Boolean))] as string[]
  const { data: menuItems, error: menuError } = await db
    .from('menu_items')
    .select('id, price, is_available')
    .eq('restaurant_id', restaurantId)
    .in('id', itemIds)

  if (menuError) return NextResponse.json({ error: menuError.message }, { status: 500 })
  const menuById = new Map((menuItems || []).map(m => [m.id, m]))

  const orderItems: { menu_item_id: string; quantity: number; unit_price: number; total_price: number; notes?: string }[] = []
  for (const item of items) {
    const menuItem = item.menu_item_id ? menuById.get(item.menu_item_id) : undefined
    if (!menuItem) return NextResponse.json({ error: 'Menu item not found' }, { status: 400 })
    if (!menuItem.is_available) return NextResponse.json({ error: 'One of the items is no longer available' }, { status: 409 })
    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }
    orderItems.push({
      menu_item_id: menuItem.id,
      quantity,
      unit_price: menuItem.price,
      total_price: menuItem.price * quantity,
      notes: typeof item.notes === 'string' ? item.notes.slice(0, 500) : undefined,
    })
  }

  const total_amount = orderItems.reduce((sum, i) => sum + i.total_price, 0)

  const { data: order, error: orderError } = await db
    .from('orders')
    .insert({
      session_id: session.id,
      table_id: session.table_id,
      total_amount,
      notes: typeof notes === 'string' ? notes.slice(0, 500) : null,
      customer_name: typeof customer_name === 'string' ? customer_name.slice(0, 200) : null,
      restaurant_id: restaurantId,
    })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  const { error: itemsError } = await db
    .from('order_items')
    .insert(orderItems.map(i => ({ ...i, order_id: order.id, restaurant_id: restaurantId })))
  if (itemsError) {
    await db.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  const { data: fullOrder } = await db
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', order.id)
    .single()

  return NextResponse.json(fullOrder)
}
