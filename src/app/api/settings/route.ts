import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getReadRestaurantId } from '@/lib/restaurant'
import { requireStaff } from '@/lib/auth'

// Customers pass ?restaurant_id; staff get their own restaurant.
export async function GET(request: Request) {
  const restaurantId = await getReadRestaurantId(request)
  if (!restaurantId) return NextResponse.json({ show_menu_images: true, otp_mode: 'customer', menu_pdf: null })

  const db = createAdminClient()
  const { data, error } = await db
    .from('restaurant_settings')
    .select('show_menu_images, otp_mode, menu_pdf, menu_qr')
    .eq('restaurant_id', restaurantId)
    .single()

  if (error) return NextResponse.json({ show_menu_images: true, otp_mode: 'customer', menu_pdf: null })
  const isCustomer = new URL(request.url).searchParams.has('restaurant_id')
  const headers = isCustomer
    ? { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' }
    : { 'Cache-Control': 'private, no-store' }
  return NextResponse.json(data, { headers })
}

export async function PATCH(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  let body: { show_menu_images?: boolean; otp_mode?: string; menu_pdf?: Record<string, unknown>; menu_qr?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.show_menu_images === 'boolean') updates.show_menu_images = body.show_menu_images
  if (body.otp_mode === 'customer' || body.otp_mode === 'manager') updates.otp_mode = body.otp_mode
  const str = (v: unknown, max: number) => (typeof v === 'string' && v.trim() && v.length <= max ? v : undefined)
  if (body.menu_pdf && typeof body.menu_pdf === 'object' && !Array.isArray(body.menu_pdf)) {
    const mp = body.menu_pdf
    const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && v >= min && v <= max ? v : undefined)
    const bool = (v: unknown) => (v === true ? true : undefined)
    updates.menu_pdf = {
      template: str(mp.template, 20) || 'pdf1',
      bgColor: str(mp.bgColor, 30),
      textColor: str(mp.textColor, 30),
      subTextColor: str(mp.subTextColor, 30),
      heroImage: str(mp.heroImage, 1000),
      titleText: str(mp.titleText, 100),
      titleColor: str(mp.titleColor, 30),
      titleSize: num(mp.titleSize, 10, 120),
      titleBold: bool(mp.titleBold),
      titleItalic: bool(mp.titleItalic),
      priceColor: str(mp.priceColor, 30),
      priceSize: num(mp.priceSize, 6, 60),
      priceBold: bool(mp.priceBold),
      priceItalic: bool(mp.priceItalic),
    }
  }
  // Menu QR card design — same shape the table QR editor saves
  if (body.menu_qr && typeof body.menu_qr === 'object' && !Array.isArray(body.menu_qr)) {
    const q = body.menu_qr
    updates.menu_qr = {
      card_template: str(q.card_template, 20) || 'classic',
      card_image: str(q.card_image, 1000),
      card_bg_color: str(q.card_bg_color, 30),
      card_bg_image: str(q.card_bg_image, 1000),
      card_text_color: str(q.card_text_color, 30),
      card_heading: str(q.card_heading, 60),
      card_subtext: str(q.card_subtext, 100),
      card_label: str(q.card_label, 40),
      card_overlay: typeof q.card_overlay === 'number' && q.card_overlay >= 0 && q.card_overlay <= 80 ? q.card_overlay : 0,
    }
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await ctx.db
    .from('restaurant_settings')
    .upsert({ restaurant_id: ctx.restaurantId, ...updates }, { onConflict: 'restaurant_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // A saved Menu QR style must show on the very next scan — drop the cached
  // /menu-card page instead of waiting out its revalidate window.
  if (updates.menu_pdf || updates.menu_qr) {
    const { data: rest } = await ctx.db
      .from('restaurants').select('subdomain').eq('id', ctx.restaurantId).single()
    if (rest?.subdomain) revalidatePath(`/${rest.subdomain}/menu-card`)
  }

  return NextResponse.json(data)
}
