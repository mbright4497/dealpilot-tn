export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    global: {
      fetch: (url: any, options: any = {}) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  }
)

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const dealId = params.get('dealId')
  if (!dealId) {
    return NextResponse.json({ error: 'Missing dealId' }, { status: 400 })
  }
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('resource_id', dealId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
