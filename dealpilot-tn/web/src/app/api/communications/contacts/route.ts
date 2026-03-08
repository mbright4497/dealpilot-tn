export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const dealId = url.searchParams.get('deal_id')
  const supabase = getSupabaseSafe()
  let q = supabase.from('deal_contacts').select('*, contacts(*)')
  if(dealId && dealId !== 'all') q = q.eq('deal_id', dealId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, contacts: data })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { deal_id, name, phone, email, role } = body
  if (!deal_id || !name || !role) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  // create contact then deal_contacts link
  const supabase = getSupabaseSafe()
  const { data: contact, error: cErr } = await supabase.from('contacts').insert({ name, phone, email }).select().single()
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
  const { data, error } = await supabase.from('deal_contacts').insert({ deal_id, contact_id: contact.id, role }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, link: data })
}
