export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { document_id, model = 'gpt-4o' } = body
    if(!document_id) return NextResponse.json({ error: 'missing document_id' }, { status: 400 })

    const supabase = createServerSupabaseClient({ request, response: undefined as any })
    const { data: doc } = await supabase.from('documents').select('*').eq('id', document_id).single()
    if(!doc) return NextResponse.json({ error: 'document not found' }, { status:404 })

    // download file from deal-documents storage (private)
    const storagePath = (doc.storage_path || doc.path || doc.storagePath || null)
    if(!storagePath) return NextResponse.json({ error: 'document missing storage_path' }, { status:500 })
    const { data: fileRes, error: fileErr } = await supabase.storage.from('deal-documents').download(storagePath)
    if(fileErr) return NextResponse.json({ error: fileErr.message }, { status:500 })
    const arrayBuffer = await fileRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // dynamic import pdf-parse
    const pdf = await import('pdf-parse/lib/pdf-parse.js')
    const textRes = await (pdf.default || pdf)(buffer as any)
    const text = textRes.text || ''

    // build prompt (extract the requested fields only)
    const prompt = `You are a Tennessee real estate contract analyzer. Extract the following fields from the provided contract text, returning a single JSON object with these keys: property_address, buyer_name, seller_name, purchase_price, earnest_money, due_diligence_period, inspection_deadline, closing_date. For each field include a confidence score (0-1). If a field is not found, set its value to null and confidence to 0. Respond with ONLY valid JSON.`

    const apiKey = process.env.OPENAI_API_KEY
    if(!apiKey) return NextResponse.json({ error: 'missing OPENAI_API_KEY' }, { status:500 })

    const resp = await fetch('https://api.openai.com/v1/chat/completions',{ method:'POST', headers:{ 'Content-Type':'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: 'You extract structured JSON.' }, { role: 'user', content: prompt + '\n\nTEXT:\n' + text }], temperature:0, max_tokens: 1200 }) })
    const j = await resp.json()
    const reply = j?.choices?.[0]?.message?.content || ''

    // extract JSON block from reply robustly
    let parsed = null
    try{
      const jsonMatch = reply.match(/\{[\s\S]*\}/m)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(reply)
    }catch(e){ parsed = { raw: reply } }

    // save to document_extractions table for audit
    const { data, error } = await supabase.from('document_extractions').insert([{ document_id, transaction_id: doc.transaction_id || doc.deal_id || null, raw_text: text, extraction_json: parsed, model }]).select('*').single()
    if(error) return NextResponse.json({ error: error.message }, { status:500 })

    return NextResponse.json({ extraction: data })
  }catch(err:any){ return NextResponse.json({ error: err.message||String(err) }, { status:500 }) }
}
