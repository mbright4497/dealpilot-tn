import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const getSupabase = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )
}

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({})) as any
    const { dealId, limit } = body || {}
    if(!dealId) return NextResponse.json({ error: 'dealId required' }, { status: 400 })
    const sb = getSupabase()
    const { data, error } = await sb.from('deal_activity_log').select('id, deal_id, message, metadata, created_at, recipient').eq('deal_id', dealId).order('created_at', { ascending: false }).limit(limit || 5)
    if(error) return NextResponse.json({ error: String(error) }, { status: 500 })
    return NextResponse.json({ ok:true, results: data })
  }catch(e:any){ return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
