export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request){
  try{
    const body = await req.json()
    const { dealId, recipientRole, emailType } = body
    // Fetch deal context - simple placeholder fetch from internal API
    const dealRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/deals/${dealId}`)
    const deal = dealRes.ok ? await dealRes.json() : {}

    const prompt = `You are an expert real estate assistant. Using this deal context: ${JSON.stringify(deal)} generate a ${emailType} email to the ${recipientRole}. Return JSON: {subject, body, suggestedRecipient}`

    const apiKey = process.env.OPENAI_API_KEY
    if(!apiKey) return NextResponse.json({ error: 'OpenAI key missing' }, { status: 500 })

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.7 })
    })

    const j = await resp.json()
    const reply = j?.choices?.[0]?.message?.content || ''
    let parsed = { subject: 'Update', body: reply, suggestedRecipient: '' }
    try{ parsed = JSON.parse(reply) }catch(e){ parsed.body = reply }

    return NextResponse.json(parsed)
  }catch(err:any){ return NextResponse.json({ error: err.message||String(err) }, { status: 500 }) }
}
