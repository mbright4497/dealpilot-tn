import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || ''
    if (!HEYGEN_API_KEY) return NextResponse.json({ error: 'HEYGEN_API_KEY not configured' }, { status: 500 })
    const body = await req.json().catch(() => ({}))
    const avatar_id = body?.avatar_id || 'Ann_Therapist_public'
    const quality = body?.quality || 'low'
    const payload = {
      avatar_id,
      quality,
      version: body?.version || 'v2',
      video_encoding: body?.video_encoding || 'H264',
      source: body?.source || 'sdk',
      language: body?.language || 'en',
    }
    const res = await fetch('https://api.heygen.com/v1/streaming.new', {
      method: 'POST',
      headers: {
        'x-api-key': HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    })
    const text = await res.text()
    return new NextResponse(text, { status: res.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
