import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )
}

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({})) as any
    const { dealId, recipient, message } = body || {}
    if(!dealId || !recipient || !message) return NextResponse.json({ error: 'dealId, recipient, message required' }, { status: 400 })
    if(!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'supabase not configured' }, { status: 500 })
    const sb = getSupabase()
    const now = new Date().toISOString()
    const payload = { deal_id: dealId, message: message, recipient: recipient, created_at: now }
    const { error } = await sb.from('deal_activity_log').insert(payload)
    if(error) return NextResponse.json({ error: String(error) }, { status: 500 })
    return NextResponse.json({ ok:true })
  }catch(e:any){ return NextResponse.json({ error: String(e?.message||e) }, { status:500 }) }
}
