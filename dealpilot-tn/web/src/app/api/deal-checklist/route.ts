export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { global: { fetch: (url:any, opts:any={}) => fetch(url, { ...opts, cache:'no-store' }) } }
)

export async function GET(req: Request){
  const params = new URL(req.url).searchParams
  const dealId = params.get('dealId')
  if(!dealId) return NextResponse.json({ error: 'Missing dealId' }, { status: 400 })
  const { data, error } = await supabase
    .from('checklists')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
  if(error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { dealId, key, status } = body || {}
    if(!dealId || !key) return NextResponse.json({ error: 'invalid payload' }, { status: 400 })

    // upsert into checklists table
    const payload = { deal_id: dealId, title: String(key), status: String(status), metadata: {} }
    const { data, error } = await supabase.from('checklists').upsert(payload, { onConflict: 'deal_id,title' }).select().single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, row: data })
  }catch(e:any){ return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
