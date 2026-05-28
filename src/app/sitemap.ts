import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('subdomain, updated_at')
    .eq('status', 'active')
    .neq('subdomain', 'default')

  const restaurantUrls: MetadataRoute.Sitemap = (restaurants ?? []).map(r => ({
    url: `https://bicres.com/${r.subdomain}`,
    lastModified: r.updated_at ?? new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [
    {
      url: 'https://bicres.com',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://bicres.com/onboard',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...restaurantUrls,
  ]
}
