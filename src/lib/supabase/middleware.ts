import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type RoleRow = { role: string; restaurant_id: string | null }

export async function updateSession(request: NextRequest, subdomain?: string) {
  // Inject subdomain into forwarded request headers so API routes can read it
  const requestHeaders = new Headers(request.headers)
  if (subdomain) requestHeaders.set('x-subdomain', subdomain)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const path = request.nextUrl.pathname

  const needsAdmin = path.startsWith('/admin')
    && !path.startsWith('/admin/login')
    && !path.startsWith('/admin/forgot-password')
    && !path.startsWith('/admin/reset-password')
  const needsManager = (path.startsWith('/manager') && !path.startsWith('/manager/login')) || path.startsWith('/kitchen')
  const needsSuperadmin = path.startsWith('/superadmin') && !path.startsWith('/superadmin/login')

  if (!needsAdmin && !needsManager && !needsSuperadmin) {
    // API routes authenticate themselves (requireStaff / requireSessionAccess)
    // and the browser client keeps the session cookie fresh, so skip the
    // auth-server round-trip here — it just adds latency to every /api call.
    // Other public paths still refresh the session cookie.
    if (!path.startsWith('/api')) {
      await supabase.auth.getUser()
    }
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // One unified login for everyone — it routes to the right area by role.
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Single-domain model: this is just a gate that the user HAS the right kind
  // of role. The actual tenant scoping (which restaurant's data they see) is
  // enforced per-request in requireStaff, based on the user's own restaurant.
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role, restaurant_id')
    .eq('user_id', user.id)

  const roleRows = (roles || []) as RoleRow[]
  const isSuperadmin = roleRows.some(r => r.role === 'superadmin')

  if (needsSuperadmin) {
    if (!isSuperadmin) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
    }
    return supabaseResponse
  }

  if (isSuperadmin) return supabaseResponse

  const hasAdmin = roleRows.some(r => r.role === 'admin')
  const hasManager = roleRows.some(r => r.role === 'manager' || r.role === 'admin')

  if (needsAdmin && !hasAdmin) {
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }
  if (needsManager && !hasManager) {
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
  }

  return supabaseResponse
}
