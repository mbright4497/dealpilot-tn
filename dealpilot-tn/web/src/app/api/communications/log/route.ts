export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'

export async function GET(req: Request){
  const url = new URL(req.url)
  const contactId = url.searchParams.get('contact_id')
  if(!contactId) return NextResponse.json({ error:'missing contact_id' }, { status:400 })
  const supabase = getSupabaseSafe()
  const { data, error } = await supabase.from('communication_log').select('*').eq('contact_id', contactId).order('created_at', { ascending: true })
  if(error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json({ ok:true, logs: data })
}

export async function POST(req: Request){
  const body = await req.json()
  const { contact_id, deal_id, channel, message_body, template_id, status } = body
  if(!contact_id || !channel) return NextResponse.json({ error:'missing fields' }, { status:400 })
  const supabase = getSupabaseSafe()
  const payload:any = { contact_id, deal_id: deal_id||null, channel, body: message_body||null, template_id: template_id||null, status: status||'sent' }
  const { data, error } = await supabase.from('communication_log').insert(payload).select().single()
  if(error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json({ ok:true, log: data })
}
