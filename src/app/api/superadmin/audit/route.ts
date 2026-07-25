import { NextResponse } from 'next/server'
import { requireSuperadmin } from '@/lib/auth'

// Recent platform activity from the audit log (superadmin only).
export async function GET() {
  const ctx = await requireSuperadmin()
  if (ctx instanceof NextResponse) return ctx

  const { data, error } = await ctx.db
    .from('audit_logs')
    .select('id, action, entity, entity_id, details, created_at, restaurant:restaurants(name)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json([])
  return NextResponse.json(data ?? [])
}
