import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({})) as any
    const { dealId, limit } = body || {}
    if(!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    if(!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'supabase not configured' }, { status: 500 })
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const { data, error } = await sb.from('deal_activity_log').select('id, deal_id, message, metadata, created_at, recipient').eq('deal_id', dealId).order('created_at', { ascending: false }).limit(limit || 5)
    if(error) return NextResponse.json({ error: String(error) }, { status: 500 })
    return NextResponse.json({ ok:true, results: data })
  }catch(e:any){ return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
