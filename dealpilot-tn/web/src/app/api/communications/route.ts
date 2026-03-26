export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const dealId = searchParams.get('deal_id')
    let query = supabase.from('communications').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (dealId) query = query.eq('deal_id', dealId)
    const { data, error } = await query

    if (error) throw error
    return NextResponse.json({ communications: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await req.json().catch(() => ({}))
    const { deal_id, comm_type, direction, recipient, subject, body, status, ai_generated, metadata } = payload as any
    if (!deal_id || !comm_type) return NextResponse.json({ error: 'deal_id and comm_type required' }, { status: 400 })

    const { data, error } = await supabase
      .from('deal_communications')
      .insert({
        deal_id,
        user_id: user.id,
        comm_type,
        direction: direction || 'outbound',
        recipient: recipient || null,
        subject: subject || null,
        body: body || null,
        status: status || 'draft',
        ai_generated: ai_generated || false,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, communication: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
