import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'
import { effectivePlan } from '@/lib/plans'

export async function GET(request: Request) {
  const ctx = await requireStaff(request)
  if (ctx instanceof NextResponse) return ctx

  const { data, error } = await ctx.db
    .from('restaurant_tables')
    .select('*')
    .eq('restaurant_id', ctx.restaurantId)
    .order('table_number')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  let body: { table_number?: string; capacity?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { table_number, capacity } = body
  if (!table_number?.toString().trim()) {
    return NextResponse.json({ error: 'table_number is required' }, { status: 400 })
  }

  // Plan limit enforcement
  const { data: restaurant } = await ctx.db
    .from('restaurants')
    .select('plan, trial_ends_at')
    .eq('id', ctx.restaurantId)
    .single()
  const plan = effectivePlan(restaurant ?? { plan: 'free', trial_ends_at: null })
  const { count } = await ctx.db
    .from('restaurant_tables')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', ctx.restaurantId)
  if ((count ?? 0) >= plan.maxTables) {
    return NextResponse.json(
      { error: `Your ${plan.label} plan allows up to ${plan.maxTables} tables. Upgrade to add more.` },
      { status: 403 }
    )
  }

  const { data, error } = await ctx.db
    .from('restaurant_tables')
    .insert({
      table_number: table_number.toString().trim().slice(0, 20),
      capacity: Number.isInteger(Number(capacity)) && Number(capacity) > 0 ? Number(capacity) : 4,
      restaurant_id: ctx.restaurantId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A table with this number already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
