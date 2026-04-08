export const dynamic = 'force-dynamic'
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
      property_type: { type: 'string', enum: ['Single Family','Condo','Townhouse','Multi-Family','Land','Commercial','Other'], description: 'Type of property' },
      sale_price: { type: 'number', description: 'Purchase/sale price in dollars' },
      earnest_money: { type: 'number', description: 'Earnest money deposit amount in dollars' },
      loan_type: { type: 'string', enum: ['Conventional','FHA','VA','USDA','Cash','Other'], description: 'Type of financing' },
      loan_amount: { type: 'number', description: 'Loan amount in dollars' },
      binding_agreement_date: { type: 'string', description: 'Binding agreement date (YYYY-MM-DD)' },
      closing_date: { type: 'string', description: 'Closing date (YYYY-MM-DD)' },
      possession_date: { type: 'string', description: 'Possession date (YYYY-MM-DD)' },
      inspection_period_days: { type: 'number', description: 'Inspection period in days' },
      resolution_period_days: { type: 'number', description: 'Resolution period in days' },
      financing_contingency_days: { type: 'number', description: 'Financing contingency in days' },
      appraisal_contingent: { type: 'boolean', description: 'Whether agreement is contingent on appraisal' },
      title_company: { type: 'string', description: 'Title/closing company name' },
      listing_agent: { type: 'string' },
      listing_brokerage: { type: 'string' },
      buyer_agent: { type: 'string' },
      buyer_brokerage: { type: 'string' },
      home_warranty: { type: 'boolean', description: 'Whether home warranty is included' },
      lead_based_paint: { type: 'boolean', description: 'Whether lead-based paint disclosure applies' },
      special_stipulations: { type: 'array', items: { type: 'string' } },
      items_remaining: { type: 'array', items: { type: 'string' } },
      items_not_remaining: { type: 'array', items: { type: 'string' } },
    },
    required: ['property_address','sale_price','binding_agreement_date','closing_date']
  }
}

const SYSTEM_PROMPT = `You are a Tennessee real estate contract extraction expert. Given the text of a purchase agreement, extract all key deal fields accurately. Pay special attention to:
- Dates should be in YYYY-MM-DD format
- Money amounts should be numbers without $ or commas
- For contingency periods, extract the number of days
- If a field is not found in the text, omit it rather than guessing
- For Tennessee contracts, look for TREC form references and TN-specific terms
- Binding agreement date may also be called "effective date" or "contract date"`

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    let text = ''
    if (file.type === 'application/pdf') {
      const buffer = Buffer.from(await file.arrayBuffer())
      try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as any)
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
      const pdfDoc = await loadingTask.promise
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ') + '\n'
      }
      } catch (e) {
        return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 400 })
      }
    } else {
      text = await file.text()
    }

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
    return NextResponse.json({ error: 'extraction_failed', details: e.message }, { status: 500 })
  }
}

function regexFallback(text: string) {
  const fields: any = {}
  const buyerMatch = text.match(/buyer[s]?[:\s]+([A-Za-z\s,\.]+?)(?=\n|seller|property)/i)
  if (buyerMatch) fields.buyer_names = buyerMatch[1].split(/,|and/i).map((s: string) => s.trim()).filter(Boolean)
  const sellerMatch = text.match(/seller[s]?[:\s]+([A-Za-z\s,\.]+?)(?=\n|buyer|property)/i)
  if (sellerMatch) fields.seller_names = sellerMatch[1].split(/,|and/i).map((s: string) => s.trim()).filter(Boolean)
  const addrMatch = text.match(/property[\s]*address[:\s]+(.+?)(?=\n)/i) || text.match(/(\d+\s+[A-Za-z\s]+(?:St|Ave|Rd|Dr|Ln|Blvd|Way|Ct|Pl)[\.,]?\s*[A-Za-z\s]+,\s*TN\s*\d{5})/i)
  if (addrMatch) fields.property_address = addrMatch[1].trim()
  const priceMatch = text.match(/(?:purchase|sale|contract)\s*price[:\s]*\$?([\d,]+)/i)
  if (priceMatch) fields.sale_price = Number(priceMatch[1].replace(/,/g, ''))
  const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g
  const dates = text.match(dateRegex) || []
  if (dates.length >= 1) fields.binding_agreement_date = dates[0]
  if (dates.length >= 2) fields.closing_date = dates[dates.length - 1]
  if (/\bVA\b/i.test(text)) fields.loan_type = 'VA'
  else if (/\bFHA\b/i.test(text)) fields.loan_type = 'FHA'
  else if (/\bUSDA\b/i.test(text)) fields.loan_type = 'USDA'
  else if (/\bcash\b/i.test(text)) fields.loan_type = 'Cash'
  else if (/\bconventional\b/i.test(text)) fields.loan_type = 'Conventional'
  const emMatch = text.match(/earnest\s*money[:\s]*\$?([\d,]+)/i)
  if (emMatch) fields.earnest_money = Number(emMatch[1].replace(/,/g, ''))
  return fields
}
