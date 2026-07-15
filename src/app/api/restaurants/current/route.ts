import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/auth'

const DEFAULT_SUBDOMAIN = process.env.DEFAULT_SUBDOMAIN || 'default'

// Public restaurant profile for the current subdomain (no owner email).
export async function GET(request: Request) {
  const subdomain = request.headers.get('x-subdomain') || ''

  if (!subdomain || subdomain === DEFAULT_SUBDOMAIN) {
    return NextResponse.json(null)
  }

  const db = createAdminClient()
  const { data } = await db
    .from('restaurants')
    .select('id, name, subdomain, phone, address, logo_url, primary_color, status')
    .eq('subdomain', subdomain)
    .eq('status', 'active')
    .single()

  return NextResponse.json(data ?? null)
}

// Admin: update own restaurant's branding/profile.
export async function PATCH(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim().slice(0, 200)
  if (typeof body.phone === 'string') updates.phone = body.phone.slice(0, 20) || null
  if (typeof body.address === 'string') updates.address = body.address.slice(0, 500) || null
  if (typeof body.logo_url === 'string') updates.logo_url = body.logo_url.slice(0, 1000) || null
  if (typeof body.primary_color === 'string') {
    if (body.primary_color && !/^#[0-9a-fA-F]{6}$/.test(body.primary_color)) {
      return NextResponse.json({ error: 'Invalid color' }, { status: 400 })
    }
    updates.primary_color = body.primary_color || null
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await ctx.db
    .from('restaurants')
    .update(updates)
    .eq('id', ctx.restaurantId)
    .select('id, name, subdomain, phone, address, logo_url, primary_color, status, plan, trial_ends_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
