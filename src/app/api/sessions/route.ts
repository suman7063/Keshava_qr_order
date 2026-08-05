import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantId, getReadRestaurantId } from '@/lib/restaurant'
import { requireStaff, requireSessionAccess } from '@/lib/auth'

function generateJoinCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

/** Fields safe to show to anyone at the table (no join code, no phone). */
const PUBLIC_SESSION_SELECT = 'id, table_id, customer_name, bill_requested, status, started_at, table:restaurant_tables(id, table_number, capacity, status)'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const table_id = searchParams.get('table_id')
  const bill_requested = searchParams.get('bill_requested')

  // Staff view: sessions with a pending bill request.
  if (bill_requested === 'true') {
    const ctx = await requireStaff(request)
    if (ctx instanceof NextResponse) return ctx

    const { data, error } = await ctx.db
      .from('table_sessions')
      .select('*, table:restaurant_tables(*)')
      .eq('restaurant_id', ctx.restaurantId)
      .eq('status', 'active')
      .eq('bill_requested', true)
      .order('started_at', { ascending: false })
    if (error) return NextResponse.json([])
    return NextResponse.json(data)
  }

  // Active session at a table (sanitized). Customers pass ?restaurant_id;
  // staff (admin tables view) resolve to their own restaurant.
  if (!table_id) return NextResponse.json({ session: null })
  const restaurantId = await getReadRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ session: null })

  const db = createAdminClient()
  const { data, error } = await db
    .from('table_sessions')
    .select(PUBLIC_SESSION_SELECT)
    .eq('table_id', table_id)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !data) return NextResponse.json({ session: null })
  return NextResponse.json({ session: data })
}

export async function POST(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  let body: { table_id?: string; phone?: string; customer_name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { table_id, phone, customer_name } = body

  if (!table_id || !customer_name?.trim()) {
    return NextResponse.json({ error: 'table_id and customer_name are required' }, { status: 400 })
  }
  if (phone && !/^\d{10}$/.test(phone)) {
    return NextResponse.json({ error: 'Enter a valid 10-digit phone number' }, { status: 400 })
  }

  const db = createAdminClient()

  // The table must belong to this restaurant.
  const { data: table } = await db
    .from('restaurant_tables')
    .select('id, status')
    .eq('id', table_id)
    .eq('restaurant_id', restaurantId)
    .single()
  if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 })

  // A reserved table is being held for someone — staff must free it first.
  if (table.status === 'reserved') {
    return NextResponse.json(
      { error: 'This table is reserved. Please ask our staff to seat you.' },
      { status: 403 }
    )
  }

  // In manager mode the join code goes to staff, not to the customer's
  // screen — staff tell it to the diners in person. otp_verified stays
  // FALSE until a diner proves they received it (PATCH below).
  const { data: settings } = await db
    .from('restaurant_settings')
    .select('otp_mode')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()
  const managerGivesOtp = settings?.otp_mode === 'manager'

  const otp = generateJoinCode()
  const { data, error } = await db
    .from('table_sessions')
    .insert({
      table_id,
      phone: phone || null,
      customer_name: customer_name.trim().slice(0, 200),
      otp,
      otp_verified: !managerGivesOtp,
      restaurant_id: restaurantId,
    })
    .select(PUBLIC_SESSION_SELECT)
    .single()

  if (error) {
    // Unique index: only one active session per table.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This table already has an active session' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await db.from('restaurant_tables').update({ status: 'occupied' }).eq('id', table_id)

  // The join code is returned exactly once, to its creator — except in
  // manager mode, where only staff dashboards can see it.
  if (managerGivesOtp) return NextResponse.json({ session: data, otp_mode: 'manager' })
  return NextResponse.json({ session: data, otp })
}

/** Verify a join code (guest joining an existing table session). */
export async function PATCH(request: Request) {
  let body: { session_id?: string; otp?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { session_id, otp } = body
  if (!session_id || !otp) {
    return NextResponse.json({ error: 'session_id and otp are required' }, { status: 400 })
  }

  const access = await requireSessionAccess(request, session_id, otp)
  if (access instanceof NextResponse) return access

  // Code reached the diners — staff dashboards stop flagging this table.
  await access.db.from('table_sessions').update({ otp_verified: true }).eq('id', session_id)

  return NextResponse.json({ success: true, session: access.session })
}
