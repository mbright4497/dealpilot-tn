import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOptionalServiceSupabase } from '@/lib/supabase/serviceRole'
import { runDocumentExtraction } from '@/lib/reva/runDocumentExtraction'
import type { AddressMismatchPayload } from '@/lib/reva/addressMismatch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_req: Request, { params }: { params: { id: string; docId: string } }) {
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

    const { data: doc, error } = await supabase
      .from('transaction_documents')
      .select('*')
      .eq('id', documentId)
      .eq('transaction_id', transactionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error || !doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const svc = getOptionalServiceSupabase()
    await runDocumentExtraction(svc || supabase, documentId)

    const { data: updated } = await supabase
      .from('transaction_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    let address_mismatch: AddressMismatchPayload | undefined
    const di = updated?.deal_impact as { address_mismatch?: AddressMismatchPayload } | null
    if (di?.address_mismatch?.mismatch === true) {
      address_mismatch = di.address_mismatch
    }

    return NextResponse.json({ document: updated, ...(address_mismatch ? { address_mismatch } : {}) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}
