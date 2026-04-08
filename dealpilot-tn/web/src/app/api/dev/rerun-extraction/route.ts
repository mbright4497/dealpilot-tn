import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { runDocumentExtraction } from '@/lib/reva/runDocumentExtraction'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const docId = body?.docId as number | undefined
  if (!docId) return NextResponse.json({ error: 'docId required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    await runDocumentExtraction(supabase, docId)
    
    // Return what got written to the transaction
    const { data: doc } = await supabase
      .from('transaction_documents')
      .select('transaction_id, status, extracted_data, deal_impact')
      .eq('id', docId)
      .single()

    const { data: tx } = await supabase
      .from('transactions')
      .select('client, seller_name, purchase_price, closing_date, binding_date, earnest_money, earnest_money_holder, inspection_period_days, loan_type, county, address')
      .eq('id', doc?.transaction_id)
      .single()

    return NextResponse.json({ ok: true, docId, doc_status: doc?.status, transaction: tx })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
