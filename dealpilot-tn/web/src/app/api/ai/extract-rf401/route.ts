import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const RF401_SCHEMA = {
  name: 'rf401',
  description: 'RF401 fields',
  parameters: {
    type: 'object',
    properties: {
      buyer_names: { type: 'array', items: { type: 'string' } },
      seller_names: { type: 'array', items: { type: 'string' } },
      property: { type: 'object', properties: { address: { type:'string' }, county:{type:'string'} } },
      sale_price: { type: 'number' },
      loan_type: { type: 'string' },
      binding_agreement_date: { type: 'string' },
      closing_date: { type: 'string' },
      earnest_money_amount: { type: 'number' }
    }
  }
}

export async function POST(req: Request){
  const body = await req.json()
  const { deal_id, text } = body
  if(!deal_id) return NextResponse.json({ error:'missing deal_id'},{status:400})

  // Lazy init - only create clients when the handler runs, not at build time
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  try{
    if(!process.env.OPENAI_API_KEY){
      // No API key - use regex fallback
      const extracted = regexFallback(text)
      await supabase.from('deal_documents').insert({ document_type: 'rf401', deal_id, field_values: extracted, status: 'draft' })
      return NextResponse.json({ extracted, method: 'regex' })
    }

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages:[{role:'user',content:`Extract RF401 fields from the following document:\n\n${text}`}],
      functions:[RF401_SCHEMA],
      function_call:{ name: 'rf401' }
    } as any)
    const choice = resp.choices?.[0]
    let extracted: any = null
    if(choice && choice.message && choice.message.function_call){
      const args = JSON.parse(choice.message.function_call.arguments || '{}')
      extracted = args
    }
    if(!extracted){
      extracted = regexFallback(text)
    }
    await supabase.from('deal_documents').insert({ document_type: 'rf401', deal_id, field_values: extracted, status: 'draft' })
    return NextResponse.json({ extracted, method: 'openai' })
  }catch(e){
    console.error(e)
    // Fallback to regex on any OpenAI error
    try {
      const extracted = regexFallback(text)
      await supabase.from('deal_documents').insert({ document_type: 'rf401', deal_id, field_values: extracted, status: 'draft' })
      return NextResponse.json({ extracted, method: 'regex_fallback' })
    } catch(e2) {
      return NextResponse.json({ error: 'extract_failed' }, { status: 500 })
    }
  }
}

function regexFallback(text: string) {
  const fields: any = {}
  const buyerMatch = text.match(/buyer[s]?:?\s*([A-Za-z, ]+)/i)
  if(buyerMatch) fields.buyer_names = buyerMatch[1].split(',').map((s: string) => s.trim())
  const sellerMatch = text.match(/seller[s]?:?\s*([A-Za-z, ]+)/i)
  if(sellerMatch) fields.seller_names = sellerMatch[1].split(',').map((s: string) => s.trim())
  const priceMatch = text.match(/\$?([0-9,]+)\s*(?:sale\s*price)?/i)
  if(priceMatch) fields.sale_price = Number(priceMatch[1].replace(/,/g, ''))
  return fields
}
