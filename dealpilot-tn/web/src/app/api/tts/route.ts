import { NextRequest, NextResponse } from 'next/server'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || ''
const DEFAULT_VOICE_ID = 'cgSgspJ2msm6clMCkdW9' // Jessica - young female
const VOICE_MAP: Record<string, string> = {
  'joyful': 'cgSgspJ2msm6clMCkdW9',
  'straight': '21m00Tcm4TlvDq8ikWAM',
  'calm': 'EXAVITQu4vr4xnSDxMaL',
  'executive': '21m00Tcm4TlvDq8ikWAM',
  'friendly-tn': 'cgSgspJ2msm6clMCkdW9',
}

export async function POST(req: NextRequest) {
  try {
    const { text, style } = await req.json()
    if (!text) return NextResponse.json({ error: 'No text' }, { status: 400 })
    if (!ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: 'No API key configured' }, { status: 500 })
    }
    const voiceId = VOICE_MAP[style || 'friendly-tn'] || DEFAULT_VOICE_ID
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        },
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('ElevenLabs error:', errText)
      return NextResponse.json({ error: 'TTS failed' }, { status: 502 })
    }
    const audioBuffer = await res.arrayBuffer()
    return new NextResponse(audioBuffer, { headers: { 'Content-Type': 'audio/mpeg' }, })
  } catch (e: any) {
    console.error('TTS route error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
