import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'

export async function POST(request: Request) {
  const ctx = await requireStaff(request)
  if (ctx instanceof NextResponse) return ctx

  let body: { session_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { session_id } = body
  if (!session_id) return NextResponse.json({ error: 'session_id is required' }, { status: 400 })

  // The session must belong to this restaurant.
  const { data: session } = await ctx.db
    .from('table_sessions')
    .select('id, table_id')
    .eq('id', session_id)
    .eq('restaurant_id', ctx.restaurantId)
    .single()
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const { error: sessionError } = await ctx.db
    .from('table_sessions')
    .update({ status: 'closed', ended_at: new Date().toISOString() })
    .eq('id', session_id)

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

  await ctx.db
    .from('restaurant_tables')
    .update({ status: 'available' })
    .eq('id', session.table_id)
    .eq('restaurant_id', ctx.restaurantId)

  // Mark all non-cancelled orders as served
  await ctx.db
    .from('orders')
    .update({ status: 'served' })
    .eq('session_id', session_id)
    .eq('restaurant_id', ctx.restaurantId)
    .neq('status', 'cancelled')

  return NextResponse.json({ success: true })
}
