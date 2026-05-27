import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { extractSubdomainFromHost } from '@/lib/restaurant'

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const subdomain = extractSubdomainFromHost(host)
  return await updateSession(request, subdomain)
}

export const config = {
  // Run on all routes except static files
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
