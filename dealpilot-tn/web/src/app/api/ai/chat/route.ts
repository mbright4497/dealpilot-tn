import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getSchema, buildSystemPrompt, FORM_LIST } from '@/lib/formSchemas'

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, formId, filledFields, dealId } = body

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 })
  }

  // Lazy init clients
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Build system prompt based on selected form
    let systemContent = `You are DealPilot AI, a Tennessee real estate transaction coordinator assistant built specifically for TN agents at iHome-KW and other TN brokerages.

You have deep knowledge of:
- Tennessee real estate law (Title 62, Title 66 TCA)
- TREC (Tennessee Real Estate Commission) forms and rules
- Tennessee MLS rules including Clear Cooperation
- VA and FHA requirements for Tennessee transactions
- TN agency disclosure requirements
- Earnest money, escrow, and closing procedures in Tennessee
- Tri-Cities, Nashville, Memphis, and Middle TN market practices

Available TN contract forms you can help fill out:
${FORM_LIST.map(f => `- ${f.id.toUpperCase()}: ${f.name}`).join('\n')}

Behavior:
- Be concise, direct, and practical - built for working agents, not consumers
- When a user wants to fill out a form, ask for the form ID or help them choose
- Ask for 1-2 fields at a time conversationally
- Confirm values before saving
- Flag risk items: seller concessions >6%, closing under 14 days, VA/FHA appraisal gaps
- Never provide legal advice - recommend attorney review for complex clauses
- Format field data as JSON in your response when you extract values
- Tone: professional, calm, and confident`

    if (formId) {
      const schema = getSchema(formId)
      if (schema) {
        systemContent = buildSystemPrompt(schema, filledFields || {})
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      // Fallback response when no API key
      return NextResponse.json({
        reply: "DealPilot AI is ready! To activate the AI assistant, please add your OPENAI_API_KEY to Vercel environment variables. I can help you fill out RF401, RF403, RF404, RF421, RF651, and RF625 forms.",
        extractedFields: null,
        formSuggestion: null
      })
    }

    const openaiMessages = [
      { role: 'system' as const, content: systemContent },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.3,
      max_tokens: 800,
    })

    const reply = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.'

    // Try to extract JSON field data from reply
    let extractedFields: Record<string, unknown> | null = null
    let formSuggestion: string | null = null

    const jsonMatch = reply.match(/```json\n?([\s\S]*?)\n?```/)
    if (jsonMatch) {
      try {
        extractedFields = JSON.parse(jsonMatch[1])
      } catch {
        // ignore parse errors
      }
    }

    // Detect form suggestion in reply
    const formIds = ['rf401','rf403','rf404','rf421','rf651','rf625']
    for (const fid of formIds) {
      if (reply.toLowerCase().includes(fid)) {
        formSuggestion = fid
        break
      }
    }

    // Auto-save extracted fields to Supabase if we have a dealId
    if (extractedFields && dealId && formId) {
      try {
        await supabase
          .from('deal_documents')
          .upsert({
            deal_id: dealId,
            document_type: formId,
            field_values: extractedFields,
            status: 'draft',
            updated_at: new Date().toISOString()
          }, { onConflict: 'deal_id,document_type' })
      } catch (dbErr) {
        console.error('DB save error:', dbErr)
      }
    }

    return NextResponse.json({ reply, extractedFields, formSuggestion })

  } catch (err) {
    console.error('AI chat error:', err)
    return NextResponse.json({
      reply: 'Sorry, I encountered an error. Please try again.',
      extractedFields: null,
      formSuggestion: null
    })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    forms: FORM_LIST.map(f => ({ id: f.id, name: f.name }))
  })
}
