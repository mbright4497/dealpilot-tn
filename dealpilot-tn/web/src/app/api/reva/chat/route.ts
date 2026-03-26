import OpenAI from 'openai'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const REVA_ACTION_INSTRUCTION =
  'When you draft a communication (email or SMS), always end your response with a JSON block exactly like: REVA_ACTION:{"type":"send_communication","commType":"email","contactRole":"lender","subject":"[subject]","message":"[full message text]"} . Only include this for complete ready-to-send drafts.'
const REVA_FILE_SEARCH_PREFIX =
  'Search your knowledge base documents to answer this question. Cite the specific document and section. Do not answer from general knowledge alone.\n\nQuestion: '
const REVA_SEARCH_FALLBACK_REPLY =
  "I'm having trouble searching right now. Please try again in a moment."

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getTextFromAssistantMessage(content: any[] | undefined): string {
  if (!Array.isArray(content)) return ''
  return content
    .map((part: any) => {
      if (part?.type === 'text' && part?.text?.value) return String(part.text.value)
      return ''
    })
    .join('\n')
    .trim()
}

export async function POST(req: Request) {
  try {
    console.log('[REVA_CHAT] Route hit')
    if (!process.env.OPENAI_API_KEY) {
      console.error('[REVA_CHAT] Missing OPENAI_API_KEY')
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 })
    }

    const assistantId = process.env.REVA_ASSISTANT_ID_TN
    if (!assistantId) {
      console.error('[REVA_CHAT] Missing REVA_ASSISTANT_ID_TN')
      return NextResponse.json({ error: 'REVA_ASSISTANT_ID_TN is not configured.' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const rawMessages = Array.isArray(body?.messages) ? body.messages : []
    const dealId = body?.dealId
    const userMessages = rawMessages.filter((m: any) => String(m?.role || 'user') !== 'assistant')
    const lastUserMessage = userMessages.length
      ? String(userMessages[userMessages.length - 1]?.content || '').trim()
      : ''
    console.log('[REVA_CHAT] Request payload parsed', {
      messageCount: rawMessages.length,
      dealId: dealId ?? null,
      userMessage: lastUserMessage,
    })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    console.log('[REVA_CHAT] Creating thread')
    const thread = await openai.beta.threads.create()
    console.log('[REVA_CHAT] Thread created', { threadId: thread.id })
    const assistant = await openai.beta.assistants.retrieve(assistantId)
    const hasFileSearchTool = assistant.tools?.some((tool: any) => tool?.type === 'file_search')

    console.log('Reva assistant config', {
      assistantId,
      tools: assistant.tools,
      tool_resources: assistant.tool_resources,
    })

    if (!hasFileSearchTool) {
      return NextResponse.json(
        { error: 'Reva assistant is missing file_search tool. Re-run assistant setup.' },
        { status: 500 }
      )
    }

    for (const m of rawMessages) {
      const rawRole = String(m?.role || 'user')
      const normalizedRole = rawRole === 'assistant' ? 'assistant' : 'user'
      const rawContent = String(m?.content || '').trim()
      if (!rawContent) continue

      const content =
        rawRole === 'system'
          ? `System context:\n${rawContent}`
          : normalizedRole === 'user'
            ? `${REVA_FILE_SEARCH_PREFIX}${rawContent}`
            : rawContent

      console.log('[REVA_CHAT] Adding message to thread', {
        role: normalizedRole,
        preview: rawContent.slice(0, 200),
      })
      await openai.beta.threads.messages.create(thread.id, {
        role: normalizedRole,
        content,
      })
    }

    console.log('[REVA_CHAT] Creating run')
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.REVA_ASSISTANT_ID_TN!,
      additional_instructions: `${REVA_ACTION_INSTRUCTION}${dealId ? `\nCurrent deal id: ${dealId}` : ''}`,
    })
    console.log('[REVA_CHAT] Run created', { runId: run.id, threadId: thread.id })

    const startedAt = Date.now()
    const maxWaitMs = 90_000
    let runState = run
    let pollAttempt = 0

    while (Date.now() - startedAt < maxWaitMs) {
      pollAttempt += 1
      runState = await openai.beta.threads.runs.retrieve(thread.id, run.id)
      console.log('[REVA_CHAT] Poll run status', {
        attempt: pollAttempt,
        runId: run.id,
        status: runState.status,
        elapsedMs: Date.now() - startedAt,
      })

      if (runState.status === 'completed') break
      if (runState.status === 'failed' || runState.status === 'cancelled' || runState.status === 'expired') {
        console.error('Reva run ended before completion', {
          status: runState.status,
          last_error: runState.last_error,
          run_id: runState.id,
          thread_id: thread.id,
        })
        return NextResponse.json({ reply: REVA_SEARCH_FALLBACK_REPLY })
      }

      await sleep(1200)
    }

    if (runState.status !== 'completed') {
      console.error('Reva run timed out', {
        status: runState.status,
        run_id: runState.id,
        thread_id: thread.id,
      })
      return NextResponse.json({ reply: REVA_SEARCH_FALLBACK_REPLY })
    }

    console.log('[REVA_CHAT] Retrieving thread messages', { threadId: thread.id })
    const messages = await openai.beta.threads.messages.list(thread.id, { limit: 20 })
    const assistantMessage = messages.data.find((m: any) => m.role === 'assistant')
    const reply = getTextFromAssistantMessage(assistantMessage?.content) || 'Sorry, I could not generate a response.'
    console.log('[REVA_CHAT] Final reply before return', {
      replyPreview: reply.slice(0, 500),
      replyLength: reply.length,
    })

    return NextResponse.json({ reply, response: reply })
  } catch (err: any) {
    console.error('REVA chat error', err)
    return NextResponse.json({ reply: REVA_SEARCH_FALLBACK_REPLY })
  }
}
