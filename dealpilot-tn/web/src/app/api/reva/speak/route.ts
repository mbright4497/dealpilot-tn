import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const text = String(body?.text || '').trim()
    if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const speech = await openai.audio.speech.create({ model: 'tts-1', voice: 'nova', input: text, speed: 1.0 })
    const arrayBuffer = await speech.arrayBuffer()
    return new Response(arrayBuffer, { headers: { 'Content-Type': 'audio/mpeg' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
