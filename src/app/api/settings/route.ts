import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getRestaurantId } from '@/lib/restaurant'

export async function GET(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ show_menu_images: true })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('restaurant_settings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single()

  if (error) return NextResponse.json({ show_menu_images: true })
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
  })
}

export async function PATCH(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('restaurant_settings')
    .upsert({ restaurant_id: restaurantId, ...body }, { onConflict: 'restaurant_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
