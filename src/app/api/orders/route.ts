import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const session_id = searchParams.get('session_id')

  let query = supabase
    .from('orders')
    .select(`
      *,
      table:restaurant_tables(*),
      session:table_sessions(*),
      items:order_items(*, menu_item:menu_items(*))
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (session_id) query = query.eq('session_id', session_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { session_id, table_id, items, notes } = body

  // Calculate total
  const total_amount = items.reduce(
    (sum: number, item: { unit_price: number; quantity: number }) =>
      sum + item.unit_price * item.quantity,
    0
  )

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ session_id, table_id, total_amount, notes })
    .select()
    .single()

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  // Insert order items
  const orderItems = items.map((item: { menu_item_id: string; quantity: number; unit_price: number; notes?: string }) => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.unit_price * item.quantity,
    notes: item.notes,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  // Return full order
  const { data: fullOrder } = await supabase
    .from('orders')
    .select(`*, table:restaurant_tables(*), session:table_sessions(*), items:order_items(*, menu_item:menu_items(*))`)
    .eq('id', order.id)
    .single()

  return NextResponse.json(fullOrder)
}
