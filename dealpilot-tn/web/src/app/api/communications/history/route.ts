export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const contactId = url.searchParams.get('contact_id')
  const dealId = url.searchParams.get('deal_id')
  if (!contactId) return NextResponse.json({ error: 'missing contact_id' }, { status: 400 })

  const supabase = getSupabaseSafe()
  let query = supabase.from('communication_log').select('*').eq('contact_id', contactId)
  if (dealId) query = query.eq('deal_id', dealId)
  query = query.order('created_at', { ascending: true })
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, history: data })
}
