import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const CONTRACT_SCHEMA = {
  name: 'extract_contract',
  description: 'Extract key deal fields from a Tennessee real estate purchase agreement',
  parameters: {
    type: 'object',
    properties: {
      buyer_names: { type: 'array', items: { type: 'string' }, description: 'Full legal names of all buyers' },
      seller_names: { type: 'array', items: { type: 'string' }, description: 'Full legal names of all sellers' },
      property_address: { type: 'string', description: 'Full property street address including city, state, zip' },
      county: { type: 'string', description: 'County where property is located' },
      sale_price: { type: 'number', description: 'Purchase/sale price in dollars' },
      earnest_money: { type: 'number', description: 'Earnest money deposit amount in dollars' },
      loan_type: { type: 'string', enum: ['Conventional','FHA','VA','USDA','Cash','Other'], description: 'Type of financing' },
      binding_agreement_date: { type: 'string', description: 'Binding agreement / effective date (YYYY-MM-DD)' },
      closing_date: { type: 'string', description: 'Scheduled closing date (YYYY-MM-DD)' },
      inspection_period_days: { type: 'number', description: 'Number of days for inspection period' },
      financing_contingency_days: { type: 'number', description: 'Number of days for financing contingency' },
      appraisal_contingency_days: { type: 'number', description: 'Number of days for appraisal contingency' },
      title_company: { type: 'string', description: 'Name of title/closing company' },
      listing_agent: { type: 'string', description: 'Listing agent name' },
      listing_brokerage: { type: 'string', description: 'Listing brokerage name' },
      buyer_agent: { type: 'string', description: 'Buyer agent name' },
      buyer_brokerage: { type: 'string', description: 'Buyer brokerage name' },
      special_stipulations: { type: 'array', items: { type: 'string' }, description: 'Any special stipulations or addenda noted' },
      property_type: { type: 'string', enum: ['Single Family','Condo','Townhouse','Multi-Family','Land','Commercial','Other'], description: 'Type of property' },
    },
    required: ['property_address','sale_price','binding_agreement_date','closing_date']
  }
}

const SYSTEM_PROMPT = `You are a Tennessee real estate contract extraction expert. Given the text of a purchase agreement, extract all key deal fields accurately. Pay special attention to:
- Dates should be in YYYY-MM-DD format
- Money amounts should be numbers without $ or commas
- For contingency periods, extract the number of days (e.g. "10 day inspection" = 10)
- If a field is not found in the text, omit it rather than guessing
- For Tennessee contracts, look for TREC form references and TN-specific terms
- Binding agreement date may also be called "effective date" or "contract date"`

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { text } = body

    if (!text || text.trim().length < 50) {
      return NextResponse.json({ error: 'Contract text too short or missing' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })

    if (!process.env.OPENAI_API_KEY) {
      const extracted = regexFallback(text)
      return NextResponse.json({ extracted, method: 'regex', confidence: 'low' })
    }

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract all deal fields from this Tennessee purchase agreement:\n\n${text.slice(0, 12000)}` }
      ],
      functions: [CONTRACT_SCHEMA],
      function_call: { name: 'extract_contract' }
    } as any)

    const choice = resp.choices?.[0]
    let extracted: any = null

    if (choice?.message?.function_call) {
      extracted = JSON.parse(choice.message.function_call.arguments || '{}')
    }

    if (!extracted) {
      extracted = regexFallback(text)
      return NextResponse.json({ extracted, method: 'regex_fallback', confidence: 'low' })
    }

    return NextResponse.json({ extracted, method: 'openai', confidence: 'high' })

  } catch (e: any) {
    console.error('Contract extraction error:', e)
    try {
      const body = await req.clone().json().catch(() => ({ text: '' }))
      const extracted = regexFallback(body.text || '')
      return NextResponse.json({ extracted, method: 'error_fallback', confidence: 'low' })
    } catch {
      return NextResponse.json({ error: 'extraction_failed' }, { status: 500 })
    }
  }
}

function regexFallback(text: string) {
  const fields: any = {}

  // Buyer names
  const buyerMatch = text.match(/buyer[s]?[:\s]+([A-Za-z\s,\.]+?)(?=\n|seller|property)/i)
  if (buyerMatch) fields.buyer_names = buyerMatch[1].split(/,|and/i).map((s: string) => s.trim()).filter(Boolean)

  // Seller names
  const sellerMatch = text.match(/seller[s]?[:\s]+([A-Za-z\s,\.]+?)(?=\n|buyer|property)/i)
  if (sellerMatch) fields.seller_names = sellerMatch[1].split(/,|and/i).map((s: string) => s.trim()).filter(Boolean)

  // Property address
  const addrMatch = text.match(/property[\s]*address[:\s]+(.+?)(?=\n)/i) || text.match(/(\d+\s+[A-Za-z\s]+(?:St|Ave|Rd|Dr|Ln|Blvd|Way|Ct|Pl)[\.,]?\s*[A-Za-z\s]+,\s*TN\s*\d{5})/i)
  if (addrMatch) fields.property_address = addrMatch[1].trim()

  // Sale price
  const priceMatch = text.match(/(?:purchase|sale|contract)\s*price[:\s]*\$?([\d,]+)/i)
  if (priceMatch) fields.sale_price = Number(priceMatch[1].replace(/,/g, ''))

  // Dates
  const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g
  const dates = text.match(dateRegex) || []
  if (dates.length >= 1) fields.binding_agreement_date = dates[0]
  if (dates.length >= 2) fields.closing_date = dates[dates.length - 1]

  // Loan type
  if (/\bVA\b/i.test(text)) fields.loan_type = 'VA'
  else if (/\bFHA\b/i.test(text)) fields.loan_type = 'FHA'
  else if (/\bUSDA\b/i.test(text)) fields.loan_type = 'USDA'
  else if (/\bcash\b/i.test(text)) fields.loan_type = 'Cash'
  else if (/\bconventional\b/i.test(text)) fields.loan_type = 'Conventional'

  // Earnest money
  const emMatch = text.match(/earnest\s*money[:\s]*\$?([\d,]+)/i)
  if (emMatch) fields.earnest_money = Number(emMatch[1].replace(/,/g, ''))

  return fields
}
