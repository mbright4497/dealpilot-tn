export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'

export async function GET(req: Request){
  const url = new URL(req.url)
  const dealId = url.searchParams.get('deal_id')
  if(!dealId) return NextResponse.json({ error:'missing deal_id'}, { status:400 })
  const supabase = getSupabaseSafe()
  const { data, error } = await supabase.from('auto_update_schedule').select('*').eq('deal_id', dealId)
  if(error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json({ ok:true, schedules: data })
}

export async function POST(req: Request){
  const body = await req.json()
  const { deal_id, contact_id, template_id, frequency_hours, channel, next_send_at } = body
  if(!deal_id || !contact_id) return NextResponse.json({ error:'missing fields' }, { status:400 })
  const supabase = getSupabaseSafe()
  const { data, error } = await supabase.from('auto_update_schedule').insert({ deal_id, contact_id, template_id, frequency_hours, channel, next_send_at }).select().single()
  if(error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json({ ok:true, schedule: data })
}

export async function PUT(req: Request){
  const body = await req.json()
  const { id, next_send_at, is_active } = body
  if(!id) return NextResponse.json({ error:'missing id' }, { status:400 })
  const update:any = {}
  if(next_send_at) update.next_send_at = next_send_at
  if(typeof is_active === 'boolean') update.is_active = is_active
  const supabase = getSupabaseSafe()
  const { data, error } = await supabase.from('auto_update_schedule').update(update).eq('id', id).select().single()
  if(error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json({ ok:true, schedule: data })
}
