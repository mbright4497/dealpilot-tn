export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

// This helper always locks the voice to 'nova'. Do NOT allow dynamic voice selection from query or request body.
async function callOpenAITTS(text:string){
  return fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'tts-1', voice: 'nova', input: text }),
  })
}

export async function GET(req: NextRequest){
  try{
    const text = String(req.nextUrl.searchParams.get('text') || '')
    if(!text) return NextResponse.json({ error: 'No text' }, { status:400 })
    if(!OPENAI_API_KEY) return NextResponse.json({ error: 'No API key configured' }, { status:500 })
    const aiRes = await callOpenAITTS(text)
    if(!aiRes.ok){ const t = await aiRes.text(); console.error('OpenAI TTS error:', t); return NextResponse.json({ error: 'TTS failed' }, { status:502 }) }
    // stream the response body directly
    const stream = aiRes.body
    return new NextResponse(stream, { headers: { 'Content-Type': 'audio/mpeg' } })
  }catch(e:any){ console.error('TTS GET error', e); return NextResponse.json({ error: String(e?.message||e) }, { status:500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 })
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
    }
    const aiRes = await callOpenAITTS(text)
    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('OpenAI TTS error:', errText)
      return NextResponse.json({ error: 'TTS failed' }, { status: 502 })
    }
    const stream = aiRes.body
    return new NextResponse(stream, { headers: { 'Content-Type': 'audio/mpeg' }, })
  } catch (e: any) {
    console.error('TTS route error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
