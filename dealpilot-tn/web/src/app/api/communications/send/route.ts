export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'

export async function POST(req: Request){
  const body = await req.json()
  const { deal_id, contact_id, channel, body: content, template_id } = body
  if(!deal_id || !contact_id || !channel) return NextResponse.json({ error:'missing fields' }, { status:400 })
  // Log to communication_log
  const supabase = getSupabaseSafe()
  const payload:any = { deal_id, contact_id, channel, subject: null, body: content || null, template_id: template_id || null, status: 'queued', is_automated: false }
  const { data, error } = await supabase.from('communication_log').insert(payload).select().single()
  if(error) return NextResponse.json({ error: error.message }, { status:500 })
  // TODO: enqueue/send via GHL or provider in Phase 2
  return NextResponse.json({ ok:true, log: data })
}
