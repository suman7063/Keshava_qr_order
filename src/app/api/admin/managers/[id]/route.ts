import { NextResponse } from 'next/server'
import { requireStaff, auditLog, type StaffContext } from '@/lib/auth'

/** The target user must be a manager of THIS restaurant. */
async function assertManagerOfRestaurant(ctx: StaffContext, userId: string) {
  const { data } = await ctx.db
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('restaurant_id', ctx.restaurantId)
    .eq('role', 'manager')
    .maybeSingle()
  return !!data
}

// Update a manager's password/profile (admin only, own restaurant only)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  if (!(await assertManagerOfRestaurant(ctx, id))) {
    return NextResponse.json({ error: 'Manager not found' }, { status: 404 })
  }

  let body: { password?: string; name?: string; avatar_url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { password, name, avatar_url } = body

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}
  if (password) {
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    updates.password = password
  }
  if (name !== undefined || avatar_url !== undefined) {
    updates.user_metadata = {}
    if (name !== undefined) updates.user_metadata.name = name
    if (avatar_url !== undefined) updates.user_metadata.avatar_url = avatar_url
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ success: true })

  const { error } = await ctx.db.auth.admin.updateUserById(id, updates)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await auditLog({
    restaurant_id: ctx.restaurantId,
    actor_id: ctx.user.id,
    action: password ? 'manager.password_reset' : 'manager.updated',
    entity: 'user',
    entity_id: id,
  })

  return NextResponse.json({ success: true })
}

// Delete a manager (admin only, own restaurant only)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params
  if (!(await assertManagerOfRestaurant(ctx, id))) {
    return NextResponse.json({ error: 'Manager not found' }, { status: 404 })
  }

  // Remove the role in this restaurant…
  await ctx.db
    .from('user_roles')
    .delete()
    .eq('user_id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .eq('role', 'manager')

  // …and delete the auth user only if they have no roles elsewhere.
  const { data: otherRoles } = await ctx.db
    .from('user_roles')
    .select('id')
    .eq('user_id', id)
    .limit(1)
  if (!otherRoles?.length) {
    const { error } = await ctx.db.auth.admin.deleteUser(id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await auditLog({
    restaurant_id: ctx.restaurantId,
    actor_id: ctx.user.id,
    action: 'manager.deleted',
    entity: 'user',
    entity_id: id,
  })

  return NextResponse.json({ success: true })
}
