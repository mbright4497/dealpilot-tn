import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({})) as any
    const { dealId, recipient, message } = body || {}
    if(!dealId || !recipient || !message) return NextResponse.json({ error: 'dealId, recipient, message required' }, { status: 400 })
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    if(!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'supabase not configured' }, { status: 500 })
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const now = new Date().toISOString()
    const payload = { deal_id: dealId, message: message, recipient: recipient, created_at: now }
    const { error } = await sb.from('deal_activity_log').insert(payload)
    if(error) return NextResponse.json({ error: String(error) }, { status: 500 })
    return NextResponse.json({ ok:true })
  }catch(e:any){ return NextResponse.json({ error: String(e?.message||e) }, { status:500 }) }
}
