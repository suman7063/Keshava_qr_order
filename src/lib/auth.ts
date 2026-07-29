import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantId, pickStaffRestaurant } from '@/lib/restaurant'

export type StaffRole = 'admin' | 'manager' | 'superadmin'

export interface StaffContext {
  user: User
  role: StaffRole
  restaurantId: string
  /** Service-role client — every query MUST be scoped to restaurantId. */
  db: SupabaseClient
}

export interface SuperadminContext {
  user: User
  db: SupabaseClient
}

function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

async function getUser(): Promise<User | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Require a logged-in staff member. The tenant is the restaurant their role
 * belongs to (single-domain model — one owner = one restaurant), NOT the
 * request subdomain. Superadmins with no restaurant of their own fall back to
 * the subdomain / ?restaurant_id= so they can act cross-tenant.
 * Returns a NextResponse (error) when the caller is not allowed.
 */
export async function requireStaff(
  request: Request,
  opts: { adminOnly?: boolean } = {}
): Promise<StaffContext | NextResponse> {
  const user = await getUser()
  if (!user) return unauthorized()

  const db = createAdminClient()
  const { data: roles } = await db
    .from('user_roles')
    .select('role, restaurant_id, created_at')
    .eq('user_id', user.id)

  const rows = roles ?? []
  const isSuperadmin = rows.some(r => r.role === 'superadmin')

  // A superadmin can act cross-tenant when they explicitly target a restaurant.
  const hasExplicitTarget =
    new URL(request.url).searchParams.has('restaurant_id') ||
    new URL(request.url).searchParams.has('restaurant')
  if (isSuperadmin && hasExplicitTarget) {
    const restaurantId = await getRestaurantId(request)
    if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    return { user, role: 'superadmin', restaurantId, db }
  }

  // The staff member's own restaurant (deterministic: admin > manager, oldest).
  const staffRow = pickStaffRestaurant(rows)

  if (staffRow) {
    if (opts.adminOnly && staffRow.role !== 'admin' && !isSuperadmin) {
      return forbidden('Admin access required')
    }
    return {
      user,
      role: isSuperadmin ? 'superadmin' : (staffRow.role as StaffRole),
      restaurantId: staffRow.restaurant_id,
      db,
    }
  }

  // Superadmin without their own restaurant — resolve target from the request.
  if (isSuperadmin) {
    const restaurantId = await getRestaurantId(request)
    if (!restaurantId) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    return { user, role: 'superadmin', restaurantId, db }
  }

  return forbidden('No restaurant is linked to this account')
}

/** Require a logged-in superadmin (platform owner). */
export async function requireSuperadmin(): Promise<SuperadminContext | NextResponse> {
  const user = await getUser()
  if (!user) return unauthorized()

  const db = createAdminClient()
  const { data: roles } = await db
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'superadmin')

  if (!roles?.length) return forbidden('Superadmin access required')
  return { user, db }
}

export interface SessionContext {
  session: {
    id: string
    table_id: string
    restaurant_id: string
    customer_name: string | null
    bill_requested: boolean
    status: string
  }
  db: SupabaseClient
}

/**
 * Customer authorization: the 6-digit table join code (returned once at
 * session creation) acts as the bearer token for session-scoped actions.
 * Read from the `x-session-code` header or an explicit argument.
 */
export async function requireSessionAccess(
  request: Request,
  sessionId: string,
  code?: string | null
): Promise<SessionContext | NextResponse> {
  const provided = (code ?? request.headers.get('x-session-code') ?? '').trim()
  if (!sessionId || !/^\d{6}$/.test(provided)) return unauthorized('Session code required')

  // The session (an unguessable UUID) + its 6-digit code IS the auth. Resolve
  // the tenant FROM the session itself — never from the request's subdomain /
  // restaurant_id (which is 'default' on the single shared domain).
  const db = createAdminClient()
  const { data: session } = await db
    .from('table_sessions')
    .select('id, table_id, restaurant_id, customer_name, bill_requested, status, otp, otp_attempts')
    .eq('id', sessionId)
    .single()

  if (!session || session.status !== 'active') {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // The correct code ALWAYS works (and resets the counter). This means a
  // stranger spamming wrong guesses can never lock out the real diners who
  // hold the code — it only caps how many WRONG guesses an attacker can make.
  if (session.otp !== provided) {
    if (session.otp_attempts >= 10) {
      return NextResponse.json({ error: 'Too many attempts. Please ask staff to reopen the table.' }, { status: 429 })
    }
    await db
      .from('table_sessions')
      .update({ otp_attempts: session.otp_attempts + 1 })
      .eq('id', session.id)
    return unauthorized('Invalid session code')
  }
  if (session.otp_attempts > 0) {
    await db.from('table_sessions').update({ otp_attempts: 0 }).eq('id', session.id)
  }

  return {
    session: {
      id: session.id,
      table_id: session.table_id,
      restaurant_id: session.restaurant_id,
      customer_name: session.customer_name,
      bill_requested: session.bill_requested,
      status: session.status,
    },
    db,
  }
}

/** Best-effort audit trail; failures never block the request. */
export async function auditLog(entry: {
  restaurant_id?: string | null
  actor_id?: string | null
  action: string
  entity?: string
  entity_id?: string
  details?: Record<string, unknown>
}) {
  try {
    const db = createAdminClient()
    await db.from('audit_logs').insert(entry)
  } catch {
    // ignore — audit logging must not break the main flow
  }
}
