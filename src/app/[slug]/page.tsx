import type { Metadata } from 'next'
import Script from 'next/script'
import { createPublicClient } from '@/lib/supabase/public'
import HomeClient from '../HomeClient'

// ISR: regenerate at most every 5 minutes; restaurant profiles change rarely.
export const revalidate = 300

// No paths are prebuilt — each restaurant page is generated on first
// visit, then served statically and refreshed per `revalidate`.
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
    .select('name, subdomain, phone')
    .eq('subdomain', slug)
    .eq('status', 'active')
    .single()

  if (!data) {
    return {
      title: 'Restaurant Not Found | bicres',
      robots: { index: false, follow: false },
    }
  }

  const title = `${data.name} — Digital Menu | bicres`
  const description = `View the digital menu of ${data.name}. Scan the QR code at your table or browse online and order instantly. Powered by bicres.`
  const url = `https://bicres.com/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'bicres',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('restaurants')
    .select('id, name, subdomain, phone, status, address, logo_url, cover_image_url, cover_overlay, maps_url, opening_hours, accepting_orders')
    .eq('subdomain', slug)
    .eq('status', 'active')
    .single()

  const restaurant = data ?? null

  const jsonLd = restaurant
    ? {
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name: restaurant.name,
        url: `https://bicres.com/${restaurant.subdomain}`,
        ...(restaurant.phone && { telephone: restaurant.phone }),
        ...(restaurant.address && { address: restaurant.address }),
        ...(restaurant.opening_hours && { openingHours: restaurant.opening_hours }),
        ...(restaurant.logo_url && { logo: restaurant.logo_url }),
        ...(restaurant.cover_image_url && { image: restaurant.cover_image_url }),
        hasMenu: {
          '@type': 'Menu',
          url: `https://bicres.com/${restaurant.subdomain}/menu`,
        },
        servesCuisine: 'Various',
        potentialAction: {
          '@type': 'OrderAction',
          target: `https://bicres.com/${restaurant.subdomain}/menu`,
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        <Script
          id="json-ld-restaurant"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <HomeClient restaurant={restaurant} />
    </>
  )
}
