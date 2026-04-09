import OpenAI from 'openai'

export async function setupTransactionIntelligence(
  transaction: any,
  supabase: any
): Promise<void> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const today = new Date().toISOString().split('T')[0]

  const prompt = `You are Vera, an expert Tennessee real estate transaction coordinator with full knowledge of TN law, RF401, and TREC requirements.

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
    { "id": "pre_1", "phase": "pre_contract", "title": "Execute Buyer Representation Agreement (RF 141)", "category": "contract", "priority": "critical", "due_date": null, "completed": false, "notes": "Required before showing or writing offers in TN. Confirm signed copy on file." },
    { "id": "pre_2", "phase": "pre_contract", "title": "Confirm pre-approval or proof of funds", "category": "financing", "priority": "critical", "due_date": null, "completed": false, "notes": "Verify lender letter is dated within 30 days and covers purchase price." },
    { "id": "pre_3", "phase": "pre_contract", "title": "Review HOA documents and dues", "category": "contract", "priority": "high", "due_date": null, "completed": false, "notes": "Request HOA resale certificate if applicable. Check for special assessments." },
    { "id": "pre_4", "phase": "pre_contract", "title": "Confirm property disclosure receipt (RF 405)", "category": "contract", "priority": "high", "due_date": null, "completed": false, "notes": "Seller's Property Condition Disclosure must be provided prior to binding. TCA 66-5-202." },
    { "id": "pre_5", "phase": "pre_contract", "title": "Lead paint disclosure (if pre-1978 home)", "category": "contract", "priority": "high", "due_date": null, "completed": false, "notes": "Federal requirement: EPA Lead Paint Disclosure and 10-day inspection right. Skip if home is post-1978." },
    { "id": "pre_6", "phase": "pre_contract", "title": "Select and confirm title/closing attorney", "category": "title", "priority": "medium", "due_date": null, "completed": false, "notes": "TN requires a licensed attorney to close. Confirm availability and get fee quote." },
    { "id": "pre_7", "phase": "pre_contract", "title": "Identify and contact preferred lender", "category": "financing", "priority": "medium", "due_date": null, "completed": false, "notes": "Introduce buyer to lender. Confirm loan program, rate lock timeline, and estimated closing costs." },
    { "id": "uc_1", "phase": "under_contract", "title": "Deliver earnest money to escrow", "category": "contract", "priority": "critical", "due_date": null, "completed": false, "notes": "RF401 typically requires earnest money within 2 days of binding. Confirm amount and recipient." },
    { "id": "uc_2", "phase": "under_contract", "title": "Order home inspection", "category": "inspection", "priority": "critical", "due_date": null, "completed": false, "notes": "Schedule within first 3 days of binding. Inspection period end = binding + 10 calendar days (or per contract)." },
    { "id": "uc_3", "phase": "under_contract", "title": "Submit loan application (if financed)", "category": "financing", "priority": "critical", "due_date": null, "completed": false, "notes": "Lender must issue Loan Estimate within 3 business days of application. Track financing contingency deadline." },
    { "id": "uc_4", "phase": "under_contract", "title": "Review inspection report and negotiate repairs", "category": "inspection", "priority": "critical", "due_date": null, "completed": false, "notes": "Submit RF402 (Repair/Replacement Amendment) before inspection period expires." },
    { "id": "uc_5", "phase": "under_contract", "title": "Order appraisal", "category": "financing", "priority": "high", "due_date": null, "completed": false, "notes": "Lender orders appraisal after loan application. Confirm order placed. Watch for low appraisal risk." },
    { "id": "uc_6", "phase": "under_contract", "title": "Order title search and confirm clear title", "category": "title", "priority": "high", "due_date": null, "completed": false, "notes": "Title attorney runs search for liens, judgments, and encumbrances. Address any clouds on title." },
    { "id": "uc_7", "phase": "under_contract", "title": "Obtain homeowner's insurance binder", "category": "financing", "priority": "high", "due_date": null, "completed": false, "notes": "Lender requires proof of insurance before closing. Buyer should shop coverage early." },
    { "id": "uc_8", "phase": "under_contract", "title": "Satisfy financing contingency or waiver", "category": "financing", "priority": "high", "due_date": null, "completed": false, "notes": "Confirm loan commitment letter received. If waived, ensure buyer has funds verified." },
    { "id": "uc_9", "phase": "under_contract", "title": "Review and sign all seller disclosures", "category": "contract", "priority": "high", "due_date": null, "completed": false, "notes": "RF405, lead paint (if applicable), and any addenda. Keep signed copies on file." },
    { "id": "uc_10", "phase": "under_contract", "title": "Monitor contract amendment deadlines", "category": "contract", "priority": "medium", "due_date": null, "completed": false, "notes": "Track all RF402/RF406 counter dates. Any counter must be accepted before expiration." },
    { "id": "uc_11", "phase": "under_contract", "title": "Confirm closing date and time with all parties", "category": "closing", "priority": "medium", "due_date": null, "completed": false, "notes": "Align buyer, seller agent, lender, and closing attorney on closing date." },
    { "id": "uc_12", "phase": "under_contract", "title": "Request preliminary settlement statement (CD/HUD)", "category": "closing", "priority": "medium", "due_date": null, "completed": false, "notes": "Buyer must receive Closing Disclosure at least 3 business days before closing (TRID rule)." },
    { "id": "cl_1", "phase": "closing", "title": "Schedule and complete final walkthrough", "category": "closing", "priority": "critical", "due_date": null, "completed": false, "notes": "Conduct within 24–48 hours of closing. Verify condition and agreed repairs were completed." },
    { "id": "cl_2", "phase": "closing", "title": "Confirm wire transfer / certified funds", "category": "closing", "priority": "critical", "due_date": null, "completed": false, "notes": "Buyer must wire closing funds or bring certified check. Confirm exact amount from closing attorney day before." },
    { "id": "cl_3", "phase": "closing", "title": "Attend closing and sign all documents", "category": "closing", "priority": "critical", "due_date": null, "completed": false, "notes": "Bring valid government-issued ID. Review all documents before signing." },
    { "id": "cl_4", "phase": "closing", "title": "Confirm deed recorded and title policy issued", "category": "closing", "priority": "high", "due_date": null, "completed": false, "notes": "Closing attorney records deed with county register. Owner's title policy issued at closing." },
    { "id": "cl_5", "phase": "closing", "title": "Obtain keys and possession", "category": "closing", "priority": "high", "due_date": null, "completed": false, "notes": "Confirm possession terms per contract. Keys transferred at recording or per agreed time." },
    { "id": "cl_6", "phase": "closing", "title": "Submit commission disbursement and close file", "category": "closing", "priority": "high", "due_date": null, "completed": false, "notes": "Confirm commission disbursement authorization on file. Upload final HUD/CD to transaction file." },
    { "id": "cl_7", "phase": "closing", "title": "Archive executed contract and closing documents", "category": "closing", "priority": "medium", "due_date": null, "completed": false, "notes": "Upload final signed PSA, addenda, closing disclosure, and deed to transaction record." },
    { "id": "cl_8", "phase": "closing", "title": "Send post-closing follow-up to client", "category": "closing", "priority": "low", "due_date": null, "completed": false, "notes": "Congratulate client, provide summary of key documents, and request review/referral." }
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

Rules for checklist:
- Output the checklist exactly as shown above — all 27 items, preserving id, phase, title, category, and priority
- For due_date fields: if binding_date is set, calculate actual dates from it (e.g. uc_1 = binding + 2 days, uc_2 start = binding + 1 day, uc_2 deadline = binding + 10 days, uc_3 = binding + 3 days). Otherwise leave as null.
- If financing_contingency_waived is true, mark pre_2, uc_3, uc_5, uc_7, uc_8 as completed: true and notes "N/A — financing waived"
- If the home is post-1978, mark pre_5 as completed: true and notes "N/A — post-1978 property"
- Do NOT add or remove checklist items — output all 27

Rules for deadlines:
- ALL due_dates must be calculated from binding_date, NOT from Today. Today is for reference only (flagging overdue).
- If binding_date is missing, set all due_dates to null
- Include inspection period end, earnest money deadline, financing contingency, appraisal, closing date
- Use TCA citations where relevant

Other rules:
- Flag if closing window is compressed (under 21 days from binding to closing)
- Make summary and contacts deal-specific`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4000,
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
