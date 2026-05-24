import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Admin routes protect karo (login page ko chodo)
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url))
    }
  }

  // Manager routes protect karo (login page ko chodo)
  if (path.startsWith('/manager') && !path.startsWith('/manager/login')) {
    if (!user) {
      return NextResponse.redirect(new URL('/manager/login', request.url))
    }
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleData?.role !== 'manager' && roleData?.role !== 'admin') {
      return NextResponse.redirect(new URL('/manager/login?error=unauthorized', request.url))
    }
  }

  return supabaseResponse
}
