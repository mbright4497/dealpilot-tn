import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

// GET: fetch communications, optionally filtered by transaction_id
export async function GET(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const txId = searchParams.get('transaction_id')
    const statusFilter = searchParams.get('status')

    let query: any = supabase
      .from('deal_communications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (txId) query = query.eq('transaction_id', parseInt(txId))
    if (statusFilter) query = query.eq('status', statusFilter)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ communications: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

// POST: create a new communication (draft or send)
export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { transaction_id, channel, direction, recipient_name, recipient_contact, recipient_role, subject, body: msgBody, ai_generated, template_key, status } = body as any

    if (!transaction_id || !channel) {
      return NextResponse.json({ error: 'transaction_id and channel required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('deal_communications')
      .insert({
        user_id: user.id,
        transaction_id,
        channel: channel || 'email',
        direction: direction || 'outbound',
        status: status || 'draft',
        recipient_name: recipient_name || null,
        recipient_contact: recipient_contact || null,
        recipient_role: recipient_role || null,
        subject: subject || null,
        body: msgBody || null,
        ai_generated: ai_generated || false,
        template_key: template_key || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, communication: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

// PATCH: update communication status (approve, mark sent, etc)
export async function PATCH(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { id, status: newStatus, sent_at } = body as any
    if (!id || !newStatus) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

    const updates: any = { status: newStatus, updated_at: new Date().toISOString() }
    if (sent_at) updates.sent_at = sent_at
    if (newStatus === 'sent') updates.sent_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('deal_communications')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, communication: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
