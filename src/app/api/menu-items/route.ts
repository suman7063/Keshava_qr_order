import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getRestaurantId } from '@/lib/restaurant'

export async function GET(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, category:menu_categories(*)')
    .eq('restaurant_id', restaurantId)
    .order('display_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}

export async function POST(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('menu_items')
    .insert({ ...body, restaurant_id: restaurantId })
    .select('*, category:menu_categories(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
