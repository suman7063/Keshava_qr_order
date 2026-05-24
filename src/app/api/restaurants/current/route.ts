import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_SUBDOMAIN = process.env.DEFAULT_SUBDOMAIN || 'default'

export async function GET(request: Request) {
  const subdomain = request.headers.get('x-subdomain') || ''

  if (!subdomain || subdomain === DEFAULT_SUBDOMAIN) {
    return NextResponse.json(null)
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurants')
    .select('id, name, subdomain, phone, status')
    .eq('subdomain', subdomain)
    .eq('status', 'active')
    .single()

  return NextResponse.json(data ?? null)
}
