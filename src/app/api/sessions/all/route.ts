import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'

export async function GET(request: Request) {
  const ctx = await requireStaff(request)
  if (ctx instanceof NextResponse) return ctx

  const { data, error } = await ctx.db
    .from('table_sessions')
    .select('*, table:restaurant_tables(*)')
    .eq('restaurant_id', ctx.restaurantId)
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data)
}
