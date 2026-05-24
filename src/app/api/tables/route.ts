import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getRestaurantId } from '@/lib/restaurant'

export async function GET(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('table_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const supabase = await createClient()
  const body = await request.json()
  const { table_number, capacity } = body

  const { data, error } = await supabase
    .from('restaurant_tables')
    .insert({ table_number, capacity, restaurant_id: restaurantId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
