import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const staticUrls: MetadataRoute.Sitemap = [
  { url: 'https://bicres.com', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
  { url: 'https://bicres.com/onboard', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
  { url: 'https://bicres.com/contact', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  { url: 'https://bicres.com/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  { url: 'https://bicres.com/terms', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let restaurantUrls: MetadataRoute.Sitemap = []

  try {
    const supabase = await createClient()
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('subdomain, updated_at')
      .eq('status', 'active')
      .neq('subdomain', 'default')

    restaurantUrls = (restaurants ?? []).map(r => ({
      url: `https://bicres.com/${r.subdomain}`,
      lastModified: r.updated_at ?? new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // DB unavailable — return static pages only
  }

  return [...staticUrls, ...restaurantUrls]
}
