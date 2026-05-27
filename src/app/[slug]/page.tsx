import { createClient } from '@/lib/supabase/server'
import HomeClient from '../HomeClient'

export default async function RestaurantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurants')
    .select('id, name, subdomain, phone, status')
    .eq('subdomain', slug)
    .eq('status', 'active')
    .single()

  return <HomeClient restaurant={data ?? null} />
}
