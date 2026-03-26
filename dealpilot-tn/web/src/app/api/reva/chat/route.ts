import OpenAI from 'openai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildRevaContext } from '@/lib/reva/buildRevaContext'
import { createTransactionWithSetup } from '@/lib/transactions/service'

export const maxDuration = 60
const styleInstructions: Record<string, string> = {
  joyful: 'Communicate in an upbeat, energetic, encouraging tone. Use enthusiasm.',
  straight: 'Communicate in a concise, no-frills, direct tone. No fluff.',
  calm: 'Communicate in a measured, reassuring, professional tone.',
  executive: 'Communicate in a strategic, advisory tone focused on high-level impact.',
  friendly_tn:
    'Communicate in a warm, conversational, Tennessee-style friendly tone. Occasional Southern warmth is welcome.',
}

function stripCitations(text: string): string {
  return text
    .replace(/【[^】]*】/g, '')
    .replace(/^\[RF FORM\]\s*/i, '')
    .replace(/^\[TN LAW\]\s*/i, '')
    .replace(/^\[BEST PRACTICE\]\s*/i, '')
    .replace(/^\[MLS RULE\]\s*/i, '')
    .trim()
}

function extractActionBlock(text: string): {
  cleanedReply: string
  action: { type: string; data?: Record<string, unknown> } | null
} {
  const match = text.match(/REVA_ACTION:(\{[\s\S]*\})/m)
  if (!match) return { cleanedReply: text.trim(), action: null }
  try {
    const parsed = JSON.parse(match[1]) as { type: string; data?: Record<string, unknown> }
    return {
      cleanedReply: text.replace(match[0], '').trim(),
      action: parsed,
    }
  } catch {
    return { cleanedReply: text.trim(), action: null }
  }
}

export async function POST(request: Request) {
  try {
    console.log('Assistant ID:', process.env.REVA_ASSISTANT_ID_TN)
    const { message, dealId, threadId: requestThreadId, context: requestContext } = await request.json()

    if (!message) {
      return Response.json({ error: 'Message required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // no-op in read-only server contexts
            }
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id
    const userEmail = user.email

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const assistantId = process.env.REVA_ASSISTANT_ID_TN
    console.log('assistantId value being used:', assistantId)

    if (!assistantId) {
      return Response.json({
        reply: 'Reva is not configured yet. Please contact support.',
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('assistant_style')
      .eq('id', userId)
      .maybeSingle()

    const selectedStyle = String(profile?.assistant_style || 'friendly_tn').replace('-', '_')
    const styleContext =
      styleInstructions[selectedStyle] || styleInstructions.friendly_tn
    const context = await buildRevaContext(supabase, userId, dealId, userEmail)

    let threadId: string
    if (requestThreadId) {
      threadId = requestThreadId
    } else {
      const threadObj = await openai.beta.threads.create()
      console.log('Thread created:', JSON.stringify(threadObj))
      threadId = threadObj.id
    }
    console.log('threadId created:', threadId)

    const fullMessage = `LIVE SYSTEM CONTEXT (use this for all deal questions):
${context}

COMMUNICATION STYLE: ${styleContext}

DRIVE MODE RULES:
When the authenticated user asks you to start, create, or add a new transaction or deal, collect the following information one question at a time:
1. Property address (street number and name)
2. City
3. Zip code
4. Is this a buyer or seller transaction?
5. Client name(s)
6. Do you have a closing date yet?
After collecting all 6 answers, confirm with the user and output this EXACT block on its own line:
REVA_ACTION:{"type":"create_transaction","data":{"address":"[full address]","city":"[city]","zip":"[zip]","client":"[client name]","client_type":"[buyer or seller]","closing_date":"[ISO date or null]","phase":"intake"}}
Then say: 'Transaction created! I've set up your deadlines and checklist. Upload the contract whenever you're ready and I'll read it for you.'
Ask ONE question at a time. Wait for the answer before asking the next. This is Drive Mode - the user may be hands-free.
Current context mode: ${requestContext || 'default'}

USER QUESTION: ${message}

Instructions: Search your knowledge base documents to answer this question. Cite the specific document and section. Use the live context above for any deal-specific questions.`

    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: fullMessage,
    })

    try {
      console.log('runStream starts: switching to polling via runs.create')
      console.log('textDelta events fire: polling mode, no textDelta events expected')
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      })

      const startTime = Date.now()
      let status = run.status

      while (
        status !== 'completed' &&
        status !== 'failed' &&
        status !== 'cancelled' &&
        status !== 'expired'
      ) {
        if (Date.now() - startTime > 45000) {
          return Response.json({
            reply: 'Reva is taking too long. Please try again.',
            threadId,
          })
        }

        await new Promise((r) => setTimeout(r, 1500))
        const updated = await openai.beta.threads.runs.retrieve(
          threadId,
          run.id
        )
        status = updated.status
        console.log('Run status:', status, 'elapsed:', Date.now() - startTime)
      }

      if (status !== 'completed') {
        return Response.json({
          reply: 'I could not complete that request. Please try again.',
          threadId,
        })
      }

      const messages = await openai.beta.threads.messages.list(threadId)
      const latest = messages.data[0]
      const rawReply = latest.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text.value)
        .join('\n')

      const { cleanedReply, action } = extractActionBlock(rawReply || '')
      let transaction: unknown = null
      if (action?.type === 'create_transaction' && action.data) {
        const payload = action.data
        transaction = await createTransactionWithSetup(supabase as any, userId, {
          address: String(payload.address || ''),
          city: payload.city ? String(payload.city) : undefined,
          zip: payload.zip ? String(payload.zip) : undefined,
          client: String(payload.client || ''),
          client_type: payload.client_type ? String(payload.client_type) : 'buyer',
          closing_date: payload.closing_date ? String(payload.closing_date) : null,
          phase: payload.phase ? String(payload.phase) : 'intake',
          type: payload.client_type ? String(payload.client_type) : 'buyer',
        })
      }

      return Response.json({
        reply: stripCitations(cleanedReply || 'I could not find an answer. Please try again.'),
        threadId,
        transaction,
      })
    } catch (err: any) {
      console.error('Run error full:', JSON.stringify(err))
      return Response.json({
        reply: 'Error: ' + err.message,
        threadId,
      })
    }
  } catch (err: any) {
    console.error('Error caught in reva chat route:', err)
    console.error('Reva chat error:', err)
    return Response.json({
      reply: 'Something went wrong. Please try again.',
      threadId: null,
    })
  }
}
