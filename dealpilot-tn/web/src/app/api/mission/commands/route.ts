export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

export async function GET() {
  try {
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)
    const { data, error } = await sb.from('mission_commands').select('*').order('created_at', { ascending: false }).limit(50)
    if (error) throw error
    return NextResponse.json({ commands: data || [] })
  } catch (e: any) {
    console.error('mission/commands GET error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { agent_id, command } = body as any
    if (!agent_id || !command) return NextResponse.json({ error: 'agent_id and command required' }, { status: 400 })
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)
    const { data, error } = await sb.from('mission_commands').insert([{
      agent_id,
      command,
      status: 'pending'
    }]).select()
    if (error) throw error
    return NextResponse.json({ ok: true, command: data?.[0] }, { status: 201 })
  } catch (e: any) {
    console.error('mission/commands POST error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { id, status, result } = body as any
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)
    const updates: any = {}
    if (status) updates.status = status
    if (result !== undefined) updates.result = result
    if (status === 'completed' || status === 'failed') updates.completed_at = new Date().toISOString()
    const { data, error } = await sb.from('mission_commands').update(updates).eq('id', Number(id)).select()
    if (error) throw error
    return NextResponse.json({ ok: true, command: data?.[0] })
  } catch (e: any) {
    console.error('mission/commands PATCH error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}
