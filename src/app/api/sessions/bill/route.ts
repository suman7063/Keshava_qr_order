import { NextResponse } from 'next/server'
import { requireSessionAccess } from '@/lib/auth'

export async function POST(request: Request) {
  let body: { session_id?: string; session_code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { session_id, session_code } = body
  if (!session_id) return NextResponse.json({ error: 'session_id is required' }, { status: 400 })

  const access = await requireSessionAccess(request, session_id, session_code)
  if (access instanceof NextResponse) return access

  const { error } = await access.db
    .from('table_sessions')
    .update({ bill_requested: true })
    .eq('id', access.session.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
