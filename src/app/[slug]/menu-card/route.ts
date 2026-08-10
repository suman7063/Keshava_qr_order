import { createAdminClient } from '@/lib/supabase/admin'
import { getPdfHTML, PDF_TEMPLATES, type PdfOptions } from '@/lib/pdf-templates'
import type { MenuItem, MenuCategory } from '@/types'

// Read-only menu card: scanning the Menu QR lands here. No ordering, no
// actions — just the menu rendered in whatever PDF template (+ colours)
// the owner saved from Admin → Menu → Menu Style.
//
// Cached & regenerated at most every 60s so scans are instant; saving a
// new style revalidates the path immediately (see the settings PATCH).
export const dynamic = 'force-static'
export const revalidate = 60

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

  const saved = (settings?.menu_pdf ?? {}) as { template?: string } & PdfOptions
  const templateId = PDF_TEMPLATES.some(t => t.id === saved.template) ? saved.template! : 'pdf1'

  let html = getPdfHTML(
    templateId,
    (cats ?? []) as MenuCategory[],
    (menuItems ?? []) as MenuItem[],
    restaurant.name,
    saved
  )

  // View-only page extras: no indexing, mobile viewport. Deliberately no
  // print button — this page is what CUSTOMERS see after a scan; the owner
  // prints from Admin → Menu → Menu Style instead.
  html = html.replace('</head>', `
    <meta name="robots" content="noindex"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <style>
      /* Phones: shrink the whole design uniformly (text, spacing, columns)
         so desktop-sized templates fit a narrow screen without breaking. */
      @media (max-width: 640px){ body{ zoom: 0.75; } }
      @media (max-width: 400px){ body{ zoom: 0.65; } }
    </style>
  </head>`)

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
