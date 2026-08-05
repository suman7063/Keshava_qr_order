import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// One request for the whole customer menu screen: the table (with its
// restaurant + branding), the menu, categories and display settings.
// Replaces the old table→menu waterfall with a single round-trip.
export async function GET(_req: Request, { params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await params
  const db = createAdminClient()

  const { data: table, error } = await db
    .from('restaurant_tables')
    .select('id, table_number, status, restaurant_id, restaurant:restaurants(id, name, subdomain, status, logo_url, primary_color)')
    .eq('id', tableId)
    .single()

  if (error || !table) return NextResponse.json({ error: 'Table not found' }, { status: 404 })

  const restaurant = table.restaurant as unknown as
    { id: string; name: string; subdomain: string; status: string; logo_url: string | null; primary_color: string | null } | null
  if (!restaurant || restaurant.status !== 'active') {
    return NextResponse.json({ error: 'Restaurant not available' }, { status: 404 })
  }

  const rid = table.restaurant_id
  const [cats, items, settings] = await Promise.all([
    db.from('menu_categories').select('*').eq('restaurant_id', rid).eq('is_active', true).order('display_order'),
    db.from('menu_items').select('*, category:menu_categories(*)').eq('restaurant_id', rid).order('display_order'),
    db.from('restaurant_settings').select('show_menu_images, otp_mode').eq('restaurant_id', rid).single(),
  ])

  return NextResponse.json(
    {
      table: { id: table.id, table_number: table.table_number, status: table.status, restaurant_id: rid },
      restaurant: { name: restaurant.name, subdomain: restaurant.subdomain, logo_url: restaurant.logo_url, primary_color: restaurant.primary_color },
      categories: cats.data ?? [],
      items: items.data ?? [],
      settings: settings.data ?? { show_menu_images: true, otp_mode: 'customer' },
    },
    // Cacheable at the CDN; the tableId in the URL keys each table's copy,
    // and menu edits propagate within the 60s window.
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  )
}
