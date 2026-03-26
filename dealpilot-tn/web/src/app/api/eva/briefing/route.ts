export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const BASE_PROMPT = `You are Eva, an expert Tennessee Transaction Coordinator at ClosingPilot TN. You're briefing your agent first thing in the morning. You've already reviewed every deal and know exactly what's overdue, what's due today, and what's coming this week. Speak like a real TC who arrived at the office at 6am and has already been working. Reference specific addresses, client names, party names, and dates. Never be generic. If something is overdue, say what you already did about it (e.g., 'I drafted a follow-up to the inspector'). If something is due today, tell the agent exactly what needs to happen. Prioritize by urgency. Keep it to 3-5 sentences max. End with the single most important thing the agent should do right now.`

export async function POST(req: Request){
  try{
    const sb = createServerSupabaseClient()
    const {
      data: { user },
    } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // fetch rules
    const { data: rulesData } = await sb.from('deal_playbook_rules').select('*').order('sort_order', { ascending: true })
    const rules = Array.isArray(rulesData) ? rulesData : []

    // fetch active deals
    const { data: allDeals } = await sb
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .neq('status','Closed')
      .neq('status','Cancelled')
    const deals = Array.isArray(allDeals) ? allDeals : []

    // fetch progress rows
    const dealIds = deals.map(d=>d.id).filter(Boolean)
    let progressRows:any[] = []
    if(dealIds.length>0){ const { data:p } = await sb.from('deal_playbook_progress').select('*').in('deal_id', dealIds); progressRows = Array.isArray(p)?p:[] }

    const today = new Date()
    function computeExpected(rule:any, deal:any){
      const binding = deal.binding_date || deal.binding || deal.binding_agreement_date || null
      const closing = deal.closing_date || deal.closing || null
      if(rule.days_from_binding != null && binding){ const b = new Date(binding); b.setDate(b.getDate()+Number(rule.days_from_binding)); return b }
      if(rule.days_before_closing != null && closing){ const c = new Date(closing); c.setDate(c.getDate()-Number(rule.days_before_closing)); return c }
      return null
    }
    function categorize(expected:Date|null, completed:boolean){ if(!expected) return 'unscheduled'; const expOnly = new Date(expected.getFullYear(), expected.getMonth(), expected.getDate()); const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate()); const diff = Math.ceil((expOnly.getTime()-todayOnly.getTime())/(1000*60*60*24)); if(completed) return 'completed'; if(diff<0) return 'overdue'; if(diff===0) return 'due_today'; if(diff<=7) return 'due_this_week'; return 'upcoming' }

    const results:any[] = []
    for(const deal of deals){
      const dealProgress = progressRows.filter((p:any)=> p.deal_id === deal.id)
      const gaps:any[] = []
      for(const rule of rules){
        const expected = computeExpected(rule, deal)
        const matched = dealProgress.find((p:any)=> p.milestone_key === rule.milestone_key)
        const completed = !!(matched && (matched.status === 'completed' || matched.status === 'done'))
        const status = categorize(expected, completed)
        const daysDiff = expected ? Math.ceil(((expected as Date).getTime()-today.getTime())/(1000*60*60*24)) : null
        gaps.push({ milestone_key: rule.milestone_key, milestone_label: rule.milestone_label, expected_date: expected? expected.toISOString(): null, status, responsible_party: rule.responsible_party, priority: rule.priority, advisory_source: rule.advisory_source, days_diff: daysDiff })
      }
      const orderRank:any = { overdue:0, due_today:1, due_this_week:2, upcoming:3, unscheduled:4, completed:5 }
      gaps.sort((a:any,b:any)=> (orderRank[a.status]||99)-(orderRank[b.status]||99) || ((a.days_diff||999)-(b.days_diff||999)))
      results.push({ dealId: deal.id, address: deal.address || null, client: deal.client || null, gaps })
    }

    // flatten top gaps across deals
    const flat:any[] = []
    for(const r of results){
      const top = (r.gaps || []).slice(0,3)
      for(const g of top) flat.push({ dealId: r.dealId, address: r.address, client: r.client, ...g })
    }
    const rank:any = { critical:0, high:1, normal:2 }
    const statusRank:any = { overdue:0, due_today:1, due_this_week:2, upcoming:3, unscheduled:4, completed:5 }
    flat.sort((a:any,b:any)=> (statusRank[a.status]||99)-(statusRank[b.status]||99) || ((rank[a.priority]||9)-(rank[b.priority]||9)) || ((a.days_diff||999)-(b.days_diff||999)))
    const topGaps = flat.slice(0,6)
    const chips = topGaps.slice(0,3).map((g:any)=>{ const when = g.status==='overdue' ? `${Math.abs(g.days_diff)}d overdue` : g.status==='due_today' ? 'due today' : g.days_diff!=null? `${g.days_diff}d` : ''; return `Follow up: ${g.milestone_label} — ${g.address || ''} (${when})` })

    // generate AI brief
    const easternNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
    const easternStr = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    const timeGuidance = `The current time is ${easternStr}. Use appropriate greeting - Good morning (before noon), Good afternoon (noon-5pm), Good evening (5pm-9pm), or It's getting late but let's catch up (after 9pm). Never say Good morning if it's afternoon or evening.`
    const system = `${BASE_PROMPT} ${timeGuidance}`

    const userContent = `Brief me on the top items right now. Use the following gaps (address | client | milestone | expected_date | status | priority):\n${topGaps.map((g:any)=> `${g.address || '—'} | ${g.client || '—'} | ${g.milestone_label} | ${g.expected_date || 'TBD'} | ${g.status} | ${g.priority || 'normal'}`).join('\n')}`

    if(!process.env.OPENAI_API_KEY) return NextResponse.json({ message: 'OpenAI API key not configured.' })
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }], temperature:0.2, max_tokens:500 })
    const aiGeneratedBrief = completion.choices?.[0]?.message?.content || ''

    // Build structured deals array
    const dealsStructured = topGaps.map((g:any)=>({ address: g.address, client: g.client, urgency: g.status==='overdue' ? 'critical' : g.status==='due_today' ? 'high' : 'normal', nextAction: g.milestone_label, daysToClose: g.days_diff }))
    const topAction = chips.length>0 ? chips[0] : null
    return NextResponse.json({ summary: aiGeneratedBrief, deals: dealsStructured, topAction, chips: chips.length>0?chips:['Prioritize deals','Review urgent deadlines','Contact title company'] })

  }catch(err:any){ console.error('eva briefing (playbook/db) error', err); return NextResponse.json({ message: 'EVA briefing unavailable.' , chips: [] }, { status:500 }) }
}
