import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getRestaurantId } from '@/lib/restaurant'

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function GET(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ session: null })

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const table_id = searchParams.get('table_id')
  const bill_requested = searchParams.get('bill_requested')

  if (bill_requested === 'true') {
    const { data, error } = await supabase
      .from('table_sessions')
      .select('*, table:restaurant_tables(*)')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active')
      .eq('bill_requested', true)
      .order('started_at', { ascending: false })
    if (error) return NextResponse.json([])
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from('table_sessions')
    .select('*, table:restaurant_tables(*)')
    .eq('table_id', table_id!)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'active')
    .single()

  if (error) return NextResponse.json({ session: null })
  return NextResponse.json({ session: data })
}

export async function POST(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const supabase = await createClient()
  const { table_id, phone, customer_name } = await request.json()
  const otp = generateOTP()

  const { data, error } = await supabase
    .from('table_sessions')
    .insert({ table_id, phone, customer_name, otp, otp_verified: true, restaurant_id: restaurantId })
    .select('*, table:restaurant_tables(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('restaurant_tables')
    .update({ status: 'occupied' })
    .eq('id', table_id)

  return NextResponse.json({ session: data, otp })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { session_id, otp } = await request.json()

  const { data: session } = await supabase
    .from('table_sessions')
    .select('*')
    .eq('id', session_id)
    .eq('status', 'active')
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.otp !== otp) return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })

  return NextResponse.json({ success: true, session })
}
