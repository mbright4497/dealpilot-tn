import OpenAI from 'openai'

export const maxDuration = 60

export async function GET() {
  const assistantId = process.env.REVA_ASSISTANT_ID_TN || 'MISSING'
  const openaiKeyExists = !!process.env.OPENAI_API_KEY

  console.log('[REVA_TEST] REVA_ASSISTANT_ID_TN:', assistantId)
  console.log('[REVA_TEST] OPENAI_API_KEY exists:', openaiKeyExists)

  let threadCreated = false
  let error: string | null = null

  try {
    if (!openaiKeyExists) {
      throw new Error('OPENAI_API_KEY is missing')
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const thread = await openai.beta.threads.create()
    threadCreated = true
    await openai.beta.threads.del(thread.id)
    console.log('[REVA_TEST] OpenAI thread create/delete succeeded')
  } catch (err: any) {
    error = err?.message || 'Unknown error'
    console.error('[REVA_TEST] OpenAI connectivity test failed:', err)
  }

  return Response.json({
    assistantId,
    openaiKeyExists,
    threadCreated,
    error,
  })
}
