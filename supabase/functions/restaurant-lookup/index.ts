/**
 * Edge Function: restaurant-lookup
 * Subdomain se restaurant details return karta hai — in-memory cache ke saath.
 *
 * URL: POST https://<project>.supabase.co/functions/v1/restaurant-lookup
 * Body: { "subdomain": "zara" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// In-memory cache: subdomain → restaurant data (valid for 60 seconds)
interface CachedRestaurant {
  id: string
  name: string
  subdomain: string
  plan: string
  status: string
  logo_url: string | null
  primary_color: string | null
  cachedAt: number
}

const cache = new Map<string, CachedRestaurant>()
const CACHE_TTL = 60_000 // 1 minute

Deno.serve(async (req) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const { subdomain } = await req.json()

    if (!subdomain || typeof subdomain !== 'string') {
      return new Response(
        JSON.stringify({ error: 'subdomain is required' }),
        { status: 400, headers }
      )
    }

    // Check cache first
    const cached = cache.get(subdomain)
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      return new Response(
        JSON.stringify({ ...cached, cachedAt: undefined, fromCache: true }),
        { headers }
      )
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, subdomain, plan, status, logo_url, primary_color')
      .eq('subdomain', subdomain)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'Restaurant not found' }),
        { status: 404, headers }
      )
    }

    // Update cache
    cache.set(subdomain, { ...data, cachedAt: Date.now() })

    return new Response(JSON.stringify(data), { headers })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(err) }),
      { status: 500, headers }
    )
  }
})
