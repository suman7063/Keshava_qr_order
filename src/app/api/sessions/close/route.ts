import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { session_id } = await request.json()

  // Session close karo
  const { error: sessionError } = await supabase
    .from('table_sessions')
    .update({ status: 'closed', ended_at: new Date().toISOString() })
    .eq('id', session_id)

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

  // Table wapas available karo
  const { data: session } = await supabase
    .from('table_sessions')
    .select('table_id')
    .eq('id', session_id)
    .single()

  if (session) {
    await supabase
      .from('restaurant_tables')
      .update({ status: 'available' })
      .eq('id', session.table_id)

    // Mark all non-cancelled orders as served
    await supabase
      .from('orders')
      .update({ status: 'served' })
      .eq('session_id', session_id)
      .neq('status', 'cancelled')
  }

  return NextResponse.json({ success: true })
}
