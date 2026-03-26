import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'transactions'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const transactionId = Number(params.id)
  const documentId = Number(params.docId)
  if (Number.isNaN(transactionId) || Number.isNaN(documentId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: doc, error: docErr } = await supabase
      .from('transaction_documents')
      .select('id, file_url, user_id, transaction_id')
      .eq('id', documentId)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (docErr || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (doc.file_url) {
      await supabase.storage.from(BUCKET).remove([String(doc.file_url)])
    }

    const { error: delErr } = await supabase.from('transaction_documents').delete().eq('id', documentId)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; docId: string } }
) {
  const transactionId = Number(params.id)
  const documentId = Number(params.docId)
  if (Number.isNaN(transactionId) || Number.isNaN(documentId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { clear_address_mismatch?: boolean }
    if (!body.clear_address_mismatch) {
      return NextResponse.json({ error: 'Unsupported patch' }, { status: 400 })
    }

    const { data: doc, error: docErr } = await supabase
      .from('transaction_documents')
      .select('id, deal_impact')
      .eq('id', documentId)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (docErr || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const di =
      doc.deal_impact && typeof doc.deal_impact === 'object' && !Array.isArray(doc.deal_impact)
        ? ({ ...(doc.deal_impact as Record<string, unknown>) } as Record<string, unknown>)
        : {}
    delete di.address_mismatch

    const { data: updated, error: upErr } = await supabase
      .from('transaction_documents')
      .update({
        deal_impact: di,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .select('*')
      .single()

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    return NextResponse.json({ document: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
