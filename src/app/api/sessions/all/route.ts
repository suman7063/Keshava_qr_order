import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getRestaurantId } from '@/lib/restaurant'

export async function GET(request: Request) {
  const restaurantId = await getRestaurantId(request)
  if (!restaurantId) return NextResponse.json([])

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('table_sessions')
    .select('*, table:restaurant_tables(*)')
    .eq('restaurant_id', restaurantId)
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data)
}
