export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({}))
    const { actionType, dealId, playbookRuleId, milestone_key } = body as any
    if(!dealId || !(playbookRuleId || milestone_key)) return NextResponse.json({ error: 'missing_params' }, { status:400 })
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if(!SUPABASE_URL || !SUPABASE_KEY) return NextResponse.json({ error: 'supabase_not_configured' }, { status:500 })
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
    const key = milestone_key || (await (async ()=>{ const r = await sb.from('deal_playbook_rules').select('milestone_key').eq('id', playbookRuleId).maybeSingle(); return r?.data?.milestone_key || null })())
    if(!key) return NextResponse.json({ error: 'no_key' }, { status:400 })
    const now = new Date().toISOString()
    const insert = { deal_id: Number(dealId), milestone_key: key, status: 'completed', completed_at: now, completed_by: 'user', notes: `Executed action: ${actionType || ''}` }
    const { data, error } = await sb.from('deal_playbook_progress').upsert(insert, { onConflict: ['deal_id','milestone_key'] }).select().maybeSingle()
    if(error) { console.error('execute-action upsert error', error); return NextResponse.json({ error: String(error.message||error) }, { status:500 }) }
    return NextResponse.json({ ok:true, progress: data })
  }catch(err:any){ console.error('execute-action error', err); return NextResponse.json({ error: String(err?.message||err) }, { status:500 }) }
}
