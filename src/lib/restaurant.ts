import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
 * Resolve the active restaurant for a request. Priority:
 *  1. ?restaurant_id=<uuid>  — customer flow (QR/menu carry their tenant)
 *  2. ?restaurant=<slug>     — customer flow by slug
 *  3. x-subdomain header     — legacy subdomain routing / default tenant
 * Returns null if not found or inactive.
 */
export async function getRestaurantId(request: Request): Promise<string | null> {
  const { searchParams } = new URL(request.url)
  const supabase = await createClient()

  const ridParam = searchParams.get('restaurant_id')
  if (ridParam) {
    const { data } = await supabase
      .from('restaurants')
      .select('id')
      .eq('id', ridParam)
      .eq('status', 'active')
      .single()
    return data?.id ?? null
  }

  const subdomain = searchParams.get('restaurant') || getSubdomain(request)
  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('subdomain', subdomain)
    .eq('status', 'active')
    .single()
  return data?.id ?? null
}

/**
 * Tenant resolution for dual-use read endpoints (menu, categories, settings)
 * that both customers AND staff hit:
 *  1. explicit ?restaurant_id / ?restaurant  — customer (menu carries tenant)
 *  2. logged-in staff                        — their own restaurant
 *  3. subdomain fallback                     — legacy
 */
export async function getReadRestaurantId(request: Request): Promise<string | null> {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('restaurant_id') || searchParams.get('restaurant')) {
    return getRestaurantId(request)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const admin = createAdminClient()
    const { data: roles } = await admin
      .from('user_roles')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .not('restaurant_id', 'is', null)
    if (roles?.[0]?.restaurant_id) return roles[0].restaurant_id
  }

  return getRestaurantId(request)
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
