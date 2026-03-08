export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseSafe } from '@/lib/supabase'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const channel = url.searchParams.get('channel')
  const supabase = getSupabaseSafe()
  let q = supabase.from('message_templates').select('*')
  if (category) q = q.eq('category', category)
  if (channel) q = q.eq('channel', channel)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, templates: data })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { name, category, channel, subject, body: content, variables, agent_id } = body
  if (!name || !category || !channel || !content) return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  const { data, error } = await supabase.from('message_templates').insert({ name, category, channel, subject, body: content, variables: variables || [], agent_id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, template: data })
}
