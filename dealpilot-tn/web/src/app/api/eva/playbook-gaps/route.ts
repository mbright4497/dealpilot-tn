export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request){
  try{
    const body = await req.json().catch(()=>({}))
    const dealId = body?.dealId || null

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    if(!SUPABASE_URL || !SUPABASE_KEY) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 })

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

    // fetch rules
    const { data: rulesData, error: rulesErr } = await sb.from('deal_playbook_rules').select('*').order('sort_order', { ascending: true })
    if(rulesErr) console.warn('playbook rules fetch error', rulesErr)
    const rules = Array.isArray(rulesData) ? rulesData : []

    // fetch deals to analyze
    let deals: any[] = []
    if(dealId){
      const { data: deal, error: dealErr } = await sb.from('transactions').select('*').eq('id', dealId).maybeSingle()
      if(dealErr) console.warn('deal fetch error', dealErr)
      if(deal) deals = [deal]
    } else {
      // active deals (exclude Closed/Cancelled)
      const { data: allDeals, error: allErr } = await sb.from('transactions').select('*').neq('current_state','closed').neq('current_state','Cancelled')
      if(allErr) console.warn('deals fetch error', allErr)
      deals = Array.isArray(allDeals) ? allDeals : []
    }

    // fetch progress for relevant deals
    const dealIds = deals.map(d=>d.id).filter(Boolean)
    let progressRows: any[] = []
    if(dealIds.length>0){
      const { data: p, error: pErr } = await sb.from('deal_playbook_progress').select('*').in('deal_id', dealIds)
      if(pErr) console.warn('progress fetch error', pErr)
      progressRows = Array.isArray(p) ? p : []
    }

    const today = new Date()

    function computeExpectedDateForRule(rule:any, deal:any){
      // prefer binding date for days_from_binding
      const binding = deal.binding_date || deal.binding || deal.binding_agreement_date || null
      const closing = deal.closing_date || deal.closing || null
      if(rule.days_from_binding != null && binding){
        const b = new Date(binding)
        b.setDate(b.getDate() + Number(rule.days_from_binding))
        return b
      }
      if(rule.days_before_closing != null && closing){
        const c = new Date(closing)
        c.setDate(c.getDate() - Number(rule.days_before_closing))
        return c
      }
      return null
    }

    function categorize(expectedDate: Date | null, completed:boolean){
      if(!expectedDate) return 'unscheduled'
      const exp = new Date(expectedDate)
      // normalize to date only
      const expOnly = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate())
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const diffDays = Math.ceil((expOnly.getTime() - todayOnly.getTime())/(1000*60*60*24))
      if(completed) return 'completed'
      if(diffDays < 0) return 'overdue'
      if(diffDays === 0) return 'due_today'
      if(diffDays <= 7) return 'due_this_week'
      return 'upcoming'
    }

    const results: any[] = []

    for(const deal of deals){
      const dealProgress = progressRows.filter((p:any)=> p.deal_id === deal.id)
      const gaps: any[] = []
      for(const rule of rules){
        const expected = computeExpectedDateForRule(rule, deal)
        const matched = dealProgress.find((p:any)=> p.milestone_key === rule.milestone_key)
        const completed = !!(matched && (matched.status === 'completed' || matched.status === 'done'))
        const category = categorize(expected, completed)
        const daysDiff = expected ? Math.ceil(((expected as Date).getTime() - today.getTime())/(1000*60*60*24)) : null
        gaps.push({
          milestone_key: rule.milestone_key,
          milestone_label: rule.milestone_label,
          expected_date: expected ? expected.toISOString() : null,
          status: category,
          responsible_party: rule.responsible_party,
          priority: rule.priority,
          advisory_source: rule.advisory_source,
          days_diff: daysDiff
        })
      }
      // sort gaps by urgency: overdue, due_today, due_this_week, upcoming, unscheduled
      const orderRank: any = { overdue: 0, due_today: 1, due_this_week: 2, upcoming: 3, unscheduled: 4, completed: 5 }
      gaps.sort((a:any,b:any)=> (orderRank[a.status]||99) - (orderRank[b.status]||99) || ( (a.days_diff||999) - (b.days_diff||999) ))
      results.push({ dealId: deal.id, address: deal.address || null, client: deal.client || null, gaps })
    }

    return NextResponse.json({ ok:true, results })
  }catch(err:any){
    console.error('playbook-gaps error', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
