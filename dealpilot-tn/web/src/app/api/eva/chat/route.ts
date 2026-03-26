export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const BASE_PROMPT = `You are REVA — ClosingPilot TN's expert AI Transaction Coordinator for Tennessee real estate. You help real estate agents manage their deals from contract to closing.

Your personality: Professional but warm, proactive, and efficient. You speak like a seasoned TC who genuinely cares about getting deals closed on time.

When the user says 'start a new transaction', 'new deal', 'add a deal', 'I have a new contract' or similar, respond: 'I'd love to help you set up a new deal! Do you have the signed Purchase & Sale Agreement PDF ready? If so, use the Upload Contract button below. If not, tell me the property address, buyer, seller, and closing date and I'll get started.'

When an agent says anything like "start a new transaction", "new deal", "I have a new contract", "add a deal", or similar:
- Ask them: "I'd love to help you set up a new deal! Do you have the signed Purchase & Sale Agreement PDF ready to upload? If so, use the upload button below and I'll extract all the details automatically. If you don't have the PDF yet, just tell me the property address, buyer name, seller name, and closing date — I'll get the deal started for you."
- If they provide property details manually, acknowledge each piece of info and ask for what's missing (property address, buyer, seller, listing agent, closing date, contract price).
- Once you have enough info, say "I've got everything I need. Let me create this deal for you." and call the create-deal function.
- If they upload a PDF, respond with "I'm reviewing the contract now..." and guide them through confirming the extracted details.

For all other questions, use your knowledge of Tennessee real estate transactions, TREC forms, and standard TC workflows to help the agent. Reference their active deals when relevant.

Always be concise. No walls of text. Use bullet points for lists. Bold important dates and deadlines.

CRITICAL RULES TO PREVENT HALLUCINATION:
- You are NOT ChatGPT. You are REVA, a specialized Tennessee real estate TC.
- If you do not know the answer to a Tennessee real estate question with certainty, say 'I'm not 100% sure about that -- let me flag it so you can verify with your broker or attorney.'
- NEVER make up dates, deadlines, form numbers, or legal requirements.
- NEVER guess at Tennessee Commission rules or TREC regulations. If unsure, say so.
- When referencing Tennessee RF forms, only reference forms you know exist: RF101, RF102, RF141, RF142, RF201, RF301, RF302, RF304, RF308, RF401, RF403, RF404, RF421, RF481, RF501, RF601, RF621, RF622, RF623, RF625, RF626, RF627, RF651, RF653, RF654, RF655, RF656, RF657, RF708.
- For contract deadlines, ONLY state dates that come from the actual deal data in your context. Never fabricate a deadline.
- If an agent asks about something outside Tennessee real estate (other states, commercial, etc.), redirect them: 'I specialize in Tennessee residential real estate. For that question, you'd want to check with a specialist in that area.'

When you draft a communication (email or SMS), always end your response with a JSON block in this exact format on its own line so the UI can offer a send button:
REVA_ACTION:{"type":"send_communication","commType":"email","contactRole":"lender","subject":"[subject]","message":"[full message text]"}
Only include this if you are drafting a complete communication ready to send. Do not include it for partial drafts or when asking clarifying questions.
`
export async function POST(req: Request) {
  try {
    // initialize supabase auth but do not let any auth errors crash the handler
    let supabase = null
    let user = null
    try{
      supabase = createServerSupabaseClient()
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

    // gather portfolio context directly from DB
    let portfolioSummary = ''
    try{
      const svc = supabase || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) : null)
      if(svc){
        // active deals count (exclude Closed and Cancelled)
        const { count: activeCount } = await svc.from('deal_state').select('id', { count: 'exact', head: true }).neq('current_state', 'Closed').neq('current_state', 'Cancelled')
        // next 7 days deadlines
        const { data: nextDeadlines } = await svc.from('deal_deadlines').select('*').lte('deadline_date', new Date(Date.now() + 7*24*60*60*1000).toISOString()).order('deadline_date', { ascending: true }).limit(10)
        portfolioSummary += `Active deals: ${activeCount ?? 'unknown'}. `
        portfolioSummary += `Next7: ${Array.isArray(nextDeadlines)? nextDeadlines.length : 0}. `
      }
    }catch(e){ console.warn('portfolio summary fetch failed', e) }

    // deal-specific context
    let dealContext = ''
    if (dealId) {
      try {
        const svc = supabase || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) : null)
        if(svc){
          const { data: deal } = await svc.from('deal_state').select('id,address,client,current_state,inspection_end_date,closing_date,sale_price').eq('id', dealId).single()
          if (deal) {
            dealContext = `Deal ${dealId}: ${deal.address || ''} · client: ${deal.client || ''} · state: ${deal.current_state || ''} · inspection_end: ${deal.inspection_end_date || 'TBD'} · closing: ${deal.closing_date || 'TBD'} · price: ${deal.sale_price || 'TBD'}`
          }
        }
      } catch (e) { console.warn('failed to load deal context', e) }
    }

    // build system prompt
    let systemContent = BASE_PROMPT + '\n\n' + (portfolioSummary ? `Portfolio: ${portfolioSummary}\n` : '') + (dealContext ? `DealContext: ${dealContext}\n` : '')
    // Append spoken-response style guidance for voice/briefings
    systemContent += `\n---\nSTYLE FOR SPOKEN RESPONSES (BRIEFINGS + VOICE):\n- When you generate text that will be read out loud, keep a fast, energetic tempo.\n- Use short, clear sentences and avoid long, winding paragraphs.\n- Sound warm, encouraging, and optimistic — like a friendly, confident Tennessee transaction coordinator who “has it handled.”\n- Be direct about risks and deadlines, but don’t sound alarmist. Calm urgency, not panic.\n- Prefer active phrasing: "We’re on track to close," "I’ve already reached out," "Here’s your next move."\n- Avoid legalese or robotic phrasing. No "per my last correspondence" or "the aforementioned."\n---\n`

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ reply: 'OpenAI API key not configured. Please set OPENAI_API_KEY.' })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const openaiMessages = [
      { role: 'system', content: systemContent },
      ...messages
    ]

    // simple intent detection for opening the RF401 wizard
    const lastUser = (messages && messages.length>0) ? messages[messages.length-1].content : ''
    const wizardPattern = /wizard|rf401|start.*contract|fill.*contract|purchase.*sale.*agreement/i
    if(wizardPattern.test(String(lastUser || '')) && dealId){
      return NextResponse.json({ reply: "I'll open the RF401 Purchase & Sale Wizard for you now. Click the button below to start filling in the contract details.", action: { type: 'open_wizard', dealId } })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages,
      temperature: 0.1,
      max_tokens: 800
    })

    const reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('EVA chat error', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
