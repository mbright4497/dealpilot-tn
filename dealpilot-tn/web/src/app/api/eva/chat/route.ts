import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

export const runtime = 'nodejs'

const BASE_PROMPT = `You are EVA — ClosingPilot's expert Tennessee Transaction Coordinator assistant. Be concise, practical, and reference deal context when available.`

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { messages = [], dealId } = body as any

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
