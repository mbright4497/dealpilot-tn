import { NextResponse } from 'next/server'
import pdf from 'pdf-parse'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as any
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const data = await pdf(buffer)
    const text = data.text || ''

    // Call OpenAI to extract fields
    const prompt = `You are a Tennessee real estate contract analyzer. Extract these fields from this purchase agreement: buyer_name, seller_name, property_address, purchase_price, binding_date, closing_date, inspection_deadline, appraisal_deadline, financing_deadline, earnest_money, special_stipulations. Return JSON only.\n\nTEXT:\n${text}`

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are a JSON generator.' }, { role: 'user', content: prompt }], temperature: 0 }),
    })

    const j = await resp.json()
    const reply = j?.choices?.[0]?.message?.content || ''

    // Try to parse JSON from reply
    let parsed = null
    try { parsed = JSON.parse(reply) } catch (e) { parsed = { raw: reply } }

    return NextResponse.json({ extracted: parsed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
