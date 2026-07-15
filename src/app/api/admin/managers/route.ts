import { NextResponse } from 'next/server'
import { requireStaff, auditLog } from '@/lib/auth'

// List this restaurant's managers (admin only)
export async function GET(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { data: roles, error } = await ctx.db
    .from('user_roles')
    .select('user_id, role, created_at')
    .eq('role', 'manager')
    .eq('restaurant_id', ctx.restaurantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const managers = await Promise.all(
    (roles || []).map(async (r) => {
      const { data } = await ctx.db.auth.admin.getUserById(r.user_id)
      return {
        user_id: r.user_id,
        email: data.user?.email || '',
        name: (data.user?.user_metadata?.name as string) || '',
        avatar_url: (data.user?.user_metadata?.avatar_url as string) || '',
        created_at: r.created_at,
      }
    })
  )

  return NextResponse.json(managers)
}

// Create a manager for this restaurant (admin only)
export async function POST(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  let body: { email?: string; password?: string; name?: string; avatar_url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { email, password, name, avatar_url } = body
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const { data: newUser, error: createError } = await ctx.db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || '', avatar_url: avatar_url || '' },
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  const { error: roleError } = await ctx.db
    .from('user_roles')
    .insert({ user_id: newUser.user.id, role: 'manager', restaurant_id: ctx.restaurantId })

  if (roleError) {
    await ctx.db.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }

  await auditLog({
    restaurant_id: ctx.restaurantId,
    actor_id: ctx.user.id,
    action: 'manager.created',
    entity: 'user',
    entity_id: newUser.user.id,
    details: { email },
  })

  return NextResponse.json({ success: true, user_id: newUser.user.id, email })
}
