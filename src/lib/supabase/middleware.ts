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
    // Still refresh the auth session cookie
    await supabase.auth.getUser()
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()
  const loginPath = needsSuperadmin ? '/superadmin/login' : needsAdmin ? '/admin/login' : '/manager/login'

  if (!user) {
    return NextResponse.redirect(new URL(loginPath, request.url))
  }

  // Roles are tenant-scoped: an admin of restaurant A has no access on
  // restaurant B's subdomain. Superadmin passes everywhere.
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role, restaurant_id')
    .eq('user_id', user.id)

  const roleRows = (roles || []) as RoleRow[]
  const isSuperadmin = roleRows.some(r => r.role === 'superadmin')

  if (needsSuperadmin) {
    if (!isSuperadmin) {
      return NextResponse.redirect(new URL('/superadmin/login?error=unauthorized', request.url))
    }
    return supabaseResponse
  }

  if (isSuperadmin) return supabaseResponse

  // Resolve the tenant for this subdomain to match against the user's roles.
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('subdomain', subdomain || 'default')
    .single()

  const tenantRole = roleRows.find(r => r.restaurant_id === restaurant?.id)?.role

  if (needsAdmin && tenantRole !== 'admin') {
    return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url))
  }
  if (needsManager && tenantRole !== 'manager' && tenantRole !== 'admin') {
    return NextResponse.redirect(new URL('/manager/login?error=unauthorized', request.url))
  }

  return supabaseResponse
}
