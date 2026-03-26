import OpenAI from 'openai'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REVA_ACTION_INSTRUCTION =
  'When you draft a communication (email or SMS), always end your response with a JSON block exactly like: REVA_ACTION:{"type":"send_communication","commType":"email","contactRole":"lender","subject":"[subject]","message":"[full message text]"} . Only include this for complete ready-to-send drafts.'

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
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured.' }, { status: 500 })
    }

    const assistantId = process.env.REVA_ASSISTANT_ID_TN
    if (!assistantId) {
      return NextResponse.json({ error: 'REVA_ASSISTANT_ID_TN is not configured.' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const rawMessages = Array.isArray(body?.messages) ? body.messages : []
    const dealId = body?.dealId

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const thread = await openai.beta.threads.create()

    for (const m of rawMessages) {
      const rawRole = String(m?.role || 'user')
      const normalizedRole = rawRole === 'assistant' ? 'assistant' : 'user'
      const rawContent = String(m?.content || '').trim()
      if (!rawContent) continue

      const content =
        rawRole === 'system'
          ? `System context:\n${rawContent}`
          : rawContent

      await openai.beta.threads.messages.create(thread.id, {
        role: normalizedRole,
        content,
      })
    }

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
      additional_instructions: `${REVA_ACTION_INSTRUCTION}${dealId ? `\nCurrent deal id: ${dealId}` : ''}`,
    })

    const startedAt = Date.now()
    const maxWaitMs = 90_000
    let runState = run

    while (Date.now() - startedAt < maxWaitMs) {
      runState = await openai.beta.threads.runs.retrieve(thread.id, run.id)

      if (runState.status === 'completed') break
      if (runState.status === 'failed' || runState.status === 'cancelled' || runState.status === 'expired') {
        return NextResponse.json({ error: `Assistant run ${runState.status}.` }, { status: 500 })
      }

      await sleep(1200)
    }

    if (runState.status !== 'completed') {
      return NextResponse.json({ error: 'Assistant run timed out.' }, { status: 504 })
    }

    const messages = await openai.beta.threads.messages.list(thread.id, { limit: 20 })
    const assistantMessage = messages.data.find((m: any) => m.role === 'assistant')
    const reply = getTextFromAssistantMessage(assistantMessage?.content) || 'Sorry, I could not generate a response.'

    return NextResponse.json({ reply })
  } catch (err: any) {
    console.error('REVA chat error', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
