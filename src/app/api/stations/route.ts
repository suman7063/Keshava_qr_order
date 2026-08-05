import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'

// Kitchen stations of the staff member's restaurant. Managers can read
// (kitchen devices pick their station); only admins change the list.
export async function GET(request: Request) {
  const ctx = await requireStaff(request)
  if (ctx instanceof NextResponse) return ctx

  const { data, error } = await ctx.db
    .from('kitchen_stations')
    .select('id, name, display_order, created_at')
    .eq('restaurant_id', ctx.restaurantId)
    .order('display_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  let body: { name?: string; display_order?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await ctx.db
    .from('kitchen_stations')
    .insert({
      name: body.name.trim().slice(0, 100),
      display_order: Number.isInteger(Number(body.display_order)) ? Number(body.display_order) : 0,
      restaurant_id: ctx.restaurantId,
    })
    .select('id, name, display_order, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A kitchen with this name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
