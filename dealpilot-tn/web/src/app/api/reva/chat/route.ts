import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const REVA_ACTION_INSTRUCTION =
  'When you draft a communication (email or SMS), always end your response with a JSON block exactly like: REVA_ACTION:{"type":"send_communication","commType":"email","contactRole":"lender","subject":"[subject]","message":"[full message text]"} . Only include this for complete ready-to-send drafts.'
const REVA_FILE_SEARCH_PREFIX =
  'Search your knowledge base documents to answer this question. Cite the specific document and section. Do not answer from general knowledge alone.\n\nQuestion: '
const REVA_SEARCH_FALLBACK_REPLY =
  "I'm having trouble searching right now. Please try again in a moment."

async function buildRevaContext(supabase: any, userId: string) {
  const { data: deals } = await supabase
    .from('deal_state')
    .select('id,address,current_state,binding_date,closing_date,created_at,documents')
    .eq('user_id', userId)
  const { data: deadlines } = await supabase
    .from('deal_deadlines')
    .select('deal_id,milestone_name,deadline_date,status')
    .eq('user_id', userId)
  const { data: checklist } = await supabase
    .from('checklist_items')
    .select('transaction_id,status')
    .eq('user_id', userId)
  return { deals: deals || [], deadlines: deadlines || [], checklist: checklist || [] }
}

function extractSystemMessages(messages: any[]): string {
  return messages
    .filter((m) => String(m?.role || '').toLowerCase() === 'system')
    .map((m) => String(m?.content || '').trim())
    .filter(Boolean)
    .join('\n\n')
}

export async function POST(req: Request) {
  try {
    console.log('[REVA_CHAT] Route hit')
    if (!process.env.OPENAI_API_KEY) {
      console.error('[REVA_CHAT] Missing OPENAI_API_KEY')
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const rawMessages = Array.isArray(body?.messages) ? body.messages : []
    const dealId = body?.dealId
    const userMessages = rawMessages.filter(
      (m: any) => String(m?.role || 'user').toLowerCase() === 'user'
    )
    const lastUserMessage = userMessages.length
      ? String(userMessages[userMessages.length - 1]?.content || '').trim()
      : ''
    console.log('[REVA_CHAT] Request payload parsed', {
      messageCount: rawMessages.length,
      dealId: dealId ?? null,
      userMessage: lastUserMessage,
    })

    if (!lastUserMessage) {
      return NextResponse.json({ reply: 'Please share a question for Reva.' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ctx = await buildRevaContext(supabase, user.id)
    const contextJson = JSON.stringify(ctx)
    const systemFromRequest = extractSystemMessages(rawMessages)
    const systemPrompt = `${REVA_ACTION_INSTRUCTION}${dealId ? `\nCurrent deal id: ${dealId}` : ''}\n\nLive Reva context:\n${contextJson}${systemFromRequest ? `\n\nAdditional system context:\n${systemFromRequest}` : ''}`
    const userMessage = `${REVA_FILE_SEARCH_PREFIX}${lastUserMessage}`

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 1000,
    })

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
    console.log('[REVA_CHAT] Final reply before return', {
      replyPreview: reply.slice(0, 500),
      replyLength: reply.length,
    })

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('REVA chat error', err)
    return NextResponse.json({ reply: REVA_SEARCH_FALLBACK_REPLY })
  }
}
