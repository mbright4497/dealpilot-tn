export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request){
  try{
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    if(!SUPABASE_URL || !SUPABASE_KEY) return NextResponse.json({ actions: [] })
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

    // load rules and active deals
    const { data: rules } = await sb.from('deal_playbook_rules').select('*')
    const { data: deals } = await sb.from('transactions').select('*').neq('current_state','closed').neq('current_state','Cancelled')
    const dealIds = (deals||[]).map((d:any)=>d.id)
    const { data: progress } = await sb.from('deal_playbook_progress').select('*').in('deal_id', dealIds)

    const today = new Date()
    // build action candidates: for each deal, each rule not completed -> compute expected date and urgency
    const candidates:any[] = []
    for(const d of (deals||[])){
      for(const r of (rules||[])){
        const matched = (progress||[]).find((p:any)=> p.deal_id===d.id && p.milestone_key===r.milestone_key)
        const completed = !!matched && (matched.status==='completed' || matched.status==='done')
        if(completed) continue
        // compute expected date
        const binding = d.binding_date || d.binding || d.binding_agreement_date || null
        const closing = d.closing_date || d.closing || null
        let expected: Date | null = null
        if(r.days_from_binding != null && binding) { const b=new Date(binding); b.setDate(b.getDate()+Number(r.days_from_binding)); expected = b }
        if(!expected && r.days_before_closing != null && closing){ const c=new Date(closing); c.setDate(c.getDate()-Number(r.days_before_closing)); expected = c }
        let daysDiff = null
        if(expected) daysDiff = Math.ceil(((expected as Date).getTime()-today.getTime())/(1000*60*60*24))
        // simple urgency calc
        const urgency = (r.priority==='critical' || (daysDiff!=null && daysDiff<0)) ? 'critical' : (r.priority==='high' || (daysDiff!=null && daysDiff<=3) ? 'high' : 'normal')
        candidates.push({ dealId: d.id, address: d.address, action: r.milestone_label, reason: r.description || '', priority: r.priority || 'normal', urgency, expected_date: expected? expected.toISOString(): null, days_diff: daysDiff, playbook_rule_id: r.id, milestone_key: r.milestone_key })
      }
    }
    // sort by urgency then days_diff
    const rank = { critical:0, high:1, normal:2 }
    candidates.sort((a:any,b:any)=> (rank[a.urgency]||9)-(rank[b.urgency]||9) || ((a.days_diff||999)-(b.days_diff||999)))
    const actions = candidates.slice(0,5)
    return NextResponse.json({ actions })
  }catch(err:any){ console.error('eva/actions error', err); return NextResponse.json({ actions: [] }, { status:500 }) }
}
