import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { global: { fetch: (url:any, opts:any={}) => fetch(url, { ...opts, cache:'no-store' }) } }
)

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { dealId, key, status } = body || {}
    if(!dealId || !key) return NextResponse.json({ error: 'invalid payload' }, { status: 400 })

    // upsert into deal_checklist table
    const payload = { deal_id: dealId, item_key: String(key), status: String(status), updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('deal_checklist').upsert(payload, { onConflict: 'deal_id,item_key' }).select().single()
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, row: data })
  }catch(e:any){ return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
