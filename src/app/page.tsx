import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import HomeClient from './HomeClient'

const DEFAULT_SUBDOMAIN = process.env.DEFAULT_SUBDOMAIN || 'default'

export default async function Home() {
  const headersList = await headers()
  const subdomain = headersList.get('x-subdomain') || ''

  let restaurant = null
  if (subdomain && subdomain !== DEFAULT_SUBDOMAIN) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('restaurants')
      .select('id, name, subdomain, phone, status')
      .eq('subdomain', subdomain)
      .eq('status', 'active')
      .single()
    restaurant = data ?? null
  }

  return <HomeClient restaurant={restaurant} />
}
