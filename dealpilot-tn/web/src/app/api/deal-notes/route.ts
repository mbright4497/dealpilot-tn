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
export const dynamic = 'force-dynamic'

export async function GET(req: Request){
  try{
    const url = new URL(req.url)
    const dealId = url.searchParams.get('dealId')
    if(!dealId) return NextResponse.json({ notes: [] })
    const sb = getSupabase()
    const { data, error } = await sb.from('deal_notes').select('*').eq('deal_id', Number(dealId)).order('created_at', { ascending: false })
    if(error) throw error
    return NextResponse.json({ notes: data || [] })
  }catch(err:any){ console.error('deal-notes GET error', err); return NextResponse.json({ error: String(err?.message||err) }, { status:500 }) }
}

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({}))
    const { dealId, author, content } = body as any
    if(!dealId || !content) return NextResponse.json({ error: 'missing_params' }, { status:400 })
    const sb = getSupabase()
    const { data, error } = await sb.from('deal_notes').insert([{ deal_id: Number(dealId), author: author||null, content }]).select().maybeSingle()
    if(error) throw error
    return NextResponse.json({ ok:true, note: data })
  }catch(err:any){ console.error('deal-notes POST error', err); return NextResponse.json({ error: String(err?.message||err) }, { status:500 }) }
}
