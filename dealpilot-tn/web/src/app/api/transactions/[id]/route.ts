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

    const [deadlinesRes, contactsRes, milestonesRes, documentsRes, txDocsRes] = await Promise.all([
      supabase
        .from('deadlines')
        .select('*')
        .or(`transaction_id.eq.${id},deal_id.eq.${id}`)
        .order('due_date', { ascending: true }),
      supabase.from('contacts').select('*').eq('transaction_id', id),
      supabase.from('deal_milestones').select('*').eq('transaction_id', id),
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
      deadlines: deadlinesRes.data ?? [],
      contacts: contactsRes.data ?? [],
      milestones: milestonesRes.data ?? [],
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
    const update = { ...(body || {}), updated_at: new Date().toISOString() }
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
