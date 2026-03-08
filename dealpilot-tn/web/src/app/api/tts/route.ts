export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 })
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
    }
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'tts-1', voice: 'nova', input: text }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('OpenAI TTS error:', errText)
      return NextResponse.json({ error: 'TTS failed' }, { status: 502 })
    }
    const audioBuffer = await res.arrayBuffer()
    return new NextResponse(audioBuffer, { headers: { 'Content-Type': 'audio/mpeg' }, })
  } catch (e: any) {
    console.error('TTS route error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
