import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RESERVED_SUBDOMAINS } from '@/lib/validation'

// Public: onboarding form checks name availability while typing.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const value = (searchParams.get('value') || '').toLowerCase()

  if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(value) || value.length < 2) {
    return NextResponse.json({ available: false, reason: 'invalid' })
  }
  if (RESERVED_SUBDOMAINS.includes(value)) {
    return NextResponse.json({ available: false, reason: 'reserved' })
  }

  const db = createAdminClient()
  const { data } = await db
    .from('restaurants')
    .select('id')
    .eq('subdomain', value)
    .maybeSingle()

  return NextResponse.json({ available: !data, reason: data ? 'taken' : null })
}
