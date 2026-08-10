import { createAdminClient } from '@/lib/supabase/admin'
import { getPdfHTML, PDF_TEMPLATES } from '@/lib/pdf-templates'
import type { MenuItem, MenuCategory } from '@/types'

// Read-only menu card: scanning the Menu QR lands here. No ordering, no
// actions — just the menu rendered in whatever PDF template (+ colours)
// the owner saved from Admin → Menu → PDF, plus a print button.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const db = createAdminClient()

  const { data: restaurant } = await db
    .from('restaurants')
    .select('id, name')
    .eq('subdomain', slug)
    .eq('status', 'active')
    .single()
  if (!restaurant) {
    return new Response('Restaurant not found', { status: 404 })
  }

  const [{ data: cats }, { data: menuItems }, { data: settings }] = await Promise.all([
    db.from('menu_categories').select('*')
      .eq('restaurant_id', restaurant.id)
      .order('display_order', { ascending: true }),
    db.from('menu_items').select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('is_available', true)
      .eq('is_archived', false)
      .order('display_order', { ascending: true }),
    db.from('restaurant_settings').select('menu_pdf')
      .eq('restaurant_id', restaurant.id)
      .single(),
  ])

  const saved = (settings?.menu_pdf ?? {}) as {
    template?: string; bgColor?: string; textColor?: string; subTextColor?: string; heroImage?: string
  }
  const templateId = PDF_TEMPLATES.some(t => t.id === saved.template) ? saved.template! : 'pdf1'

  let html = getPdfHTML(
    templateId,
    (cats ?? []) as MenuCategory[],
    (menuItems ?? []) as MenuItem[],
    restaurant.name,
    { bgColor: saved.bgColor, textColor: saved.textColor, subTextColor: saved.subTextColor, heroImage: saved.heroImage }
  )

  // View-only page extras: no indexing, mobile viewport, floating print
  // button (hidden on paper).
  html = html.replace('</head>', `
    <meta name="robots" content="noindex"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>
      .menu-card-print{position:fixed;bottom:18px;right:18px;z-index:50;display:flex;align-items:center;gap:8px;
        background:#f97316;color:#fff;border:none;border-radius:999px;padding:12px 20px;font-size:14px;
        font-weight:600;font-family:system-ui,sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.25);}
      @media print{.menu-card-print{display:none;}}
    </style>
  </head>`)
  html = html.replace('</body>', `
    <button class="menu-card-print" onclick="window.print()">🖨 Print</button>
  </body>`)

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
    },
  })
}
