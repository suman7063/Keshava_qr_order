import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'
import { effectivePlan } from '@/lib/plans'

const MAX_ROWS = 500

interface ImportRow {
  category?: string
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
  const rows: { category: string; name: string; price: number; is_vegetarian: boolean; description: string | null }[] = []
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
      name,
      price,
      is_vegetarian: r.is_vegetarian !== false,
      description: typeof r.description === 'string' && r.description.trim() ? r.description.trim().slice(0, 1000) : null,
    })
  }

  // Existing categories (create the missing ones)
  const { data: cats } = await ctx.db
    .from('menu_categories')
    .select('id, name')
    .eq('restaurant_id', ctx.restaurantId)
  const catByLower = new Map((cats || []).map(c => [c.name.toLowerCase(), c.id as string]))

  const missing = [...new Set(rows.map(r => r.category).filter(c => !catByLower.has(c.toLowerCase())))]
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

  // Skip duplicates: same item name (case-insensitive) in the same category
  const { data: existingItems } = await ctx.db
    .from('menu_items')
    .select('name, category_id')
    .eq('restaurant_id', ctx.restaurantId)
  const existingKeys = new Set((existingItems || []).map(i => `${i.category_id}:${(i.name as string).toLowerCase()}`))

  const toInsert: typeof rows = []
  let skipped = 0
  for (const r of rows) {
    const categoryId = catByLower.get(r.category.toLowerCase())!
    const key = `${categoryId}:${r.name.toLowerCase()}`
    if (existingKeys.has(key)) { skipped++; continue }
    existingKeys.add(key) // also dedupes repeats inside the CSV itself
    toInsert.push(r)
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ items_created: 0, categories_created: categoriesCreated, skipped })
  }

  // Plan limit
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

  const { data: inserted, error } = await ctx.db
    .from('menu_items')
    .insert(toInsert.map((r, i) => ({
      restaurant_id: ctx.restaurantId,
      category_id: catByLower.get(r.category.toLowerCase())!,
      name: r.name,
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
  })
}
