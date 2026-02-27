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
      property_type: { type: 'string', enum: ['Single Family','Condo','Townhouse','Multi-Family','Land','Commercial','Other'] },
      sale_price: { type: 'number', description: 'Purchase/sale price in dollars' },
      earnest_money: { type: 'number', description: 'Earnest money deposit amount in dollars' },
      loan_type: { type: 'string', enum: ['Conventional','FHA','VA','USDA','Cash','Other'] },
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
      items_remaining: { type: 'array', items: { type: 'string' }, description: 'Items that remain with property' },
      items_not_remaining: { type: 'array', items: { type: 'string' }, description: 'Items that do not remain' },
    },
    required: ['property_address','sale_price','binding_agreement_date','closing_date']
  }
}

const SYSTEM_PROMPT = `You are a Tennessee real estate contract extraction expert. Given the text of an RF401 Purchase and Sale Agreement, extract ALL key deal fields. Pay special attention to:
- Dates in YYYY-MM-DD format
- Money amounts as numbers without $ or commas
- For contingency periods, extract days as numbers
- If a field is blank/not filled in the contract, omit it
- Look for TREC form references and TN-specific terms
- Binding agreement date may be called "effective date" or "contract date"
- Extract items that remain/don't remain with property from sections 1.B and 1.C
- Extract special stipulations from section 21`

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer)
      text = pdfData.text
    } else {
      text = buffer.toString('utf-8')
    }

    if (text.trim().length < 50) {
      return NextResponse.json({ error: 'Could not extract enough text from document' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ extracted: {}, rawText: text.slice(0, 500), method: 'no_api_key', confidence: 'none' })
    }

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract all deal fields from this Tennessee purchase agreement:\n\n${text.slice(0, 15000)}` }
      ],
      functions: [CONTRACT_SCHEMA],
      function_call: { name: 'extract_contract' }
    } as any)

    const choice = resp.choices?.[0]
    let extracted: any = null
    if (choice?.message?.function_call) {
      extracted = JSON.parse(choice.message.function_call.arguments || '{}')
    }

    return NextResponse.json({ extracted: extracted || {}, rawText: text.slice(0, 500), method: extracted ? 'openai' : 'failed', confidence: extracted ? 'high' : 'none' })
  } catch (e: any) {
    console.error('Contract extraction error:', e)
    return NextResponse.json({ error: 'extraction_failed', details: e.message }, { status: 500 })
  }
}
