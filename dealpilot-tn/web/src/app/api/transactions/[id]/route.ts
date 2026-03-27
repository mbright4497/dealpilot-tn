import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!transaction) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const [documentsRes, txDocsRes] = await Promise.all([
      supabase.from('documents').select('*').eq('transaction_id', id).order('created_at', { ascending: false }),
      supabase
        .from('transaction_documents')
        .select('*')
        .eq('transaction_id', id)
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

    const txDocsWithUrls: Record<string, unknown>[] = []
    if (!txDocsRes.error && txDocsRes.data) {
      for (const d of txDocsRes.data as Record<string, unknown>[]) {
        const path = d.file_url as string | null
        let signed_url: string | null = null
        if (path) {
          const { data: s } = await supabase.storage.from('transactions').createSignedUrl(path, 3600)
          signed_url = s?.signedUrl ?? null
        }
        txDocsWithUrls.push({ ...d, signed_url })
      }
    } else if (txDocsRes.error) {
      console.warn('transaction_documents load:', txDocsRes.error.message)
    }

    return NextResponse.json({
      transaction,
      deadlines: Array.isArray(transaction.ai_deadlines) ? transaction.ai_deadlines : [],
      contacts: Array.isArray(transaction.ai_contacts) ? transaction.ai_contacts : [],
      milestones: [],
      documents: documentsRes.data ?? [],
      transaction_documents: txDocsWithUrls,
    })
  } catch (e: any) {
    console.error('transactions/id error', e)
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('transactions')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ transaction: data })
  } catch (e: any) {
    console.error('DELETE /api/transactions/[id] error', e)
    return NextResponse.json({ error: e.message || 'Delete failed' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const incoming = { ...(body || {}) } as Record<string, unknown>
    const activityEvent = incoming.activity_event as
      | { icon?: string; description?: string; timestamp?: string }
      | undefined
    delete incoming.activity_event
    let existingLog: unknown[] = Array.isArray((body || {}).activity_log)
      ? ((body || {}).activity_log as unknown[])
      : []
    if (!existingLog.length && activityEvent?.description) {
      const { data: row } = await supabase
        .from('transactions')
        .select('activity_log')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      existingLog = Array.isArray(row?.activity_log) ? (row.activity_log as unknown[]) : []
    }
    const nextLog =
      activityEvent && activityEvent.description
        ? [
            ...existingLog,
            {
              icon: activityEvent.icon || '•',
              description: activityEvent.description,
              timestamp: activityEvent.timestamp || new Date().toISOString(),
            },
          ]
        : existingLog
    const update = { ...incoming, ...(activityEvent ? { activity_log: nextLog } : {}), updated_at: new Date().toISOString() }
    delete (update as Record<string, unknown>).id
    delete (update as Record<string, unknown>).user_id

    const { data, error } = await supabase
      .from('transactions')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ transaction: data })
  } catch (e: any) {
    console.error('PATCH /api/transactions/[id] error', e)
    return NextResponse.json({ error: e.message || 'Update failed' }, { status: 500 })
  }
}
