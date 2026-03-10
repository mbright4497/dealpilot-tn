export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

export const runtime = 'nodejs'

const BASE_PROMPT = `You are EVA — ClosingPilot's expert Tennessee Transaction Coordinator assistant. Be concise, practical, and reference deal context when available.\n\nTennessee broker knowledge (summary):\n- Earnest money: typical amounts 1-2% of purchase price; handling and deadlines must be documented; verify escrow instructions.\n- Inspections: standard inspection period ~10 days from effective date; calendar days used unless contract specifies business days.\n- Financing contingency: buyer must remove financing contingency by the agreed date; coordinate proof of loan approval.\n- Title commitments: ensure title commitment is ordered within early post-contract period; check for exceptions and schedule cure items immediately.\n- Seller disclosures: Tennessee requires specific disclosure documentation; ensure disclosure delivered to buyer prior to certain deadlines.\n- Common contingencies: appraisal, financing, inspection; provide recommended timelines (inspection ~10 days, appraisal ~21 days).\n- Use local county recording and transfer timelines (recommend verifying with title).\n\nWhen giving advice, cite applicable steps and suggest concrete next actions (e.g., draft email to title company, schedule reminder to inspector).`

export async function POST(req: Request) {
  try {
    // initialize supabase auth but do not let any auth errors crash the handler
    let supabase = null
    let user = null
    try{
      supabase = createRouteHandlerClient({ cookies })
      try{
        const supRes = await supabase.auth.getUser()
        user = supRes?.data?.user || null
      }catch(_){ user = null }
    }catch(err){
      console.warn('supabase auth init failed, continuing anonymously', err)
      supabase = null
      user = null
    }

    const body = await req.json().catch(() => ({}))
    let { messages = [], dealId } = body as any

    // Defensive: normalize incoming message roles to OpenAI-acceptable values
    if(Array.isArray(messages)){
      messages = messages.map((m:any)=>{
        const rawRole = String(m.role || 'user')
        const role = rawRole === 'eva' ? 'assistant' : (rawRole === 'assistant' || rawRole === 'system' ? rawRole : 'user')
        return { role, content: String(m.content || '') }
      })
    } else {
      messages = []
    }

    // gather portfolio context
    let portfolioSummary = ''
    try {
      const ph = await fetch(new URL('/api/portfolio-health', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost'))
      const pd = await fetch(new URL('/api/portfolio-deadlines', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost'))
      if (ph.ok) {
        const phd = await ph.json()
        portfolioSummary += `Active deals: ${phd?.active_count ?? phd?.total_upcoming ?? 'unknown'}. `
      }
      if (pd.ok) {
        const pdd = await pd.json()
        portfolioSummary += `Overdue: ${pdd?.overdue_count ?? 0}. Next 7 days: ${Array.isArray(pdd?.next_7_days)? pdd.next_7_days.length : 0}. `
      }
    } catch (e) {
      // ignore
    }

    // deal-specific context
    let dealContext = ''
    if (dealId) {
      try {
        const { data: deal } = await supabase.from('deal_state').select('id,address,client,current_state,inspection_end_date,closing_date,sale_price').eq('id', dealId).single()
        if (deal) {
          dealContext = `Deal ${dealId}: ${deal.address || ''} · client: ${deal.client || ''} · state: ${deal.current_state || ''} · inspection_end: ${deal.inspection_end_date || 'TBD'} · closing: ${deal.closing_date || 'TBD'} · price: ${deal.sale_price || 'TBD'}`
        }
      } catch (e) { }
    }

    // build system prompt
    let systemContent = BASE_PROMPT + '\n\n' + (portfolioSummary ? `Portfolio: ${portfolioSummary}\n` : '') + (dealContext ? `DealContext: ${dealContext}\n` : '')

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ reply: 'OpenAI API key not configured. Please set OPENAI_API_KEY.' })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const openaiMessages = [
      { role: 'system', content: systemContent },
      ...messages
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.2,
      max_tokens: 800
    })

    const reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('EVA chat error', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
