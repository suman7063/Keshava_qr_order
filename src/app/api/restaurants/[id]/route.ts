import { NextResponse } from 'next/server'
import { requireSuperadmin, auditLog } from '@/lib/auth'

// PATCH /api/restaurants/[id] — superadmin: update status, plan or name
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSuperadmin()
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, string | null> = {}
  if ('status' in body) {
    if (!['active', 'inactive', 'suspended'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    updates.status = body.status
  }
  if ('plan' in body) {
    if (!['free', 'pro', 'enterprise'].includes(body.plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    updates.plan = body.plan
    // A superadmin-granted plan is not a trial — clear any stale trial date so
    // effectivePlan() doesn't silently downgrade it back to free.
    updates.trial_ends_at = null
  }
  if ('name' in body && body.name?.trim()) updates.name = body.name.trim().slice(0, 200)

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await ctx.db
    .from('restaurants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await auditLog({
    restaurant_id: id,
    actor_id: ctx.user.id,
    action: 'restaurant.updated',
    entity: 'restaurant',
    entity_id: id,
    details: updates,
  })

  return NextResponse.json(data)
}

// DELETE /api/restaurants/[id] — superadmin only
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSuperadmin()
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  const { error } = await ctx.db.from('restaurants').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await auditLog({
    actor_id: ctx.user.id,
    action: 'restaurant.deleted',
    entity: 'restaurant',
    entity_id: id,
  })

  return NextResponse.json({ success: true })
}
