export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

const BASE_PROMPT = `You are Eva, an expert Tennessee Transaction Coordinator at ClosingPilot TN. You're briefing your agent first thing in the morning. You've already reviewed every deal and know exactly what's overdue, what's due today, and what's coming this week. Speak like a real TC who arrived at the office at 6am and has already been working. Reference specific addresses, client names, party names, and dates. Never be generic. If something is overdue, say what you already did about it (e.g., 'I drafted a follow-up to the inspector'). If something is due today, tell the agent exactly what needs to happen. Prioritize by urgency. Keep it to 3-5 sentences max. End with the single most important thing the agent should do right now.`

async function fetchPlaybookGaps(){
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || ''
  const url = base + '/api/eva/playbook-gaps'
  try{
    const res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) })
    if(!res.ok) return null
    const j = await res.json()
    return j
  }catch(e){ console.warn('fetchPlaybookGaps error', e); return null }
}

export async function POST(req: Request){
  try{
    const gapsResp = await fetchPlaybookGaps()
    if(!gapsResp || !gapsResp.ok) return NextResponse.json({ message: 'No briefing available', chips: [] })

    const results = gapsResp.results || []
    const flat: any[] = []
    for(const r of results){
      const top = (r.gaps || []).slice(0,3)
      for(const g of top){ flat.push({ dealId: r.dealId, address: r.address, client: r.client, ...g }) }
    }

    const rank: any = { critical:0, high:1, normal:2 }
    const statusRank: any = { overdue:0, due_today:1, due_this_week:2, upcoming:3, unscheduled:4, completed:5 }
    flat.sort((a,b)=> (statusRank[a.status]||99) - (statusRank[b.status]||99) || ( (rank[a.priority]||9) - (rank[b.priority]||9) ) || ((a.days_diff||999)-(b.days_diff||999)))

    const topGaps = flat.slice(0,6)
    const chips = topGaps.slice(0,3).map((g:any)=> {
      const when = g.status === 'overdue' ? `${Math.abs(g.days_diff)}d overdue` : g.status === 'due_today' ? 'due today' : g.days_diff != null ? `${g.days_diff}d` : ''
      return `Follow up: ${g.milestone_label} — ${g.address || ''} (${when})`
    })

    // build prompt
    const system = BASE_PROMPT
    const userContent = `Brief me on the top items right now. Use the following gaps (address | client | milestone | expected_date | status | priority):\n${topGaps.map((g:any)=> `${g.address || '—'} | ${g.client || '—'} | ${g.milestone_label} | ${g.expected_date || 'TBD'} | ${g.status} | ${g.priority || 'normal'}`).join('\n')}`

    if(!process.env.OPENAI_API_KEY) return NextResponse.json({ message: 'OpenAI API key not configured.' })
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent }
      ],
      temperature: 0.2,
      max_tokens: 500
    })

    const aiGeneratedBrief = completion.choices?.[0]?.message?.content || ''

    const dynamicChips = chips.length>0 ? chips : ['Prioritize deals','Review urgent deadlines','Contact title company']

    return NextResponse.json({ message: aiGeneratedBrief, gaps: topGaps, chips: dynamicChips })
  }catch(err:any){
    console.error('eva briefing (playbook) error', err)
    return NextResponse.json({ message: 'EVA briefing unavailable.' , chips: [] }, { status:500 })
  }
}
