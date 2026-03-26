import OpenAI from 'openai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildRevaContext } from '@/lib/reva/buildRevaContext'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    console.log('Assistant ID:', process.env.REVA_ASSISTANT_ID_TN)
    const { message, dealId, threadId } = await request.json()

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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const assistantId = process.env.REVA_ASSISTANT_ID_TN
    console.log('assistantId value being used:', assistantId)

    if (!assistantId) {
      return Response.json({
        reply: 'Reva is not configured yet. Please contact support.',
      })
    }

    const context = await buildRevaContext(supabase, user.id, dealId)

    let thread
    if (threadId) {
      thread = { id: threadId }
    } else {
      thread = await openai.beta.threads.create()
    }
    console.log('thread.id created:', thread.id)

    const fullMessage = `LIVE SYSTEM CONTEXT (use this for all deal questions):
${context}

USER QUESTION: ${message}

Instructions: Search your knowledge base documents to answer this question. Cite the specific document and section. Use the live context above for any deal-specific questions.`

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: fullMessage,
    })

    console.log('runStream starts: switching to polling via runs.create')
    console.log('textDelta events fire: polling mode, no textDelta events expected')
    const run = await openai.beta.threads.runs.create(thread.id, {
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
          threadId: thread.id,
        })
      }

      await new Promise((r) => setTimeout(r, 1500))
      const updated = await openai.beta.threads.runs.retrieve(thread.id, run.id)
      status = updated.status
      console.log('Run status:', status, 'elapsed:', Date.now() - startTime)
    }

    if (status !== 'completed') {
      return Response.json({
        reply: 'I could not complete that request. Please try again.',
        threadId: thread.id,
      })
    }

    const messages = await openai.beta.threads.messages.list(thread.id)
    const latest = messages.data[0]
    const reply = latest.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text.value)
      .join('\n')

    return Response.json({
      reply: reply || 'I could not find an answer. Please try again.',
      threadId: thread.id,
    })
  } catch (err: any) {
    console.error('Error caught in reva chat route:', err)
    console.error('Reva chat error:', err)
    return Response.json({
      reply: 'Something went wrong. Please try again.',
      threadId: null,
    })
  }
}
