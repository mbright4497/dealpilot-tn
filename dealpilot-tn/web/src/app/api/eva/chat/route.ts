import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are EVA, a professional AI executive assistant for real estate agents using DealPilot TN. You help manage transactions, track deadlines, review documents, draft amendments, and keep deals on track. Be concise, professional, and proactive. When the user asks about deals, reference their active transactions. Always suggest next actions.`

export async function POST(req: Request) {
  try{
    const body = await req.json()
    const message = body.message || ''
    const context = body.context || {}

    let systemPrompt = SYSTEM_PROMPT

    // if deal context provided, fetch deal and inject summary
    if(context.dealId){
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
      const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
      if(SUPABASE_URL && SUPABASE_KEY){
        const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
        const { data } = await sb.from('transactions').select('id,address,client,binding,closing,status,notes').eq('id', context.dealId).single()
        if(data){
          systemPrompt += ` Deal context: ${data.address} for ${data.client}. Binding: ${data.binding || 'N/A'}. Closing: ${data.closing || 'N/A'}. Status: ${data.status || 'N/A'}.` 
        }
      } else if(context.dealAddress){
        systemPrompt += ` Deal context: ${context.dealAddress}.` 
      }
    }

    // call OpenAI gpt-4o-mini
    try{
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 600,
      })

      const reply = resp.choices?.[0]?.message?.content || 'EVA could not generate a response.'
      // simple suggestion extraction - naive
      const suggestions = []

      return NextResponse.json({ reply, suggestions })
    }catch(aiErr:any){
      // fallback to helpful message
      const fallback = `EVA is temporarily unavailable via the AI service. I can still suggest: (1) Review deal summary. (2) Ask me to generate an email. (3) Ask me to list upcoming deadlines.`
      return NextResponse.json({ reply: fallback }, { status: 200 })
    }

  }catch(err:any){
    return NextResponse.json({ reply: 'EVA is unavailable right now.' }, { status:500 })
  }
}
