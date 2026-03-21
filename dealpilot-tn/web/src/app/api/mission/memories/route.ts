export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

export async function GET() {
  try {
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)
    const { data, error } = await sb.from('mission_memories').select('*').order('date', { ascending: false })
    if (error) throw error
    return NextResponse.json({ memories: data || [] })
  } catch (e: any) {
    console.error('mission/memories GET error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { text, date, tags } = body as any
    if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)
    const { data, error } = await sb.from('mission_memories').insert([{
      text,
      date: date || new Date().toISOString().split('T')[0],
      tags: tags || []
    }]).select()
    if (error) throw error
    return NextResponse.json({ ok: true, memory: data?.[0] }, { status: 201 })
  } catch (e: any) {
    console.error('mission/memories POST error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)
    const { error } = await sb.from('mission_memories').delete().eq('id', Number(id))
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('mission/memories DELETE error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}
