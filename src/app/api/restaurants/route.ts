import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// GET /api/restaurants — list all (super admin only)
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/restaurants — onboard a new restaurant
export async function POST(request: Request) {
  const supabase = createAdminClient()
  const body = await request.json()
  const { name, subdomain, owner_email, phone, plan = 'free', user_id } = body

  if (!name || !subdomain) {
    return NextResponse.json({ error: 'name and subdomain are required' }, { status: 400 })
  }

  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return NextResponse.json(
      { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' },
      { status: 400 }
    )
  }

  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .insert({ name, subdomain, owner_email, phone, plan })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This subdomain is already taken' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Create default settings
  await supabase
    .from('restaurant_settings')
    .insert({ restaurant_id: restaurant.id, show_menu_images: true })

  // Create admin role for the owner
  if (user_id) {
    await supabase
      .from('user_roles')
      .insert({ user_id, role: 'admin', restaurant_id: restaurant.id })
  }

  return NextResponse.json(restaurant, { status: 201 })
}
