export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

export async function GET(req: Request){
  try{
    const url = new URL(req.url)
    const dealId = url.searchParams.get('dealId')
    if(!dealId) return NextResponse.json({ notes: [] })
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
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
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data, error } = await sb.from('deal_notes').insert([{ deal_id: Number(dealId), author: author||null, content }]).select().maybeSingle()
    if(error) throw error
    return NextResponse.json({ ok:true, note: data })
  }catch(err:any){ console.error('deal-notes POST error', err); return NextResponse.json({ error: String(err?.message||err) }, { status:500 }) }
}
