import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request){
  try{
    const token = process.env.GHL_API_KEY || process.env.GHL_TOKEN
    if(!token) return NextResponse.json({ ok:false, error: 'GHL not connected' }, { status: 400 })
    const body = await req.json()
    const { contact_id, channel, recipient, message, subject } = body
    // proxy to GHL messaging endpoint; this is a generic example — adapt to your GHL integration
    const apiUrl = channel === 'email' ? 'https://api.gohighlevel.com/v1/messages/email' : 'https://api.gohighlevel.com/v1/messages/sms'
    const res = await fetch(apiUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ contactId: contact_id, to: recipient, body: message, subject }) })
    const j = await res.json()
    if(!res.ok) return NextResponse.json({ ok:false, error: j || 'GHL send failed' }, { status: 502 })
    return NextResponse.json({ ok:true, provider: 'ghl', status: j.status || 'queued', response: j })
  }catch(e:any){ return NextResponse.json({ ok:false, error: String(e?.message||e) }, { status:500 }) }
}
