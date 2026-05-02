import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Sab managers ki list
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: roles, error } = await admin
    .from('user_roles')
    .select('user_id, role, created_at')
    .eq('role', 'manager')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const managers = await Promise.all(
    (roles || []).map(async (r) => {
      const { data } = await admin.auth.admin.getUserById(r.user_id)
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

// Naya manager banao
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, password, name, avatar_url } = await request.json()
  if (!email || !password) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || '', avatar_url: avatar_url || '' },
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })

  // Role assign karo
  const { error: roleError } = await admin
    .from('user_roles')
    .insert({ user_id: newUser.user.id, role: 'manager' })

  if (roleError) return NextResponse.json({ error: roleError.message }, { status: 500 })

  return NextResponse.json({ success: true, user_id: newUser.user.id, email })
}
