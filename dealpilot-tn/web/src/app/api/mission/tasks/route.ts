export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

export async function GET() {
  try {
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)
    const { data, error } = await sb.from('mission_tasks').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ tasks: data || [] })
  } catch (e: any) {
    console.error('mission/tasks GET error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { title, description, column_name, assigned_agent, priority } = body as any
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)
    const { data, error } = await sb.from('mission_tasks').insert([{
      title,
      description: description || '',
      column_name: column_name || 'Backlog',
      assigned_agent: assigned_agent || null,
      priority: priority || 'medium'
    }]).select()
    if (error) throw error
    return NextResponse.json({ ok: true, task: data?.[0] }, { status: 201 })
  } catch (e: any) {
    console.error('mission/tasks POST error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { id, ...updates } = body as any
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)
    updates.updated_at = new Date().toISOString()
    const { data, error } = await sb.from('mission_tasks').update(updates).eq('id', Number(id)).select()
    if (error) throw error
    return NextResponse.json({ ok: true, task: data?.[0] })
  } catch (e: any) {
    console.error('mission/tasks PATCH error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const sb = createClient(SUPABASE_URL!, SUPABASE_KEY!)
    const { error } = await sb.from('mission_tasks').delete().eq('id', Number(id))
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('mission/tasks DELETE error', e)
    return NextResponse.json({ error: String(e?.message) }, { status: 500 })
  }
}
