import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('table_sessions')
    .select('*, table:restaurant_tables(*)')
    .order('started_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json([], { status: 500 })
  return NextResponse.json(data)
}
