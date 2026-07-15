import { createClient } from '@supabase/supabase-js'

/**
 * Cookie-less anon client for public, cacheable pages (ISR).
 * The cookie-based server client calls cookies(), which forces dynamic
 * rendering — never use it in a route with `export const revalidate`.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
