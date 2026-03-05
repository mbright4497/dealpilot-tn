import { NextResponse } from 'next/server'

// Server runtime (uses fs via pdf-parse); do not run on edge
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as any
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Dynamically import pdf-parse at runtime to avoid build-time bundling issues
    const pdf = await import('pdf-parse/lib/pdf-parse.js')
    const data = await (pdf.default || pdf)(buffer as any)
    const rawText = data.text || ''

    // Prepend line numbers so GPT can reference exact lines
    const lines = rawText.split('\n')
    const numberedText = lines.map((line: string, i: number) => `L${i + 1}: ${line}`).join('\n')

    // Call OpenAI to extract fields with RF401-specific guidance
    const prompt = `You are a Tennessee real estate contract analyzer specializing in RF401 Purchase and Sale Agreements.

CRITICAL RULES FOR BUYER vs SELLER IDENTIFICATION:
- In the RF401, Section 1 "Purchase and Sale" follows this EXACT pattern:
  "[BUYER NAME(S)]  (\'Buyer\') agrees to buy and the"
  "[SELLER NAME(S)]  (\'Seller\')"
- The BUYER is the party who "agrees to buy" - their name appears BEFORE the word "Buyer" in quotes
- The SELLER is the party who agrees to sell - their name appears BEFORE the word "Seller" in quotes  
- DO NOT swap these. The person labeled "Buyer" in the contract IS the buyer.
- If multiple names appear for buyer or seller, separate them with commas.

Each line in the text below is prefixed with a line number (L1, L2, etc.).
Use these line numbers to locate the correct fields.

Extract these fields and return JSON ONLY:
{
  "buyer_name": "name(s) from the line containing (\'Buyer\')",
  "seller_name": "name(s) from the line containing (\'Seller\')",
  "property_address": "full address including city, state, zip",
  "purchase_price": "number only",
  "binding_date": "YYYY-MM-DD",
  "closing_date": "YYYY-MM-DD",
  "inspection_deadline": "YYYY-MM-DD or null",
  "appraisal_deadline": "YYYY-MM-DD or null",
  "financing_deadline": "YYYY-MM-DD or null",
  "earnest_money": "number only",
  "special_stipulations": "text or null",
  "loan_type": "Conventional/VA/FHA/USDA or null",
  "contract_type": "Purchase and Sale Agreement"
}

TEXT:\n${numberedText}`

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are a JSON generator. Return ONLY valid JSON, no markdown fences.' }, { role: 'user', content: prompt }], temperature: 0 }),
    })

    const j = await resp.json()
    const reply = j?.choices?.[0]?.message?.content || ''

    // Try to parse JSON from reply (strip markdown fences if present)
    let parsed = null
    try {
      const cleaned = reply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch (e) {
      parsed = { raw: reply }
    }

    return NextResponse.json({ extracted: parsed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
