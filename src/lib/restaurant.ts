import { createClient } from '@/lib/supabase/server'

const MAIN_DOMAIN = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'bicres.com'
const DEFAULT_SUBDOMAIN = process.env.DEFAULT_SUBDOMAIN || 'default'

/**
 * Extract subdomain from x-subdomain header (set by middleware).
 * Falls back to DEFAULT_SUBDOMAIN for local dev / main domain requests.
 */
export function getSubdomain(request: Request): string {
  return request.headers.get('x-subdomain') || DEFAULT_SUBDOMAIN
}

/**
 * Resolve subdomain → restaurant UUID.
 * Returns null if restaurant not found or inactive.
 */
export async function getRestaurantId(request: Request): Promise<string | null> {
  const subdomain = getSubdomain(request)
  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('subdomain', subdomain)
    .eq('status', 'active')
    .single()
  return data?.id ?? null
}

/**
 * Extract subdomain from a Host header string.
 * Used in middleware (no request object available there).
 */
export function extractSubdomainFromHost(host: string): string {
  if (host.endsWith(`.${MAIN_DOMAIN}`)) {
    return host.replace(`.${MAIN_DOMAIN}`, '')
  }
  // localhost or main domain itself — use default
  return DEFAULT_SUBDOMAIN
}
