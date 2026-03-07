import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { getSchema, buildSystemPrompt, FORM_LIST } from '@/lib/formSchemas'

const TC_SYSTEM_PROMPT = `You are ClosingPilot AI — a personal Transaction Coordinator assistant built exclusively for Tennessee real estate agents.

You are NOT a generic chatbot. You are a licensed-level TC who knows:
- Tennessee Real Estate Commission (TREC) forms inside and out
- TCA Title 62 (licensing) and Title 66 (property/landlord-tenant)
- Tennessee MLS rules including Clear Cooperation Policy
- VA, FHA, USDA, and conventional loan requirements for TN transactions
- TN agency disclosure requirements (RF301, RF302, RF303)
- Earnest money rules: must be deposited within 3 business days per TN law
- Typical TN closing timelines: 30-45 days conventional, 45-60 days VA/FHA
- Tri-Cities, Knoxville, Nashville, Chattanooga, Memphis market practices
- Tennessee property tax proration (taxes paid in arrears)
- TN homestead exemption rules
- Wire fraud prevention best practices

Your personality:
- Direct, confident, no fluff — you talk like a seasoned TC
- Use TN-specific terminology naturally (BAD = Binding Agreement Date, etc.)
- Proactively flag issues: seller concessions over 3% for conventional, closing under 21 days, missing earnest money deadlines
- When you spot a potential problem, say it clearly: "Heads up — [issue]"
- After collecting fields, summarize what you have and what's still needed
- Celebrate milestones: "Nice — Section 1 is locked in. Moving to financing."

Available TN REALTORS forms you help fill out:
${FORM_LIST.map(f => '- ' + f.id.toUpperCase() + ': ' + f.name).join('\n')}

Field Extraction Rules:
- When the user provides form data, extract it into a JSON code block
- Format: \`\`\`json\n{"field_key": "value"}\n\`\`\`
- Only include fields you are confident about
- For dates, use YYYY-MM-DD format
- For money amounts, use numbers without $ or commas
- For arrays (buyer_names, seller_names), use ["Name 1", "Name 2"]

Beyond forms, you can help with:
- Deal timeline calculations (inspection deadlines, closing dates)
- Transaction checklists (what to do from contract to close)
- TN-specific compliance questions
- Comparing financing options for TN properties
- Explaining TREC form sections in plain English

Never provide legal advice. Always recommend attorney review for complex clauses.
After all required fields are collected, tell the agent they can download the completed form as PDF.`

export async function POST(req: Request) {
  const body = await req.json()
  const { messages, formId, filledFields, dealId, action } = body

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 })
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Build context-aware system prompt
    let systemContent = TC_SYSTEM_PROMPT

    if (formId) {
      const schema = getSchema(formId)
      if (schema) {
        systemContent = buildSystemPrompt(schema, filledFields || {})
      }
    }

    // Add deal context if available
    if (dealId) {
      try {
        const { data: deal } = await supabase
          .from('deals')
          .select('*')
          .eq('id', dealId)
          .single()
        if (deal) {
          systemContent += `\n\nCurrent Deal Context:\n- Property: ${deal.property_address || 'Not set'}\n- Status: ${deal.status || 'Active'}\n- Price: $${deal.sale_price || 'TBD'}\n- Closing: ${deal.closing_date || 'TBD'}`
        }
      } catch { /* no deal context */ }
    }

    // Fetch portfolio-level context (active deals count, overdue deadlines, today's priorities)
    try {
      const ph = await fetch(new URL('/api/portfolio-health', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost'))
      const pd = await fetch(new URL('/api/portfolio-deadlines', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost'))
      if (ph.ok && pd.ok) {
        const phd = await ph.json()
        const pdd = await pd.json()
        const activeCount = phd?.total_deals ?? phd?.portfolio_score ?? 0
        const overdue = pdd?.overdue_count ?? 0
        const todays = (pdd?.next_7_days || []).filter((d:any)=>d.date === new Date().toISOString().split('T')[0]).length
        systemContent += `\n\nPortfolio Context:\n- Active deals: ${activeCount}\n- Overdue deadlines: ${overdue}\n- Deadlines today: ${todays}`
      }
    } catch (e) { /* ignore */ }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        reply: "ClosingPilot AI is ready! Add your OPENAI_API_KEY to Vercel environment variables to activate. I can help fill out RF401, RF403, RF404, RF421, RF651, and RF625 forms, plus manage your transaction timeline and checklists.",
        extractedFields: null,
        formSuggestion: null,
        quickActions: ['Fill out RF401', 'Start new deal', 'View checklist']
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
      max_tokens: 1200,
    })

    const reply = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.'

    // Extract JSON field data from reply
    let extractedFields: Record<string, unknown> | null = null
    let formSuggestion: string | null = null
    const quickActions: string[] = []

    const jsonMatch = reply.match(/```json\n?([\s\S]*?)\n?```/)
    if (jsonMatch) {
      try {
        extractedFields = JSON.parse(jsonMatch[1])
      } catch { /* ignore parse errors */ }
    }

    // Detect form suggestion
    const formIds = ['rf401','rf403','rf404','rf421','rf651','rf625']
    for (const fid of formIds) {
      if (reply.toLowerCase().includes(fid)) {
        formSuggestion = fid
        break
      }
    }

    // Generate smart quick actions based on context
    if (!formId) {
      quickActions.push('Fill out RF401', 'New construction (RF403)', 'Counter offer (RF651)')
    } else if (extractedFields) {
      const schema = getSchema(formId)
      const filled = { ...(filledFields || {}), ...extractedFields }
      const missing = schema?.fields.filter(f => f.required && !filled[f.key]) || []
      if (missing.length === 0) {
        quickActions.push('Download PDF', 'Review all fields', 'Start new form')
      } else {
        const nextSection = missing[0]?.section || 'next section'
        quickActions.push(`Continue to ${nextSection}`, 'Show progress', 'Skip to summary')
      }
    }

    // Save to Supabase if we have a dealId
    if (extractedFields && dealId && formId) {
      try {
        await supabase
          .from('deal_documents')
          .upsert({
            deal_id: dealId,
            document_type: formId,
            field_values: { ...(filledFields || {}), ...extractedFields },
            status: 'draft',
            updated_at: new Date().toISOString()
          }, { onConflict: 'deal_id,document_type' })
      } catch (dbErr) {
        console.error('DB save error:', dbErr)
      }
    }

    return NextResponse.json({
      reply,
      extractedFields,
      formSuggestion,
      quickActions
    })
  } catch (err) {
    console.error('AI chat error:', err)
    return NextResponse.json({
      reply: 'Sorry, I hit a snag. Give me another shot.',
      extractedFields: null,
      formSuggestion: null,
      quickActions: ['Try again', 'Start over']
    })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    assistant: 'ClosingPilot AI - Tennessee Transaction Coordinator',
    forms: FORM_LIST.map(f => ({ id: f.id, name: f.name })),
    capabilities: [
      'TN REALTORS form filling (RF401-RF625)',
      'Transaction timeline & deadline tracking',
      'TC checklist management',
      'TN compliance guidance',
      'Voice input support',
      'PDF form generation & download'
    ]
  })
}
