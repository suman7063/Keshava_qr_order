import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'
import { effectivePlan } from '@/lib/plans'

const MAX_ROWS = 500

interface ImportRow {
  category?: string
  subcategory?: string
  name?: string
  price?: number | string
  is_vegetarian?: boolean
  description?: string
}

// Bulk menu import from CSV (admin only): creates missing categories,
// skips exact duplicates (same name in the same category), enforces the
// plan's item limit, then inserts everything in one go.
export async function POST(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  let body: { rows?: ImportRow[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const raw = body.rows
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
  }
  if (raw.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows — up to ${MAX_ROWS} per import` }, { status: 400 })
  }

  // Validate + normalise
  const rows: { category: string; subcategory: string | null; name: string; price: number; is_vegetarian: boolean; description: string | null }[] = []
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i]
    const category = String(r.category ?? '').trim().slice(0, 100)
    const name = String(r.name ?? '').trim().slice(0, 200)
    const price = Number(r.price)
    if (!category || !name) {
      return NextResponse.json({ error: `Row ${i + 1}: category and name are required` }, { status: 400 })
    }
    if (Number.isNaN(price) || price < 0 || price > 1_000_000) {
      return NextResponse.json({ error: `Row ${i + 1} ("${name}"): invalid price` }, { status: 400 })
    }
    rows.push({
      category,
      subcategory: typeof r.subcategory === 'string' && r.subcategory.trim() ? r.subcategory.trim().slice(0, 100) : null,
      name,
      price,
      is_vegetarian: r.is_vegetarian !== false,
      description: typeof r.description === 'string' && r.description.trim() ? r.description.trim().slice(0, 1000) : null,
    })
  }

  // Everything below is checked BEFORE any write — a rejected import must
  // leave the menu completely untouched (no half-created categories).
  const { data: cats } = await ctx.db
    .from('menu_categories')
    .select('id, name')
    .eq('restaurant_id', ctx.restaurantId)
  const catByLower = new Map((cats || []).map(c => [c.name.toLowerCase(), c.id as string]))

  // Skip duplicates: same item name (case-insensitive) in the same category —
  // keyed by category name for rows whose category doesn't exist yet.
  // Archived items don't block a re-import of the same name
  const { data: existingItems } = await ctx.db
    .from('menu_items')
    .select('id, name, category_id, subcategory')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('is_archived', false)
  const existingByKey = new Map((existingItems || []).map(i => [`${i.category_id}:${(i.name as string).toLowerCase()}`, i]))

  const seen = new Set<string>()
  const toInsert: typeof rows = []
  // Re-importing the same CSV with a (new) Subcategory column backfills
  // the labels onto already-imported items instead of doing nothing.
  const subcatUpdates: { id: string; subcategory: string }[] = []
  let skipped = 0
  for (const r of rows) {
    const catLower = r.category.toLowerCase()
    const catId = catByLower.get(catLower)
    const key = catId ? `${catId}:${r.name.toLowerCase()}` : `new:${catLower}:${r.name.toLowerCase()}`
    const existing = catId ? existingByKey.get(key) : undefined
    if (existing || seen.has(key)) {
      if (existing && r.subcategory && r.subcategory !== existing.subcategory) {
        subcatUpdates.push({ id: existing.id as string, subcategory: r.subcategory })
      }
      skipped++
      continue
    }
    seen.add(key)
    toInsert.push(r)
  }

  for (const u of subcatUpdates) {
    await ctx.db.from('menu_items').update({ subcategory: u.subcategory })
      .eq('id', u.id).eq('restaurant_id', ctx.restaurantId)
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ items_created: 0, categories_created: 0, skipped, subcategories_updated: subcatUpdates.length })
  }

  // Plan limit — fail before creating anything
  const { data: restaurant } = await ctx.db
    .from('restaurants')
    .select('plan, trial_ends_at')
    .eq('id', ctx.restaurantId)
    .single()
  const plan = effectivePlan(restaurant ?? { plan: 'free', trial_ends_at: null })
  const existingCount = existingItems?.length || 0
  if (existingCount + toInsert.length > plan.maxMenuItems) {
    return NextResponse.json(
      { error: `Your ${plan.label} plan allows up to ${plan.maxMenuItems} menu items — you have ${existingCount} and the CSV adds ${toInsert.length} more. Upgrade or trim the CSV.` },
      { status: 403 }
    )
  }

  // Passed all checks — now create the missing categories
  const missing = [...new Set(toInsert.map(r => r.category).filter(c => !catByLower.has(c.toLowerCase())))]
  let categoriesCreated = 0
  if (missing.length > 0) {
    const { data: created, error: catError } = await ctx.db
      .from('menu_categories')
      .insert(missing.map((name, i) => ({
        name,
        restaurant_id: ctx.restaurantId,
        display_order: (cats?.length || 0) + i,
      })))
      .select('id, name')
    if (catError) return NextResponse.json({ error: catError.message }, { status: 500 })
    for (const c of created || []) catByLower.set((c.name as string).toLowerCase(), c.id as string)
    categoriesCreated = created?.length || 0
  }

  const { data: inserted, error } = await ctx.db
    .from('menu_items')
    .insert(toInsert.map((r, i) => ({
      restaurant_id: ctx.restaurantId,
      category_id: catByLower.get(r.category.toLowerCase())!,
      name: r.name,
      subcategory: r.subcategory,
      price: r.price,
      description: r.description,
      is_vegetarian: r.is_vegetarian,
      is_vegan: false,
      is_available: true,
      display_order: existingCount + i,
    })))
    .select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    items_created: inserted?.length || 0,
    categories_created: categoriesCreated,
    skipped,
    subcategories_updated: subcatUpdates.length,
  })
}
