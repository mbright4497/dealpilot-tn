import OpenAI from 'openai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buildRevaContext } from '@/lib/reva/buildRevaContext'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
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

    const fullMessage = `LIVE SYSTEM CONTEXT (use this for all deal questions):
${context}

USER QUESTION: ${message}

Instructions: Search your knowledge base documents to answer this question. Cite the specific document and section. Use the live context above for any deal-specific questions.`

    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: fullMessage,
    })

    const encoder = new TextEncoder()
    let reply = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const runStream = openai.beta.threads.runs.stream(thread.id, {
            assistant_id: assistantId,
          })

          runStream.on('textDelta', (delta) => {
            if (delta.value) {
              reply += delta.value
            }
          })

          await runStream.finalRun()

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                reply: reply || 'I could not find an answer. Please try again.',
                threadId: thread.id,
              })
            )
          )
          controller.close()
        } catch {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                reply: 'I ran into an issue. Please try again.',
                threadId: thread.id,
              })
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Reva chat error:', err)
    return Response.json({
      reply: 'Something went wrong. Please try again.',
      threadId: null,
    })
  }
}
