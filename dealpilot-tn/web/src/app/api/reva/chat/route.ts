import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const msgs = Array.isArray(body?.messages) ? body.messages : []
    const instruction = {
      role: 'user',
      content:
        'When you draft a communication (email or SMS), always end your response with a JSON block exactly like: REVA_ACTION:{"type":"send_communication","commType":"email","contactRole":"lender","subject":"[subject]","message":"[full message text]"} . Only include this for complete ready-to-send drafts.',
    }
    const origin = new URL(req.url).origin
    const proxied = await fetch(`${origin}/api/eva/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: req.headers.get('cookie') || '' },
      body: JSON.stringify({ ...body, messages: [...msgs, instruction] }),
    })
    const json = await proxied.json().catch(() => ({}))
    return NextResponse.json(json, { status: proxied.status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
