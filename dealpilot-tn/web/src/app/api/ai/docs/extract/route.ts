import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { document_id, model = 'gpt-4o-mini' } = body
    if(!document_id) return NextResponse.json({ error: 'missing document_id' }, { status: 400 })

    const supabase = createServerSupabaseClient()
    const { data: doc } = await supabase.from('documents').select('*').eq('id', document_id).single()
    if(!doc) return NextResponse.json({ error: 'document not found' }, { status:404 })

    // download file from storage
    const { data: fileRes, error: fileErr } = await supabase.storage.from('documents').download(doc.path)
    if(fileErr) return NextResponse.json({ error: fileErr.message }, { status:500 })
    const arrayBuffer = await fileRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // dynamic import pdf-parse
    const pdf = await import('pdf-parse')
    const textRes = await (pdf.default || pdf)(buffer as any)
    const text = textRes.text || ''

    // build prompt
    const prompt = `You are a Tennessee real estate contract analyzer. Extract buyer_name, seller_name, property_address, purchase_price, earnest_money, binding_date, inspection_deadline, appraisal_deadline, closing_date, financing_type, special_stipulations. Return JSON with confidence scores per field.`

    const apiKey = process.env.OPENAI_API_KEY
    if(!apiKey) return NextResponse.json({ error: 'missing OPENAI_API_KEY' }, { status:500 })

    const resp = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{ 'Content-Type':'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: 'You extract structured JSON.' }, { role: 'user', content: prompt + '\n\nTEXT:\n' + text }], temperature:0 }) })
    const j = await resp.json()
    const reply = j?.choices?.[0]?.message?.content || ''

    let parsed = null
    try{ parsed = JSON.parse(reply) }catch(e){ parsed = { raw: reply } }

    // save to document_extractions
    const { data, error } = await supabase.from('document_extractions').insert([{ document_id, transaction_id: doc.transaction_id || null, raw_text: text, extraction_json: parsed, model }]).select('*').single()
    if(error) return NextResponse.json({ error: error.message }, { status:500 })

    return NextResponse.json({ extraction: data })
  }catch(err:any){ return NextResponse.json({ error: err.message||String(err) }, { status:500 }) }
}
