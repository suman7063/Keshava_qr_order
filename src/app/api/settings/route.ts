import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getReadRestaurantId } from '@/lib/restaurant'
import { requireStaff } from '@/lib/auth'

// Customers pass ?restaurant_id; staff get their own restaurant.
export async function GET(request: Request) {
  const restaurantId = await getReadRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ show_menu_images: true, otp_mode: 'customer' })

  const db = createAdminClient()
  const { data, error } = await db
    .from('restaurant_settings')
    .select('show_menu_images, otp_mode')
    .eq('restaurant_id', restaurantId)
    .single()

  if (error) return NextResponse.json({ show_menu_images: true, otp_mode: 'customer' })
  const isCustomer = new URL(request.url).searchParams.has('restaurant_id')
  const headers = isCustomer
    ? { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' }
    : { 'Cache-Control': 'private, no-store' }
  return NextResponse.json(data, { headers })
}

export async function PATCH(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  let body: { show_menu_images?: boolean; otp_mode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.show_menu_images === 'boolean') updates.show_menu_images = body.show_menu_images
  if (body.otp_mode === 'customer' || body.otp_mode === 'manager') updates.otp_mode = body.otp_mode
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await ctx.db
    .from('restaurant_settings')
    .upsert({ restaurant_id: ctx.restaurantId, ...updates }, { onConflict: 'restaurant_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
