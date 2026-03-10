export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({}))
    const { dealId, milestone_key, completed_by, notes } = body as any
    if(!dealId || !milestone_key) return NextResponse.json({ error: 'missing_params' }, { status: 400 })

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if(!SUPABASE_URL || !SUPABASE_KEY) return NextResponse.json({ error: 'supabase_not_configured' }, { status:500 })
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

    const now = new Date().toISOString()
    const insert = { deal_id: dealId, milestone_key, status: 'completed', completed_at: now, completed_by: completed_by || null, notes: notes || null }
    // upsert
    const { data, error } = await sb.from('deal_playbook_progress').upsert(insert, { onConflict: ['deal_id','milestone_key'] }).select().maybeSingle()
    if(error) { console.error('playbook-progress upsert error', error); return NextResponse.json({ error: String(error.message||error) }, { status:500 }) }
    return NextResponse.json({ ok:true, progress: data })
  }catch(err:any){ console.error('playbook-progress error', err); return NextResponse.json({ error: String(err?.message||err) }, { status:500 }) }
}
