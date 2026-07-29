import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'
import MenuViewClient from './MenuViewClient'

// ISR: same policy as the restaurant home page — menus change occasionally.
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('restaurants')
    .select('name')
    .eq('subdomain', slug)
    .eq('status', 'active')
    .single()

  if (!data) {
    return { title: 'Menu Not Found | bicres', robots: { index: false, follow: false } }
  }

  const title = `${data.name} — Menu | bicres`
  const description = `Browse the full menu of ${data.name} — dishes, photos and prices. To order, scan the QR code at your table.`
  return {
    title,
    description,
    alternates: { canonical: `https://bicres.com/${slug}/menu` },
    openGraph: { title, description, url: `https://bicres.com/${slug}/menu`, type: 'website', siteName: 'bicres' },
  }
}

export default async function PublicMenuPage({ params }: Props) {
  const { slug } = await params
  const supabase = createPublicClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, subdomain, phone, logo_url, primary_color, accepting_orders')
    .eq('subdomain', slug)
    .eq('status', 'active')
    .single()

  if (!restaurant) notFound()

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, description, display_order')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('menu_items')
      .select('id, category_id, name, description, price, image_url, is_vegetarian, display_order')
      .eq('restaurant_id', restaurant.id)
      .eq('is_available', true)
      .order('display_order'),
  ])

  return (
    <MenuViewClient
      restaurant={restaurant}
      categories={categories ?? []}
      items={items ?? []}
    />
  )
}
