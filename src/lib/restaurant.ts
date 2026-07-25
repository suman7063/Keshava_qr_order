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

type RoleRow = { role: string; restaurant_id: string | null; created_at?: string | null }

/**
 * Deterministically pick a staff member's "own" restaurant from their roles.
 * Priority: admin > manager, then oldest role first. Used by BOTH the read
 * and write paths so a multi-restaurant user never gets a split view.
 */
export function pickStaffRestaurant(rows: RoleRow[]): { restaurant_id: string; role: string } | null {
  const rank = (r: string) => (r === 'admin' ? 0 : r === 'manager' ? 1 : 2)
  const sorted = rows
    .filter(r => r.restaurant_id)
    .sort((a, b) => rank(a.role) - rank(b.role) || String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')))
  const top = sorted[0]
  return top?.restaurant_id ? { restaurant_id: top.restaurant_id, role: top.role } : null
}

/** The logged-in staff member's own restaurant id (deterministic), or null. */
export async function getOwnRestaurantId(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_roles')
    .select('role, restaurant_id, created_at')
    .eq('user_id', userId)
  return pickStaffRestaurant(data ?? [])?.restaurant_id ?? null
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
    const own = await getOwnRestaurantId(user.id)
    if (own) return own
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
