import OpenAI from 'openai'

export async function setupTransactionIntelligence(
  transaction: any,
  supabase: any
): Promise<void> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const today = new Date().toISOString().split('T')[0]

  const prompt = `You are Reva, an expert Tennessee real estate transaction coordinator with full knowledge of TN law, RF401, and TREC requirements.

A new transaction has been created:
Address: ${transaction.address}, ${transaction.property_city || ''} TN ${transaction.property_zip || ''}
Client: ${transaction.client}
Type: ${transaction.client_type || 'buyer'}
Closing date: ${transaction.closing_date || 'not set yet'}
Binding date: ${transaction.binding_date || 'not set yet'}
Loan type: ${transaction.loan_type || 'unknown'}
Financing contingency waived: ${transaction.financing_contingency_waived || false}
Today: ${today}

Generate a complete transaction intelligence package.
Return ONLY valid JSON, no markdown, no explanation:

{
  "checklist": [
    {
      "id": "1",
      "title": "milestone title",
      "category": "contract|financing|inspection|title|closing",
      "priority": "critical|high|medium|low",
      "due_date": "YYYY-MM-DD or null",
      "completed": false,
      "notes": "why this matters in TN"
    }
  ],
  "deadlines": [
    {
      "id": "1",
      "title": "deadline name",
      "due_date": "YYYY-MM-DD or null",
      "days_from_binding": 3,
      "status": "upcoming|overdue|completed",
      "critical": true,
      "tca_reference": "TCA section if applicable"
    }
  ],
  "summary": {
    "deal_overview": "2-3 sentence summary of this deal",
    "immediate_actions": ["action 1", "action 2", "action 3"],
    "risks": ["risk 1 if any"],
    "missing_info": ["what still needs to be collected"]
  },
  "contacts_needed": [
    {
      "role": "lender|title|buyer_agent|seller_agent|inspector",
      "reason": "why this contact is needed",
      "urgency": "immediate|this_week|before_closing"
    }
  ]
}

Rules:
- If closing_date is set, calculate actual deadline dates
- If financing_contingency_waived is true, skip loan milestones
- Always include TN mandatory disclosures
- Flag if closing window is compressed (under 21 days)
- Use TCA citations where relevant
- Make checklist items deal-specific, not generic
- If binding_date is missing, note all date-based deadlines as 'pending binding date'`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.choices[0]?.message?.content || '{}'
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    const intelligence = JSON.parse(clean)

    await supabase
      .from('transactions')
      .update({
        ai_checklist: intelligence.checklist,
        ai_deadlines: intelligence.deadlines,
        ai_summary: intelligence.summary,
        ai_contacts: intelligence.contacts_needed,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    console.log('Transaction intelligence generated:', transaction.id)
  } catch (e) {
    console.error('Failed to parse intelligence:', e)
  }
}
