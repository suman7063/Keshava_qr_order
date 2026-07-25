import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff(request, { adminOnly: true })
  if (ctx instanceof NextResponse) return ctx

  const { id } = await params

  // The category must belong to this restaurant.
  const { data: cat } = await ctx.db
    .from('menu_categories')
    .select('id')
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .single()
  if (!cat) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  // Refuse to delete a category that still has items (would cascade-delete them).
  const { count } = await ctx.db
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .eq('restaurant_id', ctx.restaurantId)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Move or delete this category’s items before deleting it.' },
      { status: 409 }
    )
  }

  const { error } = await ctx.db
    .from('menu_categories')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
