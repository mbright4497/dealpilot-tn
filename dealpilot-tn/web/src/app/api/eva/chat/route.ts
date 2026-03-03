import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { getDealContext } from '@/lib/eva/deal-context'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are EVA, a professional AI executive assistant for real estate agents using DealPilot TN. You help manage transactions, track deadlines, review documents, draft amendments, and keep deals on track. Be concise, professional, and proactive. When the user asks about deals, reference their active transactions. Always suggest next actions.`

export async function POST(req: Request) {
  try{
    const body = await req.json()
    const message = body.message || ''
    const context = body.context || {}

    let systemPrompt = SYSTEM_PROMPT

    // if deal context provided, fetch deal context and inject summary
    if(context.dealId){
      try{
        const ctx = await getDealContext(context.dealId)
        if(ctx && ctx.transaction){
          const t = ctx.transaction
          systemPrompt += ` Deal context: ${t.address} for ${t.client}. Binding: ${t.binding || 'N/A'}. Closing: ${t.closing || 'N/A'}. Status: ${t.status || 'N/A'}. Missing docs: ${ctx.missingDocs.join(', ') || 'none'}. Overdue tasks: ${ctx.overdueTasks.length}.` 
        }
      }catch(e){
        // ignore
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
        max_tokens: 800,
      })

      const reply = resp.choices?.[0]?.message?.content || 'EVA could not generate a response.'
      // suggestions - naive: if message contains keywords
      const suggestions:string[] = []
      if(message.toLowerCase().includes('summarize')) suggestions.push('Send summary to email')
      if(message.toLowerCase().includes('missing')) suggestions.push('List missing documents')

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
