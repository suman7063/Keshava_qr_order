import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { status, remove_item_ids } = await request.json()

  // Remove specific items and recalculate total
  if (remove_item_ids?.length) {
    await supabase.from('order_items').delete().in('id', remove_item_ids).eq('order_id', id)
    const { data: remaining } = await supabase.from('order_items').select('total_price').eq('order_id', id)
    const newTotal = (remaining || []).reduce((sum, i) => sum + i.total_price, 0)
    await supabase.from('orders').update({ total_amount: newTotal }).eq('id', id)
  }

  if (status) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select(`*, table:restaurant_tables(*), session:table_sessions(*), items:order_items(*, menu_item:menu_items(*))`)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ success: true })
}
