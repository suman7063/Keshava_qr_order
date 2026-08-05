import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'

// Wipe the menu (admin only). Items that appear in past orders cannot be
// deleted (order history must keep its references) — those are kept but
// marked unavailable. Categories and kitchens are left untouched.
export async function POST(request: Request) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { data: items } = await ctx.db
    .from('menu_items')
    .select('id')
    .eq('restaurant_id', ctx.restaurantId)
  const ids = (items || []).map(i => i.id as string)
  if (ids.length === 0) return NextResponse.json({ deleted: 0, kept: 0 })

  // Which items are referenced by orders?
  const referenced = new Set<string>()
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const { data: refs } = await ctx.db
      .from('order_items')
      .select('menu_item_id')
      .in('menu_item_id', chunk)
    for (const r of refs || []) referenced.add(r.menu_item_id as string)
  }

  const deletable = ids.filter(id => !referenced.has(id))
  const kept = ids.filter(id => referenced.has(id))

  for (let i = 0; i < deletable.length; i += 200) {
    const chunk = deletable.slice(i, i + 200)
    const { error } = await ctx.db
      .from('menu_items')
      .delete()
      .in('id', chunk)
      .eq('restaurant_id', ctx.restaurantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (kept.length > 0) {
    await ctx.db
      .from('menu_items')
      .update({ is_available: false })
      .in('id', kept)
      .eq('restaurant_id', ctx.restaurantId)
  }

  return NextResponse.json({ deleted: deletable.length, kept: kept.length })
}
